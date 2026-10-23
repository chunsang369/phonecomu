"""One Google request per batch; credentials and model code stay off the client PC."""
import json
import os
import re
import sys
import urllib.error
import urllib.request

MODEL = os.environ.get('GEMINI_MODEL', 'gemini-3.8-flash')
if not re.fullmatch(r'gemini-[a-z0-9.-]+', MODEL):
    raise ValueError('Invalid GEMINI_MODEL')
ENDPOINT = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'

class ProviderError(RuntimeError):
    def __init__(self, message, http_status, retry_after=None, quota_scope=None):
        super().__init__(message)
        self.http_status = http_status
        self.retry_after = retry_after
        self.quota_scope = quota_scope

def retry_metadata(body, header=None):
    from email.utils import parsedate_to_datetime
    from datetime import datetime, timezone
    delays=[];scope=None
    if header:
        try:delays.append(float(header))
        except ValueError:
            try:delays.append((parsedate_to_datetime(header)-datetime.now(timezone.utc)).total_seconds())
            except (ValueError,TypeError):pass
    try:details=json.loads(body).get('error',{}).get('details',[])
    except (ValueError,AttributeError):details=[]
    for detail in details:
        if str(detail.get('@type','')).endswith('RetryInfo'):
            try:delays.append(float(str(detail.get('retryDelay','')).removesuffix('s')))
            except ValueError:pass
        for violation in detail.get('violations',[]):
            identifier=(str(violation.get('quotaId',''))+' '+str(violation.get('quotaMetric',''))).lower()
            if 'perday' in identifier or 'per_day' in identifier:scope='day'
            elif scope!='day' and ('perminute' in identifier or 'per_minute' in identifier):scope='minute'
    return (max(0,max(delays)) if delays else None),scope


def error_detail(status, body, secrets):
    try:
        error = json.loads(body).get('error', {})
        message = str(error.get('message', 'No provider message'))
        code = str(error.get('status', error.get('code', status)))
    except (ValueError, AttributeError):
        message, code = 'Non-JSON provider response', str(status)
    for secret in secrets:
        if secret:
            message = message.replace(secret, '[REDACTED]')
    message = re.sub(r'(?i)(?:AIza|AQ\.)[\w.-]+|Bearer\s+\S+', '[REDACTED]', message)
    return f'Google generateContent HTTP {status} ({code}), model={MODEL}: {message[:700]}'


def parse_response(result):
    candidates = result.get('candidates', [])
    if not candidates or candidates[0].get('finishReason') != 'STOP':
        raise ValueError('Incomplete Gemini output: ' + str(candidates[0].get('finishReason') if candidates else 'no candidate'))
    parts = candidates[0].get('content', {}).get('parts', [])
    outputs = [p['text'] for p in parts if 'text' in p and not p.get('thought')]
    if not outputs:
        raise ValueError('Gemini returned no final model output')
    # Tool code runs only in Google's sandbox; never execute generated code on Contabo.
    text=outputs[-1].strip()
    # Accept only a JSON value plus an optional Markdown fence, never repair manuscript text.
    text=re.sub(r'^```(?:json)?\s*','',text)
    value,end=json.JSONDecoder().raw_decode(text)
    if text[end:].strip() not in ('','```'):raise ValueError('Unexpected text after final JSON')
    return {'value': value, 'usage': result.get('usageMetadata'),
            'model': result.get('modelVersion', MODEL), 'transport': 'google-generateContent',
            'codeExecutions': sum('executableCode' in p for p in parts)}


def run(prompt):
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key:
        raise RuntimeError('GEMINI_API_KEY must be injected into this server process; no file credential fallback')
    payload = {'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
               'tools': [{'codeExecution': {}}],
               'generationConfig': {'thinkingConfig': {'thinkingLevel': 'LOW'},
                                    'maxOutputTokens': 32768, 'responseMimeType': 'application/json'}}
    request = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(),
                                    headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            raw = json.loads(json.dumps(json.load(response), ensure_ascii=False).replace(key, '[REDACTED]'))
        try:
            return {**parse_response(raw), 'rawResponse': raw}
        except (ValueError, TypeError, KeyError) as error:
            return {'error': type(error).__name__ + ': local response parsing failed',
                    'failureStage': 'response_parse', 'rawResponse': raw, 'model': MODEL}
    except urllib.error.HTTPError as e:
        body=e.read(16384).decode('utf-8', 'replace')
        delay,scope=retry_metadata(body,e.headers.get('Retry-After'))
        raise ProviderError(error_detail(e.code,body,[key]),e.code,delay,scope) from None
    except (TimeoutError, urllib.error.URLError):
        raise RuntimeError('Google generateContent network/timeout failure; original batch retained, no automatic repeat') from None


if __name__ == '__main__':
    try:
        incoming=json.load(sys.stdin)
        print(json.dumps(parse_response(incoming) if '--parse-saved' in sys.argv else run(incoming['prompt']), ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error': str(e), 'httpStatus': getattr(e, 'http_status', None),
                          'retryAfterSeconds':getattr(e,'retry_after',None),'quotaScope':getattr(e,'quota_scope',None)}, ensure_ascii=False))
        sys.exit(1)
