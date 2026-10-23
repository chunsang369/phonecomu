import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
process.env.PHONE_DEMO='1'
process.env.PHONE_DEMO_DB=join(mkdtempSync(join(tmpdir(),'phone-demo-test-')),'test.sqlite')
const r=await import('../src/lib/demo/runtime.mjs')
const {forbidden}=await import('../src/lib/demo/scenarios.mjs')
const {demoQuotes}=await import('../src/lib/demo/catalog.mjs')
test('5000 unique accounts, relational activity, timestamps and idempotency',()=>{
  const stats=r.seed(new Date('2026-10-22T12:00:00Z'))
  assert.equal(stats.users,5000);assert.equal(stats.posts,5000);assert.equal(stats.comments,20000)
  assert.equal(r.row('SELECT count(DISTINCT display_name) n FROM profiles').n,5000)
  assert.equal(r.row('SELECT count(*) n FROM profiles WHERE is_test<>1').n,0)
  assert.equal(r.row('SELECT count(*) n FROM posts p JOIN profiles a ON a.id=p.author_id WHERE p.created_at<a.created_at').n,0)
  assert.equal(r.row('SELECT count(*) n FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.created_at<p.created_at').n,0)
  assert.equal(r.row('SELECT count(*) n FROM comments c JOIN comments p ON p.id=c.parent_id WHERE c.post_id<>p.post_id OR c.created_at<p.created_at').n,0)
  assert.equal(r.row('SELECT count(*) n FROM posts p WHERE p.comment_count<>(SELECT count(*) FROM comments c WHERE c.post_id=p.id)').n,0)
  assert.deepEqual(r.seed(),stats)
  assert.equal(r.rows('SELECT title,content FROM posts').some(p=>forbidden.test(p.title+p.content)),false)
  assert.equal(r.row('SELECT count(*) n FROM profiles a WHERE NOT EXISTS(SELECT 1 FROM posts p WHERE p.author_id=a.id)').n,0)
})
test('atomic votes, invalid reply rejection, duplicate rejection',()=>{
  const post=r.row('SELECT * FROM posts LIMIT 1'),other=r.row('SELECT id FROM posts WHERE id<>? LIMIT 1',[post.id])
  const user=r.setting('visitor',null),before=post.upvotes
  assert.equal(r.vote(post.id,user,1).upvotes,before+1)
  assert.equal(r.vote(post.id,user,1).upvotes,before)
  const comment=r.row('SELECT id FROM comments WHERE post_id=? LIMIT 1',[other.id])
  assert.throws(()=>r.insertComment(post.id,user,'교차 글 답글 방지 검증',comment.id))
  const item={boardId:4,authorId:user,title:'배터리 설정과 통화 사용 시간에 대한 별도 질문',content:'가상 시연 질문입니다. 화면 밝기와 배터리 절약 설정을 따로 바꾸었을 때 체감 사용 시간을 어떻게 기록하면 좋을지 궁금합니다.'}
  r.insertPost(item);assert.throws(()=>r.insertPost(item),/동일/)
})
test('KST schedules are idempotent and cannot publish future jobs',()=>{
  const before=r.stats().posts
  assert.equal(r.scheduleDay('2030-01-02',12),12)
  assert.equal(r.scheduleDay('2030-01-02',12),0)
  r.publishDue('2029-01-01T00:00:00Z');assert.equal(r.stats().posts,before)
  assert(r.publishDue('2030-01-05T00:00:00Z')>0)
  r.publishDue('2030-01-06T00:00:00Z')
  assert(r.stats().comments>20000)
  assert.equal(r.row("SELECT count(*) n FROM jobs WHERE status='pending'").n,0)
})
test('24 month price totals include retained plan and add-ons',()=>{
  assert.equal(demoQuotes.length,384)
  for(const q of demoQuotes)assert.equal(q.total24,q.devicePaid+q.planPrice*q.holdMonths+q.afterPrice*(24-q.holdMonths)+q.addonMonthly*q.addonMonths)
})
test('collection preserves provenance, deduplicates, and never publishes originals',async()=>{
  const {ingest}=await import('../src/lib/demo/collector.mjs')
  const source=r.row("SELECT * FROM sources WHERE id='dcinside'")
  const before=r.stats().posts
  const item={title:'휴대폰 본인확인 순서를 정리하는 질문',content:'수집기를 시험하기 위한 자체 작성 문장입니다. 번호이동 전에 준비할 확인 항목을 별도로 정리하는 방법에 대한 질문입니다.',authored_at:'2026-10-22T12:00:00+09:00',comments:[],comment_count:0,comments_complete:true,external_id:'123',url:'https://gall.dcinside.com/board/view/?id=cellularphone&no=123'}
  assert.equal(ingest(source,item),'new');assert.equal(ingest(source,item),'duplicate')
  assert.equal(r.stats().posts,before)
  assert.throws(()=>ingest(source,{...item,url:'https://other.example/'}))
  const id=r.row('SELECT id FROM collected WHERE url=?',[item.url]).id
  r.enqueue('post',{title:item.title,content:item.content,boardId:2,authorId:r.setting('visitor'),generator:'scenario',sourceId:id},'2020-01-01T00:00:00Z')
  r.publishDue();assert.equal(r.stats().posts,before)
})
