import {createHash} from 'node:crypto'
import {rows,row,execute,transaction,insertComment} from './runtime.mjs'
import {availableComments,hasContact} from './content-policy.mjs'
import {normalizeCommunityNames} from './community-brand.mjs'

const hash=value=>createHash('sha256').update(value).digest('hex')
export function keyedComments(source) {
 const result=[],occurrences=new Map()
 for(const c of availableComments(source)) {
  const parentKey=c.parentIndex===null?null:result[c.parentIndex].key
  const fallback=hash(JSON.stringify([c.content,parentKey])),occurrence=occurrences.get(fallback)||0
  occurrences.set(fallback,occurrence+1)
  const key=c.source_id!=null?String(c.source_id):`legacy:${fallback}:${occurrence}`
  if(result.some(x=>x.key===key))throw new Error('Duplicate source comment ID')
  result.push({...c,key,parentKey,hash:hash(JSON.stringify([c.content,parentKey]))})
 }
 return result
}

// Incomplete fetches must not delete comments captured on an earlier visit.
export function mergeCommentSnapshots(oldSource,incoming) {
 const merged=keyedComments(oldSource).map(c=>({...c})),index=new Map(merged.map((c,i)=>[c.key,i]))
 for(const c of keyedComments(incoming)) {
  if(index.has(c.key))merged[index.get(c.key)]=c
  else {index.set(c.key,merged.length);merged.push(c)}
 }
 // Reorder by parent dependency when a previously missing parent has appeared.
 const result=[],emitted=new Map(),pending=[...merged]
 while(pending.length){
  const at=pending.findIndex(c=>c.parentKey===null||emitted.has(c.parentKey)||!index.has(c.parentKey))
  if(at<0)throw new Error('Source comment parent cycle')
  const [c]=pending.splice(at,1)
  emitted.set(c.key,result.length)
  result.push({source_id:c.key,content:c.content,parentIndex:c.parentKey===null?null:emitted.get(c.parentKey)??null})
 }
 return result
}

export function bindPublishedComments(sourceId,postId,ids=null) {
 const source=row('SELECT * FROM collected WHERE id=?',[sourceId])
 const original=keyedComments(source)
 const comments=ids||rows("SELECT id FROM comments WHERE post_id=? AND generator='ai-rewrite' ORDER BY created_at,id",[postId]).map(c=>c.id)
 if(comments.length<original.length)throw new Error('Original comment binding count mismatch')
 original.forEach((c,i)=>execute('INSERT OR IGNORE INTO source_comment_bindings VALUES(?,?,?,?)',[sourceId,c.key,comments[i],c.hash]))
}

export function refreshStoredSource(source,item) {
 const current=row('SELECT * FROM collected WHERE source_id=? AND url=?',[source.id,item.url])
 if(!current||String(current.external_id)!==String(item.external_id))throw new Error('Refresh source mismatch')
 const incoming={comments_json:JSON.stringify(item.comments||[])}
 const nextComments=keyedComments(incoming),at=new Date().toISOString()
 const metrics=['view_count','upvotes','downvotes'].map(k=>{
  const value=item[k];if(value!=null&&(!Number.isSafeInteger(value)||value<0))throw new Error('Invalid source metric')
  return value??null
 })
 return transaction(()=>{
  const [views,up,down]=metrics
  if(item.images?.length)execute('UPDATE collected SET images_json=? WHERE id=?',[JSON.stringify(item.images),current.id])
  execute('UPDATE collected SET source_view_count=coalesce(?,source_view_count),source_upvotes=coalesce(?,source_upvotes),source_downvotes=coalesce(?,source_downvotes),metrics_collected_at=? WHERE id=?',[views,up,down,at,current.id])
  if(current.published_post_id){
   bindPublishedComments(current.id,current.published_post_id)
   execute('UPDATE posts SET view_count=max(0,view_count+?),upvotes=max(0,upvotes+?),downvotes=max(0,downvotes+?),updated_at=? WHERE id=?',[
    views===null?0:views-(current.source_view_count??0),up===null?0:up-(current.source_upvotes??0),down===null?0:down-(current.source_downvotes??0),at,current.published_post_id])
  }
  const reviewed=row("SELECT source_id FROM rewrites WHERE source_id=? AND status IN ('ready','published') AND model IN ('chatgpt-current-session','gemini-batch-reviewed')",[current.id])
  if(!reviewed){
   const merged=mergeCommentSnapshots(current,incoming)
   // Contacts are excluded from the rewrite input, as in initial collection.
   if(merged.some(c=>hasContact(c.content)))return {metrics:true,queued:0,excluded:'contact'}
   execute('UPDATE collected SET comments_json=?,comment_count=?,comments_complete=? WHERE id=?',[JSON.stringify(merged),item.comment_count??current.comment_count,Number(!!item.comments_complete&&merged.length===item.comment_count),current.id])
   return {metrics:true,queued:0,merged:merged.length}
  }
  const old=new Map(keyedComments(current).map(c=>[c.key,c.hash]));let queued=0
  for(const c of nextComments){
   const binding=row('SELECT source_hash FROM source_comment_bindings WHERE source_id=? AND comment_key=?',[current.id,c.key])
   const existing=row('SELECT * FROM comment_refresh_queue WHERE source_id=? AND comment_key=?',[current.id,c.key])
   if((binding?.source_hash??old.get(c.key))===c.hash){
    // Cancel an older pending edit if the source reverted before it was applied.
    if(existing&&existing.source_hash!==c.hash)execute("UPDATE comment_refresh_queue SET status='superseded' WHERE source_id=? AND comment_key=?",[current.id,c.key])
    continue
   }
   if(existing?.source_hash===c.hash&&['pending','ready','applied','excluded'].includes(existing.status))continue
   const excluded=hasContact(c.content)
   execute('INSERT INTO comment_refresh_queue(source_id,comment_key,content,parent_key,source_hash,refreshed_at,status) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_id,comment_key) DO UPDATE SET content=excluded.content,parent_key=excluded.parent_key,source_hash=excluded.source_hash,refreshed_at=excluded.refreshed_at,status=excluded.status,rewritten_content=NULL,error=NULL',[current.id,c.key,c.content,c.parentKey,c.hash,at,excluded?'excluded':'pending'])
   if(!excluded)queued++
  }
  return {metrics:true,queued}
 })
}

export function prepareCommentUpdates(budget=12000,include=()=>true) {
 const selected=[];let cost=0
 for(const c of rows("SELECT q.*,c.title FROM comment_refresh_queue q JOIN collected c ON c.id=q.source_id JOIN sources s ON s.id=c.source_id WHERE q.status='pending' AND s.enabled=1 AND s.permission='rewrite_only' ORDER BY q.refreshed_at,q.rowid")){
  if(!include(c))continue
  const tokens=Math.ceil(2*(c.content.length*1.3+150))
  if(cost+tokens>budget)continue
  selected.push({sourceId:c.source_id,commentKey:c.comment_key,sourceHash:c.source_hash,parentKey:c.parent_key,content:c.content,postTitle:c.title});cost+=tokens
 }
 return {selected,cost}
}
export function acceptCommentUpdate(entry) {
 const c=row('SELECT * FROM comment_refresh_queue WHERE source_id=? AND comment_key=?',[entry.sourceId,entry.commentKey])
 if(!c||c.status!=='pending'||c.source_hash!==entry.sourceHash)throw new Error('Stale comment rewrite')
 const text=normalizeCommunityNames(entry.content),numbers=s=>[...new Set(normalizeCommunityNames(s).match(/\d+(?:[.,]\d+)*/g)||[])].sort().join('|')
 if(typeof text!=='string'||!text.trim()||text.length>3000||text!==text.trim()||/[ \t]{3,}|[\u200B-\u200D\uFEFF]|<[^>]+>|https?:\/\//u.test(text)||hasContact(text))throw new Error('Invalid rewritten comment')
 if(numbers(text)!==numbers(c.content))throw new Error('Comment numbers changed')
 const normalize=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}\p{Cf}]/gu,'')
 if(c.content.length>20&&normalize(text)===normalize(c.content))throw new Error('Comment not rewritten')
 if(entry.parentKey!==c.parent_key)throw new Error('Comment parent changed')
 execute("UPDATE comment_refresh_queue SET status='ready',rewritten_content=?,error=NULL WHERE source_id=? AND comment_key=?",[text,entry.sourceId,entry.commentKey])
}
export function applyReadyCommentUpdates() {
 return transaction(()=>{
  let applied=0,progress=true
  while(progress){
   progress=false
   for(const c of rows("SELECT q.*,s.published_post_id,s.authored_at FROM comment_refresh_queue q JOIN collected s ON s.id=q.source_id JOIN rewrites r ON r.source_id=s.id WHERE q.status='ready' AND r.status='published' AND r.model IN ('chatgpt-current-session','gemini-batch-reviewed') AND s.published_post_id IS NOT NULL ORDER BY q.refreshed_at,q.rowid")){
    const parent=c.parent_key===null?null:row('SELECT comment_id FROM source_comment_bindings WHERE source_id=? AND comment_key=?',[c.source_id,c.parent_key])?.comment_id
    if(c.parent_key!==null&&!parent)continue
    let id=row('SELECT comment_id FROM source_comment_bindings WHERE source_id=? AND comment_key=?',[c.source_id,c.comment_key])?.comment_id
    if(id)execute('UPDATE comments SET content=?,parent_id=? WHERE id=? AND post_id=?',[c.rewritten_content,parent,id,c.published_post_id])
    else {
     const count=Number(row('SELECT count(*) n FROM profiles').n)
     const offset=parseInt(hash(c.source_id+c.comment_key).slice(0,7),16)%count
     const author=row('SELECT id FROM profiles ORDER BY username LIMIT 1 OFFSET ?',[offset]).id
     id=insertComment(c.published_post_id,author,c.rewritten_content,parent,c.refreshed_at,'ai-rewrite')
    }
    execute('INSERT INTO source_comment_bindings VALUES(?,?,?,?) ON CONFLICT(source_id,comment_key) DO UPDATE SET source_hash=excluded.source_hash',[c.source_id,c.comment_key,id,c.source_hash])
    execute("UPDATE comment_refresh_queue SET status='applied' WHERE source_id=? AND comment_key=?",[c.source_id,c.comment_key])
    execute('UPDATE posts SET updated_at=? WHERE id=?',[new Date().toISOString(),c.published_post_id])
    applied++;progress=true
   }
  }
  return applied
 })
}
