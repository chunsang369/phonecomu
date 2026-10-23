import unittest
from unittest.mock import Mock
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
spec=spec_from_file_location('parser',Path(__file__).with_name('fetch-public.py'))
parser=module_from_spec(spec);spec.loader.exec_module(parser)
class ParserTests(unittest.TestCase):
    def test_freeboards_are_explicitly_allowed_without_cross_board_fetches(self):
        self.assertTrue(parser.allowed('https://www.fmkorea.com/free','fmkorea-freeboard'))
        self.assertTrue(parser.allowed('https://www.ppomppu.co.kr/zboard/view.php?id=freeboard&no=123','ppomppu-freeboard'))
        self.assertFalse(parser.allowed('https://www.fmkorea.com/politics','fmkorea-freeboard'))
        self.assertFalse(parser.allowed('https://www.ppomppu.co.kr/zboard/view.php?id=phone&no=123','ppomppu-freeboard'))
    def test_saved_metrics_snapshots(self):
        # Archived pages: verify counters without new collection or network calls.
        root=Path(__file__).parent.parent/'.demo'
        for filename,source,expected in [('ppo-detail.html','ppomppu',(255,0,0)),('dc-ok.html','dcinside',(17,0,1)),('ruli-detail.html','ruliweb-politics',(584,14,0)),('fmk-ok.html','fmkorea-politics',(25,14,None))]:
            if not (root/filename).exists():continue
            soup=parser.BeautifulSoup((root/filename).read_text(encoding='utf-8'),'html.parser')
            self.assertEqual(tuple(parser.metrics(soup,source).values()),expected)
    def test_missing_metrics_are_not_fabricated_zero(self):
        self.assertEqual(parser.metrics(parser.BeautifulSoup('<div></div>','html.parser'),'dcinside'),{'view_count':None,'upvotes':None,'downvotes':None})
    def test_redirect_stays_in_approved_board(self):
        reader=parser.Reader()
        reader.session=Mock()
        reader.session.request.side_effect=[Mock(status_code=302,headers={'Location':'/zboard/zboard.php?id=phone&page=2'}),Mock(status_code=200,headers={},content=b'allowed')]
        self.assertEqual(reader.get('https://www.ppomppu.co.kr/zboard/zboard.php?id=phone','ppomppu'),'allowed')
        self.assertEqual(reader.session.request.call_count,2)
    def test_redirect_cannot_follow_login_or_loop(self):
        for target in ['/login.php','https://other.example/','/zboard/zboard.php?id=phone']:
            reader=parser.Reader();reader.session=Mock()
            reader.session.request.return_value=Mock(status_code=302,headers={'Location':target})
            with self.assertRaises(ValueError):reader.get('https://www.ppomppu.co.kr/zboard/zboard.php?id=phone','ppomppu')
            self.assertEqual(reader.session.request.call_count,1)
    def test_ppomppu_current_markup(self):
        data=parser.parse('<div id="topTitle"><h1>휴대폰 선택약정 확인 항목</h1></div><ul class="topTitle-mainbox"><li>등록일 2026-10-22 12:34</li></ul><table><tr><td class="han"><p>기기값과 유지 기간을 별도로 비교하기 위해 상담 전에 확인할 항목을 기록했습니다.</p><script>ignored()</script></td></tr></table><script>var initialCommentData = {"total_comment":0,"comments":[]};</script>','ppomppu','detail','https://www.ppomppu.co.kr/zboard/view.php?id=phone&no=123')
        self.assertEqual(data['authored_at'],'2026-10-22T12:34:00+09:00')
        self.assertNotIn('ignored',data['content'])
    def test_dc_list_skips_notice_and_sorts(self):
        html='<table><tr class="ub-content"><td class="gall_num">공지</td><td class="gall_tit"><a href="/board/view/?id=cellularphone&no=1">공지</a></td></tr><tr class="ub-content"><td class="gall_num">20</td><td class="gall_tit"><a href="/board/view/?id=cellularphone&no=20">휴대폰</a></td></tr></table>'
        result=parser.parse(html,'dcinside','list','https://gall.dcinside.com/board/lists/?id=cellularphone')
        self.assertEqual(len(result['links']),1)
        self.assertTrue(result['links'][0].endswith('no=20'))
    def test_refuses_unapproved_or_missing_content(self):
        self.assertFalse(parser.allowed('http://127.0.0.1/','ppomppu'))
        self.assertFalse(parser.allowed('https://www.ppomppu.co.kr/zboard/view.php?id=freeboard&no=1','ppomppu'))
        with self.assertRaises(ValueError):parser.parse('<h1>차단</h1>','dcinside','detail','https://gall.dcinside.com/board/view/?id=cellularphone&no=1')
if __name__=='__main__':unittest.main()
