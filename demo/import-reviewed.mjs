// Reviewed in the current ChatGPT conversation; no external inference API is called.
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {row,rows,execute,transaction,validateContent,textHtml,fingerprint} from '../src/lib/demo/runtime.mjs'
import {checkRewriteLength} from '../src/lib/demo/rewrite-length.mjs'
import {sourceDefinition} from '../src/lib/demo/sources.mjs'
import {availableComments,assertSourceContactFree,assertRewritten} from '../src/lib/demo/content-policy.mjs'
import {normalizeCommunityCopy,normalizeCommunityNames} from '../src/lib/demo/community-brand.mjs'
const entries=JSON.parse(readFileSync(0,'utf8').replace(/^\uFEFF/,'')).map(normalizeCommunityCopy)
const model=process.argv.includes('--gemini-batch')?'gemini-batch-reviewed':'chatgpt-current-session'
const checks=entries.map(p=>{
 const c=row('SELECT * FROM collected WHERE id=?',[p.sourceId]);if(!c)throw new Error('Missing source')
 assertSourceContactFree(c)
 const original=availableComments(c),def=sourceDefinition(c.source_id)
 validateContent(p)
 assertRewritten(c,p)
 const numbers=t=>[...new Set((normalizeCommunityNames(t).match(/\d+(?:[.,]\d+)*/g)||[]).map(n=>n.replaceAll(',','')))].sort().join('|')
 if(!Array.isArray(p.comments)||p.comments.length!==original.length)throw new Error('Comment mismatch')
 if(numbers(c.content)!==numbers(p.content)||p.comments.some((v,i)=>numbers(v.content)!==numbers(original[i].content)))throw new Error('원문/댓글 수치 보존 검사 실패')
 if(def.section==='phone'?![1,2,3,4,5].includes(p.boardId):p.boardId!==def.boardId)throw new Error('Board mismatch')
 if(p.comments.length!==original.length||p.comments.some((v,i)=>v.parentIndex!==original[i].parentIndex))throw new Error('Comment mismatch')
 const length=checkRewriteLength(c.content,p.content)
 return {p,c,length}
})
console.log(JSON.stringify(checks.map(x=>({id:x.p.sourceId,...x.length}))))
if(checks.some(x=>!x.length.valid))throw new Error('Length validation failed; nothing saved')
if(process.argv.includes('--check'))process.exit(0)
transaction(()=>{
 execute('CREATE TABLE IF NOT EXISTS rewrite_versions(id TEXT PRIMARY KEY,source_id TEXT,payload TEXT,model TEXT,archived_at TEXT)')
 for(const {p,c,length} of checks){
  const old=row('SELECT * FROM rewrites WHERE source_id=?',[c.id])
  if(old&&!process.argv.includes('--revise'))throw new Error('Existing rewrite is preserved; explicit revision required')
  const at=new Date().toISOString()
  if(old)execute('INSERT INTO rewrite_versions VALUES(?,?,?,?,?)',[randomUUID(),c.id,old.payload,old.model,at])
  const published=!!c.published_post_id&&row("SELECT id FROM posts WHERE id=? AND status='published'",[c.published_post_id])
  execute('INSERT INTO rewrites(source_id,payload,model,created_at,status) VALUES(?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET payload=excluded.payload,model=excluded.model,created_at=excluded.created_at,status=excluded.status',[c.id,JSON.stringify({...p,generator:'ai-rewrite'}),model,at,published?'published':'ready'])
  if(published){
   const comments=rows('SELECT id FROM comments WHERE post_id=? ORDER BY created_at,id',[c.published_post_id])
   if(comments.length!==p.comments.length)throw new Error('Existing reply count changed; manual reconciliation required')
   execute('UPDATE posts SET title=?,content=?,fingerprint=?,updated_at=? WHERE id=?',[p.title,textHtml(p.content),fingerprint(p.title+p.content),at,c.published_post_id])
   comments.forEach((x,i)=>execute('UPDATE comments SET content=? WHERE id=?',[p.comments[i].content,x.id]))
  }
  execute('UPDATE collected SET state=?,target_board=? WHERE id=?',[published?'published':'ready',p.boardId,c.id])
  execute('INSERT INTO runs(id,kind,started_at,finished_at,status,details) VALUES(?,?,?,?,?,?)',[randomUUID(),'rewrite',at,at,'done',JSON.stringify({sourceId:c.id,model,review:model==='gemini-batch-reviewed'?'automated-structure-length-numbers-checked':'meaning-and-comment-correspondence-reviewed',lengthCheck:length})])
 }
})
console.log(JSON.stringify({queued:checks.length}))
