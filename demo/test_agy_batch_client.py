import importlib.util
import json
from pathlib import Path
import unittest
import tempfile
import sqlite3
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('agy_client', Path(__file__).with_name('agy-batch-client.py'))
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class AgyClientTests(unittest.TestCase):
    def test_remaining_small_batch_requires_real_503_in_same_cycle(self):
        with tempfile.TemporaryDirectory() as folder:
            db_path=Path(folder)/'community.sqlite'
            attempt='11111111-1111-4111-8111-111111111111'
            ids=['remaining-post']
            cycle='22222222-2222-4222-8222-222222222222'
            with sqlite3.connect(db_path) as db:
                db.execute('CREATE TABLE runs(id TEXT,kind TEXT,status TEXT,details TEXT)')
                db.execute('INSERT INTO runs VALUES(?,?,?,?)',(attempt,'gemini-batch','failed',json.dumps({'provider':'gemini','httpStatus':503,'cycleId':cycle})))
            db.close()
            batch_dir=Path(folder)/'rewrite-cycles';batch_dir.mkdir()
            (batch_dir/(cycle+'.json')).write_text(json.dumps({'sourceIds':ids,'commentKeys':[],'provider':'agy','status':'running','freeAttemptId':attempt}))
            with patch.dict(client.os.environ,{'PHONE_DEMO_DB':str(db_path)}):
                client.check_eligibility({'sourceIds':ids,'freeAttemptId':attempt,'cycleId':cycle})
                with self.assertRaisesRegex(ValueError,'different cycle'):
                    client.check_eligibility({'sourceIds':['other'],'freeAttemptId':attempt,'cycleId':cycle})
                with sqlite3.connect(db_path) as db:
                    db.execute('UPDATE runs SET details=?',(json.dumps({'provider':'gemini','httpStatus':429,'cycleId':cycle}),))
                db.close()
                with self.assertRaisesRegex(ValueError,'No free API 503'):
                    client.check_eligibility({'sourceIds':ids,'freeAttemptId':attempt,'cycleId':cycle})

    def test_small_or_unproven_batches_never_launch_agy(self):
        for request in [{}, {'sourceIds': ['same'] * 100}, {'sourceIds': [str(i) for i in range(99)]}, {'sourceIds': [str(i) for i in range(100)]}]:
            with patch.object(client.subprocess, 'Popen') as launch:
                with self.assertRaises(ValueError):
                    client.run('test prompt', request)
                launch.assert_not_called()

    def test_final_json_and_optional_fence(self):
        for response in ['{"entries":[],"commentUpdates":[]}', '```json\n{"entries":[]}\n```']:
            result = client.parse_response({'status': 'SUCCESS', 'response': response, 'usage': {'total_tokens': 0}})
            self.assertEqual(result['value']['entries'], [])
            self.assertEqual(result['transport'], 'antigravity-cli-isolated')

    def test_empty_success_is_not_a_successful_rewrite(self):
        for wrapper in [{'status': 'SUCCESS', 'response': ''}, {'status': 'ERROR', 'response': '{}'},
                        {'status': 'SUCCESS', 'response': 'not json'}, {'status': 'SUCCESS', 'response': '{}'}]:
            with self.assertRaises(ValueError):
                client.parse_response(wrapper)


if __name__ == '__main__':
    unittest.main()
