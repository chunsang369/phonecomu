"""Public-board adapters. Preserve snapshots, partial comments and observed counters."""
import json, sys, re, time
from urllib.parse import urlparse, parse_qs, urljoin
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup, NavigableString, Comment
from curl_cffi import requests
from fetch_audit import request as audited_request
from source_images import collect_images,image_urls
KST=timezone(timedelta(hours=9))
PPO={'ppomppu':'phone','ppomppu-politics':'freeboard','ppomppu-anonymous':'problem','ppomppu-freeboard':'freeboard'}
FMK={'fmkorea-politics':'politics','fmkorea-anonymous':'love','fmkorea-freeboard':'free'}

def allowed(url,source):
 u=urlparse(url);q=parse_qs(u.query)
 if u.scheme!='https': return False
 if source=='ruliweb-politics':return u.hostname=='bbs.ruliweb.com' and bool(re.fullmatch(r'/community/board/300148(?:/read/\d+)?',u.path)) and q.get('cate')==['527']
 if source in PPO: return u.hostname=='www.ppomppu.co.kr' and u.path in ['/zboard/zboard.php','/zboard/view.php'] and q.get('id')==[PPO[source]]
 if source in FMK: return u.hostname=='www.fmkorea.com' and (u.path=='/'+FMK[source] or bool(re.fullmatch(r'/\d+',u.path)) or (u.path=='/index.php' and q.get('mid')==[FMK[source]]))
 return source=='dcinside' and u.hostname=='gall.dcinside.com' and u.path in ['/board/lists/','/board/view/'] and q.get('id')==['cellularphone']

def plain(node):
 if isinstance(node,str):
  if not re.search(r'<[a-zA-Z][^>]*>',node):return re.sub(r'\n{3,}','\n\n',node.replace('\r\n','\n')).strip()
  node=BeautifulSoup(node,'html.parser')
 parts=[]
 def walk(current):
  if isinstance(current,Comment):return
  if isinstance(current,NavigableString):
   parts.append(re.sub(r'\s+',' ',str(current)));return
  if current.name in ('script','style','iframe','form'):return
  if current.name=='br':parts.append('\n');return
  block=current.name in ('p','div','li','tr','h1','h2','h3','h4','blockquote')
  if block and parts and not ''.join(parts).rstrip(' ').endswith('\n'):parts.append('\n')
  for child in current.children:walk(child)
  if block:parts.append('\n')
 walk(node)
 text=re.sub(r' *\n *','\n',''.join(parts))
 return re.sub(r'\n{3,}','\n\n',text).strip()

def number(text):
 m=re.search(r'\d[\d,]*',text);return int(m.group().replace(',','')) if m else 0

def metrics(soup,source):
 def count(selector):
  node=soup.select_one(selector)
  if node is None:return None
  match=re.search(r'\d[\d,]*',node.get_text(' ',strip=True))
  return int(match.group().replace(',','')) if match else None
 def labeled(selector,label):
  node=soup.select_one(selector)
  match=re.search(label+r'\s*([\d,]+)',node.get_text(' ',strip=True)) if node else None
  return int(match.group(1).replace(',','')) if match else None
 if source=='dcinside':
  return {'view_count':count('span.gall_count'),'upvotes':count('.btn_recommend_box .up_num'),'downvotes':count('.btn_recommend_box .down_num')}
 if source in PPO:
  return {'view_count':labeled('.topTitle-mainbox',r'조회수'),'upvotes':count('#vote_list_btn_txt'),'downvotes':count('#vote_anti_list_btn_txt')}
 if source in FMK:
  return {'view_count':labeled('.rd_hd .side.fr',r'조회\s*수'),'upvotes':labeled('.rd_hd .side.fr',r'추천\s*수'),'downvotes':None}
 like=soup.select_one('span.like')
 match=re.search(r'조회\s*([\d,]+)',like.parent.get_text(' ',strip=True)) if like else None
 return {'view_count':int(match.group(1).replace(',','')) if match else None,'upvotes':count('span.like'),'downvotes':count('button.dislike .dislike_value')}

def parse(html,source,mode,url):
 soup=BeautifulSoup(html,'html.parser')
 if mode=='list':
  candidates=[]
  if source=='dcinside':
   for tr in soup.select('tr.ub-content'):
    n=tr.select_one('.gall_num')
    if n and n.get_text(strip=True).isdigit(): candidates.extend(tr.select('.gall_tit a[href]'))
  elif source=='ruliweb-politics':
   candidates=soup.select('tr.table_body:not(.notice) a.subject_link')
  elif source in FMK:
   for tr in soup.select('tr:not(.notice)'):
    a=tr.select_one('td.title a[href]')
    if a: candidates.append(a)
  else:
   for tr in soup.select('tr'):
    a=tr.select_one('a[href*="view.php?id='+PPO[source]+'"]')
    if a and re.search(r'\b\d{4,}\b',tr.get_text(' ',strip=True)) and not re.search(r'^(공지|알림)',tr.get_text(' ',strip=True)): candidates.append(a)
  links=[]
  for a in candidates:
   link=urljoin(url,a.get('href',''));u=urlparse(link);q=parse_qs(u.query)
   if not allowed(link,source):continue
   ext=q.get('no',q.get('document_srl',[u.path.split('/')[-1]]))[0]
   if not ext.isdigit():continue
   canonical='https://bbs.ruliweb.com/community/board/300148/read/'+ext+'?cate=527' if source=='ruliweb-politics' else 'https://www.fmkorea.com/'+ext if source in FMK else ('https://www.ppomppu.co.kr/zboard/view.php?id='+PPO[source]+'&no='+ext if source in PPO else 'https://gall.dcinside.com/board/view/?id=cellularphone&no='+ext)
   if canonical not in links:links.append(canonical)
  if not links:raise ValueError('목록 링크 없음: 차단 또는 마크업 변경')
  links.sort(key=lambda x:int(re.search(r'(\d+)(?:\?cate=527)?$',x).group(1)),reverse=True)
  return {'links':links[:80]}
 if source=='ruliweb-politics':
  data=next((json.loads(n.string) for n in soup.select('script[type="application/ld+json"]') if n.string and 'DiscussionForumPosting' in n.string),None)
  if not data or (len(plain(data.get('articleBody','')))<10 and not image_urls(html,url,metrics(soup,source).get('view_count'))):raise ValueError('루리웹 본문 또는 시각 없음')
  return {'title':plain(data['headline']),'content':plain(data['articleBody']),'authored_at':data['datePublished'],'external_id':urlparse(url).path.split('/')[-1],'url':url,'comments':[],'comment_count':int(data.get('commentCount',0)),'comments_complete':False,**metrics(soup,source)}
 title=soup.select_one('.rd_hd h1' if source in FMK else '#topTitle h1, .view_subject, .title_subject, .subject')
 body=soup.select_one('.rd_body .xe_content' if source in FMK else '.board-contents, td.han, .write_div')
 if not title or not body:raise ValueError('제목/본문 추출 실패')
 if source in PPO:
  for child in title.select('span,em'):child.decompose()
 text=plain(body)
 if len(text)<10 and not image_urls(html,url,metrics(soup,source).get('view_count')):raise ValueError('텍스트 본문 부족 (조회수 2000 미만 이미지 중심 글)')
 if len(text)>12000:raise ValueError('본문 길이 제한 초과')
 date=soup.select_one('.rd_hd .date' if source in FMK else '.gall_date, .view_date, .topTitle-mainbox')
 dt=(date.get('title','') or date.get_text(' ',strip=True)) if date else ''
 m=re.search(r'(20\d{2})[-./](\d{2})[-./](\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?',dt)
 if not m:raise ValueError('원본 작성 시각 확인 불가')
 authored=datetime(*[int(n or 0) for n in m.groups()],tzinfo=KST).isoformat()
 ext=parse_qs(urlparse(url).query).get('no',[urlparse(url).path.strip('/')])[0]
 out={'title':title.get_text(' ',strip=True),'content':text,'authored_at':authored,'external_id':ext,'url':url,'comments':[],'comment_count':0,'comments_complete':False,**metrics(soup,source)}
 if source in PPO:
  m=re.search(r'var\s+initialCommentData\s*=\s*(\{[\s\S]*?\});',html)
  if not m:return out
  data=json.loads(m.group(1));out['comment_count']=int(data['total_comment'])
  def add(items,parent=None):
   for c in items:
    idx=len(out['comments']);memo=plain(c.get('memo',''))
    out['comments'].append({'source_id':str(c['no']),'content':memo,'parentIndex':parent})
    add(c.get('sub_cmt') or [],idx)
  add(data.get('comments') or [])
 elif source in FMK:
  summary=soup.select_one('.rd_hd .side.fr');m=re.search(r'댓글\s*([\d,]+)',summary.get_text(' ',strip=True) if summary else '')
  if not m:return out
  out['comment_count']=int(m.group(1).replace(',',''))
  seen={};last_root=None
  for c in soup.select('.fdb_lst_ul > li[id^="comment_"]'):
   memo=c.select_one('.comment-content .xe_content')
   if not memo:continue
   link=c.select_one('.comment-content a[href*="#comment_"]')
   parent=seen.get(link.get('href','').split('#comment_')[-1]) if link else (last_root if 're' in c.get('class',[]) else None)
   idx=len(out['comments']);seen[c['id'].replace('comment_','')]=idx
   if parent is None:last_root=idx
   out['comments'].append({'source_id':c['id'].replace('comment_',''),'content':plain(memo),'parentIndex':parent})
 out['comments_complete']=len(out['comments'])==out['comment_count'] and all(c['content'] for c in out['comments'])
 return out

class Reader:
 def __init__(self):self.session=requests.Session(impersonate='safari')
 def request(self,method,url,source,phase,**kwargs):
  return audited_request(self.session,method,url,source,phase,**kwargs)
 def get(self,url,source):
  if not allowed(url,source):raise ValueError('허가 대상 밖의 URL')
  referer='https://www.fmkorea.com/'+FMK[source] if source in FMK else 'https://'+urlparse(url).hostname+'/'
  seen=set()
  for attempt in range(5):
   if url in seen:raise ValueError('HTTP 302: redirect loop')
   seen.add(url)
   r=self.request('GET',url,source,getattr(self,'phase','page'),headers={'Referer':referer},timeout=20,allow_redirects=False)
   if r.status_code not in (301,302,303,307,308):break
   target=urljoin(url,r.headers.get('Location',''))
   if not allowed(target,source):raise ValueError('HTTP '+str(r.status_code)+': 허가 게시판 밖 리디렉션; 다음 회차로 보류')
   url=target
  else:raise ValueError('HTTP 302: redirect limit')
  if r.status_code!=200:
   error=ValueError('HTTP '+str(r.status_code));error.retry_after=r.headers.get('Retry-After');raise error
  if len(r.content)>3000000:raise ValueError('문서 크기 제한 초과')
  return r.content.decode('euc-kr' if source in PPO else 'utf8',errors='replace')
 def read(self,url,source,mode):
  self.phase=mode
  html=self.get(url,source);out=parse(html,source,mode,url)
  try:
   if mode=='detail' and source=='dcinside':
    soup=BeautifulSoup(html,'html.parser');token=soup.select_one('#e_s_n_o');comments=[];total=None
    for page in range(1,7):
     data={'id':'cellularphone','no':out['external_id'],'cmt_id':'cellularphone','cmt_no':out['external_id'],'e_s_n_o':token['value'],'comment_page':str(page),'sort':'D','prevCnt':'','_GALLTYPE_':'G','secret_article_key':'','clean':'','nptest':''}
     r=self.request('POST','https://gall.dcinside.com/board/comment/',source,'comments:'+str(page),data=data,headers={'Referer':url,'X-Requested-With':'XMLHttpRequest'},timeout=20,allow_redirects=False)
     if r.status_code!=200:raise ValueError('댓글 HTTP '+str(r.status_code))
     j=r.json();total=int(j['total_cnt']);part=j.get('comments') or []
     comments.extend(c for c in part if c.get('no') not in {x.get('no') for x in comments})
     if len(comments)>=total or not part:break
     time.sleep(1)
    ids={};last_root=None
    for c in comments:
     if c.get('del_yn')=='Y' or str(c.get('is_delete'))=='1':continue
     parent=ids.get(str(c.get('c_no'))) if int(c.get('depth',0)) else None
     if int(c.get('depth',0)) and parent is None:parent=last_root
     idx=len(out['comments']);ids[str(c['no'])]=idx
     if parent is None:last_root=idx
     out['comments'].append({'source_id':str(c['no']),'content':plain(c.get('memo','')),'parentIndex':parent})
    out['comment_count']=total;out['comments_complete']=total==len(out['comments']) and all(c['content'] for c in out['comments'])
   if mode=='detail' and source=='ruliweb-politics':
    seen=set();last_root=None
    for page in range(1,4):
     r=self.request('POST','https://api.ruliweb.com/commentView',source,'comments:'+str(page),data={'page':str(page),'article_id':out['external_id'],'board_id':'300148','type':'default','device':'pc','cmtimg':'0'},headers={'Referer':url,'Origin':'https://bbs.ruliweb.com'},timeout=20,allow_redirects=False)
     if r.status_code!=200:raise ValueError('루리웹 댓글 HTTP '+str(r.status_code))
     j=r.json()
     if not j.get('success'):raise ValueError('루리웹 댓글 응답 실패')
     view=BeautifulSoup(j['view'],'html.parser');out['comment_count']=number(view.select_one('.reply_count').get_text())
     for c in view.select('.comment_view.normal .comment_element[id]'):
      if c['id'] in seen:continue
      seen.add(c['id']);body=c.select_one('.text_wrapper .text')
      if body is None:continue
      parent=last_root if 'child' in c.get('class',[]) else None
      idx=len(out['comments'])
      if parent is None:last_root=idx
      out['comments'].append({'source_id':c['id'],'content':plain(body),'parentIndex':parent})
     pages=view.select_one('#c_mpc')
     if not pages or page>=int(pages.get('value',1)):break
     time.sleep(1)
    out['comments_complete']=out['comment_count']==len(out['comments']) and all(c['content'] for c in out['comments'])
  except Exception as e:
   out['comments_complete']=False;out['comments_error']=str(e)[:180]
  out['collected_at']=datetime.now(timezone.utc).isoformat()
  if mode=='detail' and not out.get('comments_error'):out['images']=collect_images(self,html,out,source)
  return out

if __name__=='__main__':
 reader=Reader()
 def respond(data):
  try: print(json.dumps(reader.read(data['url'],data['source'],data['mode']),ensure_ascii=False),flush=True)
  except Exception as e: print(json.dumps({'error':str(e),'retry_after':getattr(e,'retry_after',None)},ensure_ascii=False),flush=True)
 if '--stream' in sys.argv:
  for line in sys.stdin:
   if line.strip():respond(json.loads(line))
 else:respond(json.load(sys.stdin))
