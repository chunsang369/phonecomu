"""Read-only deployment acceptance snapshot; never exports credentials or post bodies."""
import json, sqlite3, subprocess
from contextlib import closing

with closing(sqlite3.connect('/var/lib/phone-community-demo/community.sqlite')) as db:
    db.row_factory=sqlite3.Row
    sources=[dict(x) for x in db.execute('SELECT id,enabled,last_checked,last_error FROM sources')]
    totals=dict(db.execute("SELECT 'collected',count(*) FROM collected UNION ALL SELECT 'reviewed_published',count(*) FROM rewrites WHERE model IN ('chatgpt-current-session','gemini-batch-reviewed') AND status='published' UNION ALL SELECT 'reviewed_ready',count(*) FROM rewrites WHERE model IN ('chatgpt-current-session','gemini-batch-reviewed') AND status='ready'"))
    http=[dict(x) for x in db.execute('SELECT host,count(*) requests,max(host_sequence) sequence,max(started_at) latest FROM collection_http_attempts GROUP BY host')] if db.execute("SELECT 1 FROM sqlite_master WHERE name='collection_http_attempts'").fetchone() else []
sql="""SELECT json_build_object('administrators',(SELECT json_agg(username) FROM profiles WHERE role='admin'), 'publicAttributionCount',(SELECT count(*) FROM posts WHERE content LIKE '%data-source-provenance%'),'published',(SELECT count(*) FROM community_rewrite_provenance),'testAccounts',(SELECT count(*) FROM profiles WHERE is_test=true),'latest',(SELECT max(published_at) FROM community_rewrite_provenance));"""
pg=subprocess.run(['runuser','-u','postgres','--','psql','-X','-qAt','-d','phonecommunity'],input=sql,text=True,capture_output=True,check=True).stdout
print(json.dumps({'totals':totals,'sources':sources,'http':http,'postgres':json.loads(pg)},ensure_ascii=False,indent=2))
