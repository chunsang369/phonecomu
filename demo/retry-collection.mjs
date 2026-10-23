import {rows,row,setting,setSetting} from '../src/lib/demo/runtime.mjs'
import {fetchPublic,ingest,closeReaders} from '../src/lib/demo/collector.mjs'
import {recordFailure,recordSuccess} from '../src/lib/demo/retry.mjs'
import {isAccessRestriction} from './access-retry-policy.mjs'
process.env.PHONE_COLLECTION_RETRY='1'
try{
 for(const record of rows("SELECT key,value FROM settings WHERE key LIKE 'collectionPause:%'")){
  const state=JSON.parse(record.value)
  if(state.status==='retry_running'&&Date.now()-Date.parse(state.retryStartedAt)>8*60000){setSetting(record.key,{...state,status:'retry_failed',skipRounds:0,error:'Delayed retry interrupted; resume only in next regular round'});continue}
  if(state.status!=='retry_pending'||Date.parse(state.retryAt)>Date.now())continue
  const source=row('SELECT * FROM sources WHERE id=? AND enabled=1',[state.sourceId]);if(!source)continue
  process.env.PHONE_COLLECTION_BATCH_ID=state.batchId||'delayed-retry'
  // Claim before I/O so a restart cannot silently make a second retry.
  setSetting(record.key,{...state,status:'retry_running',retryStartedAt:new Date().toISOString()})
  try{
   const item=await fetchPublic(source.id,state.url,state.mode)
   if(isAccessRestriction(item.comments_error)||isAccessRestriction(item.images_error))throw new Error(item.comments_error||item.images_error)
   if(state.mode==='detail')ingest(source,item)
   setSetting(record.key,{...state,status:'recovered',skipRounds:0,retryFinishedAt:new Date().toISOString()});recordSuccess(source)
  }catch(error){
   error.url=state.url;error.mode=state.mode;recordFailure(source,error)
   if(!isAccessRestriction(error.message))setSetting(record.key,{...state,status:'retry_failed',skipRounds:0,error:error.message})
  }
 }
}finally{closeReaders()}
