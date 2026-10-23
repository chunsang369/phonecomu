import {rows,row,execute,setSetting} from '../src/lib/demo/runtime.mjs'
import {fetchPublic} from '../src/lib/demo/collector.mjs'
import {refreshStoredSource} from '../src/lib/demo/source-refresh.mjs'
import {backoff,recordFailure,recordSuccess} from '../src/lib/demo/retry.mjs'

export function recentRefreshTargets(currentBatchId) {
 return rows(`SELECT c.* FROM collected c JOIN collection_batch_items i ON i.source_record_id=c.id
 JOIN sources s ON s.id=c.source_id WHERE s.enabled=1 AND s.permission='rewrite_only' AND i.batch_id IN
 (SELECT id FROM collection_batches WHERE id<>? ORDER BY started_at DESC,id DESC LIMIT 4)
 ORDER BY c.collected_at,c.id`,[currentBatchId])
}
export async function refreshRecentSources(batchId,{fetch=fetchPublic,pause=()=>new Promise(r=>setTimeout(r,7000+Math.floor(Math.random()*3000))),blockedHosts=[]}={}) {
 const targets=recentRefreshTargets(batchId),blocked=new Set(blockedHosts),result={targets:targets.length,checked:0,queuedComments:0,failed:0,deferred:0}
 const save=()=>setSetting('lastSourceRefresh',{batchId,at:new Date().toISOString(),...result})
 save()
 for(const c of targets){
  const source=row('SELECT * FROM sources WHERE id=?',[c.source_id]),host=new URL(source.url).hostname
  if(blocked.has(host)||backoff(source)){result.deferred++;save();continue}
  try{
   await pause()
   const item=await fetch(source.id,c.url,'detail')
   const updated=refreshStoredSource(source,item)
   result.checked++;result.queuedComments+=updated.queued
   if(item.comments_error||item.images_error)throw Object.assign(new Error(item.comments_error||item.images_error),{url:c.url,mode:'detail'})
   recordSuccess(source)
  }catch(e){
   result.failed++
   execute('UPDATE sources SET last_error=? WHERE id=?',[String(e.message).slice(0,500),source.id])
   if(/HTTP (30[12378]|403|429|430|50[234])|timed out|Timeout|수집 프로세스 종료/i.test(e.message)){recordFailure(source,e);blocked.add(host)}
  }
  save()
 }
 return result
}
