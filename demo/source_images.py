"""Collect popular-post inline images on Contabo; preserve source URLs and hashes."""
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import socket
import sqlite3
from contextlib import closing
from urllib.parse import urljoin,urlsplit
from bs4 import BeautifulSoup

DOMAINS=('ppomppu.co.kr','dcinside.com','ruliweb.com','fmkorea.com')

def image_urls(html,url,views):
    if views is None or views<2000:return []
    soup=BeautifulSoup(html,'html.parser')
    body=soup.select_one('.rd_body .xe_content, .board-contents, td.han, .write_div, .view_content, .article_view')
    if body is None:return []
    result=[]
    for img in body.select('img'):
        candidate=urljoin(url,img.get('data-original') or img.get('data-src') or img.get('src') or '')
        if candidate not in result and candidate!=url:result.append(candidate)
    return result

def permitted(url):
    u=urlsplit(url)
    return (u.scheme in ('http','https') and not u.username and not u.password and u.port in (None,80,443)
      and any(u.hostname==d or (u.hostname or '').endswith('.'+d) for d in DOMAINS)
      and not any(k in u.query.lower() for k in ('token=','auth=','key=','signature=')))

def extension(data):
    if data.startswith(b'\xff\xd8\xff'):return 'jpg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):return 'png'
    if data.startswith((b'GIF87a',b'GIF89a')):return 'gif'
    if data.startswith(b'RIFF') and data[8:12]==b'WEBP':return 'webp'
    raise ValueError('Not a supported raster image')

def collect_images(reader,html,item,source):
    urls=image_urls(html,item['url'],item.get('view_count'))
    if not urls or not os.environ.get('PHONE_DEMO_DB'):return []
    root=Path(os.environ['PHONE_DEMO_DB']).parent/'source-images';root.mkdir(mode=0o700,exist_ok=True)
    records=[]
    with closing(sqlite3.connect(os.environ['PHONE_DEMO_DB'],timeout=15)) as db:
        db.execute('CREATE TABLE IF NOT EXISTS source_image_assets(url TEXT PRIMARY KEY,sha256 TEXT,path TEXT,bytes INTEGER,mime TEXT,collected_at TEXT DEFAULT CURRENT_TIMESTAMP)')
        for url in urls:
            record={'url':url}
            try:
                if not permitted(url):raise ValueError('Image host/type requires explicit source adapter')
                cached=db.execute('SELECT sha256,path,bytes,mime FROM source_image_assets WHERE url=?',(url,)).fetchone()
                if cached and Path(cached[1]).is_file():
                    records.append({**record,**dict(zip(('sha256','path','bytes','mime'),cached)),'status':'cached'});continue
                addresses=socket.getaddrinfo(urlsplit(url).hostname,None)
                if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):raise ValueError('Non-public image destination')
                response=reader.request('GET',url,source,'image',headers={'Referer':item['url']},timeout=20,allow_redirects=False,max_bytes=10*1024*1024)
                if response.status_code!=200:raise ValueError('Image HTTP '+str(response.status_code))
                mime=response.headers.get('Content-Type','').split(';')[0]
                if mime not in ('image/jpeg','image/png','image/gif','image/webp'):raise ValueError('Not an image MIME type')
                data=response.content;ext=extension(data);digest=hashlib.sha256(data).hexdigest();path=root/(digest+'.'+ext)
                if not path.exists():
                    with path.open('xb') as stream:stream.write(data)
                    path.chmod(0o600)
                db.execute('INSERT OR REPLACE INTO source_image_assets(url,sha256,path,bytes,mime) VALUES(?,?,?,?,?)',(url,digest,str(path),len(data),mime));db.commit()
                record.update(status='saved',sha256=digest,path=str(path),bytes=len(data),mime=mime)
            except Exception as error:
                record.update(status='failed',error=str(error) if isinstance(error,ValueError) else type(error).__name__)
                if any('HTTP '+str(status) in record['error'] for status in (403,429,430)):
                    item['images_error']=record['error'];records.append(record);break
            records.append(record)
    return records
