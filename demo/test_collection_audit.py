import os
import tempfile
import unittest
from unittest.mock import patch
import sqlite3
import fetch_audit
import source_images
from pathlib import Path

class Response:
    status_code=403
    content=b'blocked'
    headers={}
class Session:
    def request(self,*args,**kwargs):return Response()

class CollectionTests(unittest.TestCase):
    def test_http_counts_and_actual_intervals_persist_across_requests(self):
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'PHONE_DEMO_DB':folder+'/audit.sqlite','PHONE_COLLECTION_BATCH_ID':'round'}),patch.object(fetch_audit.time,'sleep'):
            fetch_audit.request(Session(),'GET','https://www.fmkorea.com/love?token=secret','fm','list')
            fetch_audit.request(Session(),'POST','https://www.fmkorea.com/123','fm','comments:1')
            with sqlite3.connect(folder+'/audit.sqlite') as db:
                items=db.execute('SELECT host_sequence,status,gap_from_previous_start_ms,gap_from_previous_end_ms,url FROM collection_http_attempts ORDER BY id').fetchall()
            db.close()
            self.assertEqual([x[0] for x in items],[1,2]);self.assertEqual(items[1][1],403)
            self.assertIsNotNone(items[1][2]);self.assertIsNotNone(items[1][3]);self.assertNotIn('secret',items[0][4])
    def test_popular_only_body_images_deduplicate_and_reject_nonpublic_destinations(self):
        html='<img src="/avatar.jpg"><div class="write_div"><img src="https://dcimg1.dcinside.com/a.jpg"><img src="https://dcimg1.dcinside.com/a.jpg"></div>'
        self.assertEqual(source_images.image_urls(html,'https://gall.dcinside.com/1',1999),[])
        self.assertEqual(len(source_images.image_urls(html,'https://gall.dcinside.com/1',2000)),1)
        for url in ['http://127.0.0.1/a','https://fmkorea.com.evil.test/a','https://user:pass@www.fmkorea.com/a','file:///a']:
            self.assertFalse(source_images.permitted(url))
        self.assertTrue(source_images.permitted('https://dcimg1.dcinside.com/a.jpg'))
        with self.assertRaises(ValueError):source_images.extension(b'<html>blocked</html>')
    def test_download_persists_hash_and_reuses_cached_image(self):
        from unittest.mock import Mock
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'PHONE_DEMO_DB':folder+'/images.sqlite'}),patch.object(source_images.socket,'getaddrinfo',return_value=[(0,0,0,'',('8.8.8.8',443))]):
            reader=Mock();reader.request.return_value=Mock(status_code=200,headers={'Content-Type':'image/jpeg'},content=b'\xff\xd8\xffexample')
            html='<div class="write_div"><img src="https://dcimg1.dcinside.com/a.jpg"></div>'
            item={'url':'https://gall.dcinside.com/1','view_count':2000}
            first=source_images.collect_images(reader,html,item,'dcinside')
            second=source_images.collect_images(reader,html,item,'dcinside')
            self.assertTrue(Path(first[0]['path']).exists());self.assertEqual(first[0]['sha256'],second[0]['sha256'])
            self.assertEqual(second[0]['status'],'cached');self.assertEqual(reader.request.call_count,1)

if __name__=='__main__':unittest.main()
