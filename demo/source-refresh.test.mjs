import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
process.env.PHONE_DEMO='1'
process.env.PHONE_DEMO_DB=join(mkdtempSync(join(tmpdir(),'phone-refresh-')),'test.sqlite')
const r=await import('../src/lib/demo/runtime.mjs')
const {ingest}=await import('../src/lib/demo/collector.mjs')
const f=await import('../src/lib/demo/source-refresh.mjs')
const {recentRefreshTargets,refreshRecentSources}=await import('./refresh-recent.mjs')
r.execute("INSERT INTO boards(id,slug,name) VALUES(4,'qna','질문')")
const author=randomUUID();r.execute('INSERT INTO profiles(id,username,display_name) VALUES(?,?,?)',[author,'demo','회원'])
const source=r.row("SELECT * FROM sources WHERE id='ppomppu'")
let serial=8000000
function create(published=true,comments=[{source_id:'a',content:'기존 댓글 내용입니다',parentIndex:null}]){
 const no=String(serial++),item={title:'원문 제목 '+no,content:'원래 게시글의 질문을 적어둡니다. 조건은 어떻게 되나요?',external_id:no,url:`https://www.ppomppu.co.kr/zboard/view.php?id=phone&no=${no}`,authored_at:'2026-10-20T00:00:00Z',comments,comment_count:comments.length,comments_complete:true,view_count:100,upvotes:10,downvotes:2}
 ingest(source,item);const c=r.row('SELECT * FROM collected WHERE url=?',[item.url])
 if(published){
  const post=r.insertPost({boardId:4,authorId:author,sourceId:c.id,title:'재구성 제목 '+no,content:'원문 뜻을 유지한 게시글입니다. 구매 조건이 궁금해요.',comments:[],checkNear:false,generator:'ai-rewrite'})
  r.execute('UPDATE posts SET view_count=107,upvotes=13,downvotes=3 WHERE id=?',[post])
  const ids=[];for(const [i,x] of comments.entries())ids.push(r.insertComment(post,author,'재구성한 '+x.content,x.parentIndex===null?null:ids[x.parentIndex],new Date(Date.parse(item.authored_at)+i*1000).toISOString(),'ai-rewrite'))
  r.execute("UPDATE collected SET published_post_id=?,state='published' WHERE id=?",[post,c.id])
  r.execute("INSERT INTO rewrites(source_id,payload,model,created_at,status) VALUES(?,?,'gemini-batch-reviewed',?,'published')",[c.id,'{}',new Date().toISOString()])
 }
 return {c:r.row('SELECT * FROM collected WHERE id=?',[c.id]),item}
}
function approveAll(){
 for(const e of f.prepareCommentUpdates().selected)f.acceptCommentUpdate({...e,content:'다시 쓴 '+e.content})
}
test('only the previous four collection batches qualify; current batch excluded',()=>{
 for(let n=0;n<6;n++){
  const id='batch'+n;r.execute('INSERT INTO collection_batches VALUES(?,?,?,?)',[id,`2026-10-${10+n}T00:00:00Z`,n===5?null:`2026-10-${10+n}T01:00:00Z`,n===5?'running':'done'])
  process.env.PHONE_COLLECTION_BATCH_ID=id;create(false)
 }
 delete process.env.PHONE_COLLECTION_BATCH_ID
 assert.equal(recentRefreshTargets('batch5').length,4)
 assert.deepEqual(r.rows('SELECT DISTINCT batch_id FROM collection_batch_items WHERE source_record_id IN ('+recentRefreshTargets('batch5').map(()=>'?').join(',')+') ORDER BY batch_id',recentRefreshTargets('batch5').map(c=>c.id)).map(x=>x.batch_id),['batch1','batch2','batch3','batch4'])
})
test('metrics update by delta, missing counters preserve values and repeating refresh is idempotent',()=>{
 const {c,item}=create()
 f.refreshStoredSource(source,{...item,view_count:150,upvotes:12,downvotes:null})
 f.refreshStoredSource(source,{...item,view_count:150,upvotes:12,downvotes:null})
 const p=r.row('SELECT * FROM posts WHERE id=?',[c.published_post_id])
 assert.equal(p.view_count,157);assert.equal(p.upvotes,15);assert.equal(p.downvotes,3)
 f.refreshStoredSource(source,{...item,view_count:140,upvotes:11,downvotes:null})
 assert.equal(r.row('SELECT upvotes FROM posts WHERE id=?',[p.id]).upvotes,14)
})
test('new replies and edited comments require rewrite; preserve local comments and reply links',()=>{
 const {c,item}=create();const local=r.insertComment(c.published_post_id,author,'홈페이지 이용자 댓글')
 const next={...item,comments:[{...item.comments[0],content:'기존 댓글을 수정한 내용입니다'},{source_id:'b',content:'추가 댓글 내용입니다',parentIndex:0},{source_id:'c',content:'추가 대댓글입니다',parentIndex:1}],comment_count:3}
 assert.equal(f.refreshStoredSource(source,next).queued,3)
 assert.equal(f.refreshStoredSource(source,next).queued,0)
 assert.equal(r.row('SELECT count(*) n FROM comments WHERE post_id=?',[c.published_post_id]).n,2)
 approveAll();assert.equal(f.applyReadyCommentUpdates(),3);assert.equal(f.applyReadyCommentUpdates(),0)
 assert.equal(r.row('SELECT content FROM comments WHERE id=?',[local]).content,'홈페이지 이용자 댓글')
 const bindings=r.rows('SELECT * FROM source_comment_bindings WHERE source_id=? ORDER BY comment_key',[c.id])
 assert.equal(r.row('SELECT parent_id FROM comments WHERE id=?',[bindings[1].comment_id]).parent_id,bindings[0].comment_id)
 assert.equal(r.row('SELECT parent_id FROM comments WHERE id=?',[bindings[2].comment_id]).parent_id,bindings[1].comment_id)
 assert.equal(f.refreshStoredSource(source,next).queued,0)
 assert.equal(r.row('SELECT count(*) n FROM comments WHERE post_id=?',[c.published_post_id]).n,4)
})
test('partial snapshots retain old comments and only merge new source IDs before initial rewrite',()=>{
 const {c,item}=create(false,[{source_id:'a',content:'원댓글입니다',parentIndex:null},{source_id:'b',content:'이전 대댓글입니다',parentIndex:0}])
 f.refreshStoredSource(source,{...item,comments:[{source_id:'c',content:'새 댓글입니다',parentIndex:null}],comments_complete:false,comment_count:4})
 const saved=JSON.parse(r.row('SELECT comments_json FROM collected WHERE id=?',[c.id]).comments_json)
 assert.deepEqual(saved.map(c=>c.source_id),['a','b','c']);assert.equal(saved[1].parentIndex,0)
})
test('stale model output and changed numbers cannot register; contacts never enter rewrite queue',()=>{
 const {c,item}=create()
 f.refreshStoredSource(source,{...item,comments:[...item.comments,{source_id:'b',content:'30개월 약정인가요',parentIndex:null},{source_id:'x',content:'010-1234-5678로 연락 주세요',parentIndex:null}]})
 const entry=f.prepareCommentUpdates().selected.find(x=>x.sourceId===c.id)
 assert.ok(entry);assert.equal(entry.commentKey,'b')
 assert.throws(()=>f.acceptCommentUpdate({...entry,content:'24개월인가요'}),/numbers/)
 f.refreshStoredSource(source,{...item,comments:[...item.comments,{source_id:'b',content:'36개월 약정인가요',parentIndex:null}]})
 assert.throws(()=>f.acceptCommentUpdate({...entry,content:'약정이 30개월 맞나요'}),/Stale/)
 assert.equal(r.row("SELECT status FROM comment_refresh_queue WHERE source_id=? AND comment_key='x'",[c.id]).status,'excluded')
})
test('access restriction stops same host for this refresh round',async()=>{
 let calls=0
 const result=await refreshRecentSources('batch5',{pause:async()=>{},fetch:async()=>{calls++;throw new Error('HTTP 429')}})
 assert.equal(calls,1);assert.equal(result.failed,1);assert.equal(result.deferred,3)
})
