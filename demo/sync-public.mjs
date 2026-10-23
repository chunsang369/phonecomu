// Runs on Contabo. PostgreSQL is the only public serving database.
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {rows,row,setSetting,setting} from '../src/lib/demo/runtime.mjs'
const literal=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb"
export function syncPublic({runSql=sql=>spawnSync('runuser',['-u','postgres','--','psql','-X','-v','ON_ERROR_STOP=1','-q','-d','phonecommunity'],{input:sql,encoding:'utf8',maxBuffer:1024*1024})}={}){
 if(process.platform==='win32')throw new Error('Run the publisher on Contabo')
 const allProfiles=rows('SELECT id,username,display_name,created_at FROM profiles ORDER BY id')
 const profileHash=createHash('sha256').update(JSON.stringify(allProfiles)).digest('hex')
 const profiles=setting('publicProfilesHash',null)===profileHash?[]:allProfiles
 const synced=setting('publicSyncedIds',[])
 const allPosts=rows("SELECT p.*,b.slug,c.url origin_url,c.source_view_count,c.source_upvotes,c.source_downvotes,c.metrics_collected_at,r.model FROM posts p JOIN boards b ON b.id=p.board_id JOIN collected c ON c.id=p.source_id JOIN rewrites r ON r.source_id=c.id WHERE p.status='published' AND r.model IN ('chatgpt-current-session','gemini-batch-reviewed')")
 const posts=allPosts.filter(p=>!synced.includes(p.id+':'+p.updated_at))
 const comments=posts.flatMap(p=>rows("SELECT * FROM comments WHERE post_id=? AND status='published' ORDER BY created_at,id",[p.id]))
 const pipeline={updated:new Date().toISOString(),collectionSchedule:setting('collectionSchedule',null),lastBatch:setting('lastCollectionBatch',null),lastSourceRefresh:setting('lastSourceRefresh',null),pendingCommentRewrites:Number(row("SELECT count(*) n FROM comment_refresh_queue WHERE status='pending'").n),lastGeminiBatch:setting('lastGeminiBatch',null),nextPublication:setting('nextSourcePublication',null),sources:rows('SELECT source_id,state,count(*) count FROM collected GROUP BY source_id,state'),ready:Number(row("SELECT count(*) n FROM rewrites WHERE model IN ('chatgpt-current-session','gemini-batch-reviewed') AND status='ready'").n),collected:Number(row('SELECT count(*) n FROM collected').n),rewriteMode:'상시 재구성·검수 / 독립 순차 게시',rewriteWorker:setting('rewriteWorker',null),apiAvailability:setting('rewriteProvider:gemini',null),collectionPauses:rows("SELECT key,value FROM settings WHERE key LIKE 'collectionPause:%'").map(x=>({host:x.key.slice(16),...JSON.parse(x.value)})),sourceRules:setting('sourceRules',null)}
 const sql=`BEGIN;
 ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
 CREATE TABLE IF NOT EXISTS community_rewrite_provenance(post_id uuid PRIMARY KEY REFERENCES posts(id),source_url text NOT NULL,source_record_id uuid NOT NULL,model text NOT NULL,published_at timestamptz NOT NULL DEFAULT now());
 ALTER TABLE community_rewrite_provenance ADD COLUMN IF NOT EXISTS source_metrics jsonb;
 CREATE TABLE IF NOT EXISTS community_pipeline_status(id int PRIMARY KEY CHECK(id=1),data jsonb NOT NULL);
 GRANT SELECT ON community_pipeline_status TO phonecommunity_app;
 GRANT SELECT ON community_rewrite_provenance TO phonecommunity_app;
 INSERT INTO community_pipeline_status VALUES(1,${literal(pipeline)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data;
 INSERT INTO boards(slug,name,type,allow_anonymous,description,sort) VALUES('politics','정치·시사','general',false,'정치·시사 이야기',39) ON CONFLICT(slug) DO NOTHING;
 INSERT INTO profiles(id,username,display_name,password_hash,bio,created_at,is_test)
 SELECT id,username,display_name,'disabled-demo-account','',created_at,true FROM jsonb_to_recordset(${literal(profiles)}) AS x(id uuid,username text,display_name text,created_at timestamptz)
 ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name WHERE profiles.is_test=true;
 WITH incoming AS (SELECT * FROM jsonb_to_recordset(${literal(posts)}) AS x(id uuid,slug text,author_id uuid,is_anonymous int,title text,content text,source_id text,created_at timestamptz,updated_at timestamptz,view_count int,upvotes int,downvotes int,source_view_count int,source_upvotes int,source_downvotes int))
 INSERT INTO posts(id,board_id,author_id,is_anonymous,title,content,status,source,source_ref,created_at,updated_at,view_count,upvotes,downvotes)
 SELECT x.id,b.id,x.author_id,x.is_anonymous=1,x.title,x.content,'published','community-rewrite',x.source_id,x.created_at,x.updated_at,x.view_count,x.upvotes,x.downvotes
 FROM incoming x JOIN boards b ON b.slug=x.slug
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,content=excluded.content,updated_at=excluded.updated_at,
 view_count=greatest(0,posts.view_count+coalesce((SELECT source_view_count FROM incoming WHERE id=excluded.id)-coalesce((SELECT (source_metrics->>'views')::int FROM community_rewrite_provenance WHERE post_id=excluded.id),0),0)),
 upvotes=greatest(0,posts.upvotes+coalesce((SELECT source_upvotes FROM incoming WHERE id=excluded.id)-coalesce((SELECT (source_metrics->>'upvotes')::int FROM community_rewrite_provenance WHERE post_id=excluded.id),0),0)),
 downvotes=greatest(0,posts.downvotes+coalesce((SELECT source_downvotes FROM incoming WHERE id=excluded.id)-coalesce((SELECT (source_metrics->>'downvotes')::int FROM community_rewrite_provenance WHERE post_id=excluded.id),0),0))
 WHERE posts.source='community-rewrite';
 INSERT INTO comments(id,post_id,author_id,parent_id,content,created_at,is_anonymous)
 SELECT id,post_id,author_id,parent_id,content,created_at,is_anonymous=1 FROM jsonb_to_recordset(${literal(comments)}) AS x(id uuid,post_id uuid,author_id uuid,parent_id uuid,content text,created_at timestamptz,is_anonymous int) ON CONFLICT(id) DO UPDATE SET content=excluded.content,parent_id=excluded.parent_id WHERE comments.post_id=excluded.post_id;
 UPDATE posts SET comment_count=(SELECT count(*) FROM comments WHERE post_id=posts.id AND status='published') WHERE source='community-rewrite';
 INSERT INTO community_rewrite_provenance(post_id,source_url,source_record_id,model,source_metrics)
 SELECT id,origin_url,source_id,model,jsonb_build_object('views',source_view_count,'upvotes',source_upvotes,'downvotes',source_downvotes,'collectedAt',metrics_collected_at) FROM jsonb_to_recordset(${literal(posts)}) AS x(id uuid,origin_url text,source_id uuid,model text,source_view_count int,source_upvotes int,source_downvotes int,metrics_collected_at text) ON CONFLICT(post_id) DO UPDATE SET source_metrics=excluded.source_metrics;
 UPDATE posts SET content=regexp_replace(content,'<p data-source-provenance="true">.*?</p>','','g') WHERE source='community-rewrite' AND position('data-source-provenance' in content)>0;
 COMMIT;`
 const result=runSql(sql)
 if(result.status!==0)throw new Error(result.stderr.slice(-1000))
 setSetting('publicProfilesHash',profileHash);setSetting('publicSyncedIds',[...new Set([...synced,...posts.map(p=>p.id+':'+p.updated_at)])])
 setSetting('publicPostgresSync',{at:new Date().toISOString(),profiles:allProfiles.length,posts:allPosts.length,comments:Number(row("SELECT count(*) n FROM comments c JOIN posts p ON p.id=c.post_id JOIN rewrites r ON r.source_id=p.source_id WHERE r.model IN ('chatgpt-current-session','gemini-batch-reviewed') AND p.status='published'").n)})
 return {profiles:profiles.length,posts:posts.length,comments:comments.length}
}
if(process.argv.includes('--run'))console.log(JSON.stringify(syncPublic()))
