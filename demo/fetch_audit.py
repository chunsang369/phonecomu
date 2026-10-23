"""Persist actual HTTP attempts, including comment/image requests and redirects."""
import os
import sqlite3
import time
from contextlib import closing
from datetime import datetime,timezone
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode

def safe_url(url):
    u=urlsplit(url)
    return urlunsplit((u.scheme,u.hostname or '',u.path,urlencode([(k,v) for k,v in parse_qsl(u.query) if k in {'id','no','page','cate','mid','document_srl'}]),''))

def connect():
    db=sqlite3.connect(os.environ['PHONE_DEMO_DB'],timeout=15)
    db.execute('''CREATE TABLE IF NOT EXISTS collection_http_attempts(
      id INTEGER PRIMARY KEY AUTOINCREMENT,batch_id TEXT,source_id TEXT,host TEXT,method TEXT,url TEXT,phase TEXT,
      started_at TEXT,started_ms INTEGER,finished_at TEXT,duration_ms INTEGER,gap_from_previous_start_ms INTEGER,
      gap_from_previous_end_ms INTEGER,host_sequence INTEGER,status INTEGER,error TEXT,bytes INTEGER,
      retry_after TEXT,transport TEXT DEFAULT 'curl_cffi session')''')
    db.execute('CREATE INDEX IF NOT EXISTS collection_http_host_time ON collection_http_attempts(host,started_ms)')
    return db

def request(session,method,url,source,phase,**kwargs):
    limit=kwargs.pop('max_bytes',None)
    if not os.environ.get('PHONE_DEMO_DB'):
        return session.request(method,url,**kwargs)
    host=urlsplit(url).hostname
    with closing(connect()) as db:
        # All observed host requests, across separate readers and collection rounds.
        previous=db.execute('SELECT started_ms,duration_ms FROM collection_http_attempts WHERE host=? ORDER BY id DESC LIMIT 1',(host,)).fetchone()
        if previous:
            time.sleep(max(0,7-(time.time()*1000-previous[0])/1000))
        start=time.time_ns()//1000000;stamp=datetime.now(timezone.utc).isoformat()
        db.execute('BEGIN IMMEDIATE')
        sequence=db.execute('SELECT count(*) FROM collection_http_attempts WHERE host=? AND batch_id IS ?',(host,os.environ.get('PHONE_COLLECTION_BATCH_ID'))).fetchone()[0]+1
        cursor=db.execute('''INSERT INTO collection_http_attempts(batch_id,source_id,host,method,url,phase,started_at,started_ms,gap_from_previous_start_ms,gap_from_previous_end_ms,host_sequence)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)''',(os.environ.get('PHONE_COLLECTION_BATCH_ID'),source,host,method,safe_url(url),phase,stamp,start,start-previous[0] if previous else None,start-previous[0]-previous[1] if previous and previous[1] is not None else None,sequence))
        attempt=cursor.lastrowid;db.commit()
        response=None;error=None
        try:
            response=session.request(method,url,stream=bool(limit),**kwargs)
            if limit:
                try:
                    chunks=[];size=0
                    for chunk in response.iter_content():
                        size+=len(chunk)
                        if size>limit:raise ValueError('Image exceeds 10 MiB')
                        chunks.append(chunk)
                    response.content=b''.join(chunks)
                finally:response.close()
            return response
        except Exception as exc:
            error=type(exc).__name__
            raise
        finally:
            end=time.time_ns()//1000000
            db.execute('UPDATE collection_http_attempts SET finished_at=?,duration_ms=?,status=?,error=?,bytes=?,retry_after=? WHERE id=?',
              (datetime.now(timezone.utc).isoformat(),end-start,response.status_code if response is not None else None,error,len(response.content) if response is not None else None,response.headers.get('Retry-After') if response is not None else None,attempt));db.commit()
