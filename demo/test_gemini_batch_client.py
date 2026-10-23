import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from io import BytesIO
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('gemini_client', Path(__file__).with_name('gemini-batch-client.py'))
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class GeminiClientTests(unittest.TestCase):
    def test_saved_json_with_trailing_fence_is_parsed_without_changing_text(self):
        for text in ['{"entries":[]}```','```json\n{"entries":[]}\n```']:
            raw={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':text}]}}]}
            self.assertEqual(client.parse_response(raw)['value'],{'entries':[]})
        with self.assertRaises(ValueError):client.parse_response({'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':'{"entries":[]} unexpected'}]}}]})
    def test_final_output_only_and_no_code_execution_locally(self):
        result = client.parse_response({'modelVersion': 'gemini-test', 'candidates': [{'finishReason': 'STOP', 'content': {'parts': [
            {'text': 'Checking lengths...'},
            {'executableCode': {'code': 'raise Exception("never run locally")'}},
            {'text': '{"entries":[]}'}, {'text': 'private thought', 'thought': True}]}}]})
        self.assertEqual(result['value'], {'entries': []})
        self.assertEqual(result['codeExecutions'], 1)

    def test_incomplete_and_invalid_json_rejected(self):
        for data in [{}, {'candidates': [{'finishReason': 'MAX_TOKENS'}]},
                     {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': 'broken'}]}}]}]:
            with self.assertRaises(ValueError):
                client.parse_response(data)

    def test_provider_error_kept_without_credentials(self):
        error = client.error_detail(503, json.dumps({'error': {'status': 'UNAVAILABLE', 'message': 'high demand token=secret-value AQ.fake-key'}}), ['secret-value'])
        self.assertIn('UNAVAILABLE', error)
        self.assertIn('high demand', error)
        self.assertNotIn('secret-value', error)
        self.assertNotIn('AQ.fake-key', error)
        self.assertIn('Non-JSON', client.error_detail(502, '<html>proxy error</html>', []))

    def test_503_does_not_loop_or_expose_key(self):
        failure = HTTPError(client.ENDPOINT, 503, 'Unavailable', {}, BytesIO(b'{"error":{"status":"UNAVAILABLE","message":"high demand secret-value"}}'))
        with patch.dict(client.os.environ, {'GEMINI_API_KEY': 'secret-value'}), \
             patch.object(client.urllib.request, 'urlopen', side_effect=failure) as request:
            with self.assertRaisesRegex(RuntimeError, 'UNAVAILABLE') as error:
                client.run('existing collected source')
        self.assertEqual(request.call_count, 1)
        self.assertNotIn('secret-value', str(error.exception))
        self.assertEqual(error.exception.http_status,503)
        payload = json.loads(request.call_args.args[0].data)
        self.assertEqual(payload['tools'], [{'codeExecution': {}}])
        self.assertEqual(payload['generationConfig']['responseMimeType'], 'application/json')

    def test_missing_injection_never_reads_existing_key_file_or_calls_google(self):
        with patch.dict(client.os.environ, {}, clear=True), \
             patch('builtins.open', side_effect=AssertionError('Credential file access')), \
             patch.object(client.urllib.request, 'urlopen') as request:
            with self.assertRaisesRegex(RuntimeError, 'must be injected'):
                client.run('source')
            request.assert_not_called()


if __name__ == '__main__':
    unittest.main()
