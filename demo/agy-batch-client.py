"""One text-only AGY turn using the community's isolated, user-authorized login."""
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import sys
import time
from contextlib import closing

HOME = Path('/var/lib/phone-community-demo/agy-home')
MODEL = 'gemini-3.8-flash-low'


def check_eligibility(request):
    source_ids = request.get('sourceIds', [])
    comment_keys = request.get('commentKeys', [])
    if not all(isinstance(items, list) and all(isinstance(i, str) and i for i in items) and len(items)==len(set(items)) for items in (source_ids,comment_keys)) or not (source_ids or comment_keys):
        raise ValueError('AGY requires distinct pending work')
    attempt_id = request.get('freeAttemptId', '')
    import re
    if not isinstance(attempt_id, str) or not re.fullmatch(r'[0-9a-f-]{36}', attempt_id):
        raise ValueError('AGY requires a recorded free API 503 in this cycle')
    cycle_id = request.get('cycleId', '')
    if not isinstance(cycle_id,str) or not re.fullmatch(r'[0-9a-f-]{36}', cycle_id):
        raise ValueError('Invalid cycle id')
    import sqlite3
    db_path = Path(os.environ.get('PHONE_DEMO_DB', '/var/lib/phone-community-demo/community.sqlite'))
    with closing(sqlite3.connect(db_path.resolve().as_uri() + '?mode=ro', uri=True)) as db:
        saved = db.execute("SELECT details FROM runs WHERE id=? AND kind='gemini-batch' AND status IN ('failed','partial')", (attempt_id,)).fetchone()
    details=json.loads(saved[0]) if saved else {}
    if details.get('provider')!='gemini' or details.get('httpStatus')!=503 or details.get('cycleId')!=cycle_id:
        raise ValueError('No free API 503 recorded in this cycle')
    cycle=json.loads((db_path.parent/'rewrite-cycles'/(cycle_id+'.json')).read_text(encoding='utf-8'))
    if cycle.get('provider')!='agy' or cycle.get('status')!='running' or cycle.get('freeAttemptId')!=attempt_id:
        raise ValueError('Cycle has not switched to AGY')
    if not set(source_ids).issubset(cycle['sourceIds']) or not set(comment_keys).issubset(cycle['commentKeys']):
        raise ValueError('Work belongs to a different cycle')


def parse_response(wrapper):
    if str(wrapper.get('status', '')).upper() != 'SUCCESS':
        raise ValueError('AGY did not report a successful final response')
    response = wrapper.get('response')
    if not isinstance(response, str) or not response.strip():
        raise ValueError('AGY returned an empty response; no manuscript generated')
    text = response.strip()
    if text.startswith('```json\n') and text.endswith('```'):
        text = text[8:-3].strip()
    value = json.loads(text)
    if not isinstance(value, dict) or not isinstance(value.get('entries'), list):
        raise ValueError('AGY final JSON has no entries array')
    return {'value': value, 'model': MODEL, 'transport': 'antigravity-cli-isolated',
            'usage': wrapper.get('usage'), 'codeExecutions': 0}


def run(prompt, request=None):
    check_eligibility(request or {})
    env = {**os.environ, 'HOME': str(HOME), 'XDG_CONFIG_HOME': str(HOME / '.config')}
    env.pop('GEMINI_API_KEY', None)
    # Never pass auto-approval flags or share the manuscript bot's HOME/workspace.
    args = ['/root/.local/bin/agy', '--output-format', 'json', '--model', MODEL,
            '--mode', 'plan', '--sandbox', '--disable-slash-commands', '--print-timeout', '5m']
    process = subprocess.Popen(args, cwd=HOME / 'workspace', env=env, stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, start_new_session=True)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    output = b''
    try:
        process.stdin.write(prompt.encode('utf-8'))
        process.stdin.close()
        deadline = time.monotonic() + 305
        while time.monotonic() < deadline:
            for key, _ in selector.select(timeout=1):
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                output += chunk
                if len(output) > 4 * 1024 * 1024:
                    raise ValueError('AGY output size limit exceeded')
                try:
                    wrapper = json.loads(output)
                except (ValueError, UnicodeError):
                    continue
                # The CLI sometimes stays alive after emitting the final JSON.
                return parse_response(wrapper)
            if process.poll() is not None and not selector.get_map():
                break
        raise RuntimeError('AGY timeout/incomplete output; original batch retained, no automatic repeat')
    finally:
        selector.close()
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()


if __name__ == '__main__':
    try:
        request = json.load(sys.stdin)
        print(json.dumps(run(request['prompt'], request), ensure_ascii=False))
    except Exception as exc:
        # Do not echo CLI output, credentials or authorization codes in errors.
        print(json.dumps({'error': str(exc) if isinstance(exc, (ValueError, RuntimeError)) else type(exc).__name__}))
        sys.exit(1)
