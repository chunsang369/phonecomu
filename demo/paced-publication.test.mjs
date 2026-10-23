import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
process.env.PHONE_DEMO='1'
process.env.PHONE_DEMO_DB=join(mkdtempSync(join(tmpdir(),'phone-paced-')),'test.sqlite')
const r=await import('../src/lib/demo/runtime.mjs')
const {publicationGap,publishTick,scheduleReady}=await import('../src/lib/demo/paced-publication.mjs')
const {sourceDefinitions}=await import('../src/lib/demo/sources.mjs')
const {boardDefinitions}=await import('../src/lib/demo/catalog.mjs')
r.transaction(()=>{
 boardDefinitions.forEach(([slug,name],i)=>r.execute('INSERT INTO boards(id,slug,name) VALUES(?,?,?)',[i+1,slug,name]))
 for(let i=0;i<5000;i++)r.execute('INSERT INTO profiles(id,username,display_name) VALUES(?,?,?)',[randomUUID(),'test'+i,'회원'+i])
})
function add(source,board,letter){
 const id=randomUUID(),def=sourceDefinitions.find(s=>s.id===source)
 r.execute('INSERT INTO collected(id,source_id,url,title,content,authored_at,collected_at,fingerprint,state,comments_json,comment_count,comments_complete,target_board,source_family) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,source,'https://example.test/'+id,letter+' 원문','가'.repeat(100),'2020-01-01T00:00:00Z',new Date().toISOString(),id,'ready','[]',0,1,board,def.family])
 r.execute('INSERT INTO rewrites(source_id,payload,model,created_at) VALUES(?,?,?,?)',[id,JSON.stringify({sourceId:id,boardId:board,title:letter+' 검수 제목',content:letter.repeat(129),comments:[],generator:'ai-rewrite'}),'chatgpt-current-session',new Date().toISOString()])
 return id
}
test('scheduled one at a time with actual publication date; original snapshot remains intact',()=>{
 const now=Date.parse('2026-10-22T12:00:00Z')
 add('dcinside',4,'폰');assert.equal(scheduleReady(now,()=>0),1)
 assert.equal(publishTick(now).waiting,true)
 const first=publishTick(now+30000)
 assert.ok(first.postId);assert.equal(r.row('SELECT created_at FROM posts WHERE id=?',[first.postId]).created_at,new Date(now+30000).toISOString())
 assert.equal(r.row('SELECT c.authored_at FROM collected c JOIN posts p ON p.source_id=c.id WHERE p.id=?',[first.postId]).authored_at,'2020-01-01T00:00:00Z')
 add('ruliweb-politics',7,'봄');assert.equal(publishTick(now+1000).waiting,true)
 scheduleReady(now+1000,()=>0)
 assert.ok(publishTick(now+3600000).postId)
 assert.equal(publishTick(now+3600001).waiting,true)
 add('ppomppu-anonymous',6,'별');scheduleReady(now+3600001,()=>0)
 assert.ok(publishTick(now+7200000).postId)
 assert.equal(r.row('SELECT count(*) n FROM posts').n,3)
})
test('KST weekday, weekend, evening and night interval boundaries',()=>{
 for(const [time,min,max] of [['2026-10-23T18:00:00+09:00',30,180],['2026-10-24T01:59:00+09:00',30,180],['2026-10-23T09:00:00+09:00',120,600],['2026-10-24T09:00:00+09:00',30,300],['2026-10-24T02:00:00+09:00',2400,4200]]){
  assert.equal(publicationGap(Date.parse(time),0),min*1000);assert.equal(publicationGap(Date.parse(time),1),max*1000)
 }
})
test('schedule and actual release both cap 02:00-09:00 at nine across restarts',()=>{
 const now=Date.parse('2026-10-24T02:00:00+09:00')
 for(let i=0;i<12;i++)add('ruliweb-politics',7,String.fromCodePoint(0x4e00+i))
 assert.equal(scheduleReady(now,()=>0),12)
 assert.equal(scheduleReady(now,()=>0),0)
 assert.equal(r.row("SELECT count(*) n FROM publication_schedule WHERE due_at>=? AND due_at<?",[new Date(now).toISOString(),new Date(now+7*3600000).toISOString()]).n,9)
 // Simulate overdue records and service restarts: the persisted counter must still cap releases.
 r.execute('UPDATE publication_schedule SET due_at=? WHERE published_at IS NULL',[new Date(now-1000).toISOString()])
 for(let i=0;i<9;i++){
  r.setSetting('nextSourcePublication','1970-01-01');assert.ok(publishTick(now+i*60000).postId)
 }
 r.setSetting('nextSourcePublication','1970-01-01')
 assert.equal(publishTick(now+9*60000).reason,'새벽 게시 최대 9개')
 assert.equal(r.setting('nightPublicationCount').count,9)
 r.setSetting('nextSourcePublication','1970-01-01');assert.ok(publishTick(now+24*3600000).postId)
 assert.equal(r.setting('nightPublicationCount').count,1)
})
test('legacy collection cannot start outside scheduled batch',async()=>{
 r.setSetting('collectionMode','scheduled')
 const {collectPage}=await import('../src/lib/demo/collector.mjs')
 assert.equal((await collectPage(r.row("SELECT * FROM sources WHERE id='dcinside'"))).deferred,'다음 정기 수집 회차')
})
test('partial comments and observed counters survive publication',async()=>{
 const id=add('ppomppu',4,'검'),now=Date.parse('2026-10-28T18:00:00+09:00')
 r.execute('UPDATE collected SET comments_complete=0,comment_count=50,source_view_count=4321,source_upvotes=27,source_downvotes=3 WHERE id=?',[id])
 r.execute("UPDATE rewrites SET model='gemini-batch-reviewed' WHERE source_id=?",[id])
 const {publishOne}=await import('../src/lib/demo/source-rewriter.mjs')
 const post=publishOne(id),saved=r.row('SELECT view_count,upvotes,downvotes,comment_count FROM posts WHERE id=?',[post])
 assert.deepEqual({...saved},{view_count:4321,upvotes:27,downvotes:3,comment_count:0})
})
