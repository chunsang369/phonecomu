import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('comparison',Path(__file__).with_name('compare-gemini-credentials.py'))
client=importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)

class ComparisonTests(unittest.TestCase):
    def test_only_503_is_selected_for_bounded_model_comparison(self):
        rows=[{'credentialId':f'key-{i:02d}','http':code} for i,code in enumerate([429,403,200,503,503,503],1)]
        self.assertEqual(client.model_controls(rows),[4,5])

    def test_keys_travel_only_on_stdin_and_are_redacted_from_output(self):
        with patch.object(client.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='{"message":"test-secret-value"}')) as run:
            result=client.check(['test-secret-value'],1,'gemini-3.8-flash')
        self.assertEqual(result,{'message':'[REDACTED]'})
        self.assertNotIn('test-secret-value',str(run.call_args.args))
        self.assertIn('test-secret-value',run.call_args.kwargs['input'])
        self.assertEqual(run.call_args.kwargs['encoding'],'utf-8')

if __name__=='__main__':unittest.main()
