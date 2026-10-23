import {mkdirSync,writeFileSync,readFileSync,renameSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {rows,row,setSetting} from '../src/lib/demo/runtime.mjs'
import {runRewriteBatch} from './rewrite-batch.mjs'
import {advanceCycle} from './rewrite-cycle-state.mjs'
import {recovery,availability} from './api-recovery-policy.mjs'
import {setting} from '../src/lib/demo/runtime.mjs'

export function runRewriteCycle(resumeId=null,{singleStep=false}={}){
 if(process.platform==='win32')throw new Error('Contabo 재구성 전용')
 if(resumeId&&!/^[0-9a-f-]{36}$/.test(resumeId))throw new Error('Invalid cycle id')
 const folder=join(dirname(process.env.PHONE_DEMO_DB),'rewrite-cycles');mkdirSync(folder,{recursive:true})
 let state=resumeId?JSON.parse(readFileSync(join(folder,resumeId+'.json'),'utf8')):{
  id:randomUUID(),provider:'gemini',status:'running',startedAt:new Date().toISOString(),attempted:[],attemptedComments:[],results:[],
  sourceIds:rows("SELECT c.id FROM collected c JOIN sources s ON s.id=c.source_id WHERE s.enabled=1 AND s.permission='rewrite_only' AND c.published_post_id IS NULL AND NOT EXISTS(SELECT 1 FROM rewrites r WHERE r.source_id=c.id AND r.model IN ('chatgpt-current-session','gemini-batch-reviewed') AND r.status IN ('ready','published'))").map(c=>c.id),
  commentKeys:rows("SELECT source_id,comment_key,source_hash FROM comment_refresh_queue WHERE status='pending'").map(c=>JSON.stringify([c.source_id,c.comment_key,c.source_hash]))}
 const path=join(folder,state.id+'.json')
 const save=()=>{writeFileSync(path+'.tmp',JSON.stringify(state,null,2),{mode:0o600});renameSync(path+'.tmp',path);setSetting('lastRewriteCycle',{id:state.id,status:state.status,provider:state.provider,calls:state.results.length,registered:state.results.reduce((n,r)=>n+(r.registered||0),0)})}
 if(state.status==='running'&&state.inFlight){
  const saved=row('SELECT status,details FROM runs WHERE id=?',[state.inFlight])
  if(saved?.status==='running')state={...state,status:'blocked',error:'Interrupted request; inspect saved output before retrying'}
  else if(saved)state=advanceCycle(state,JSON.parse(saved.details))
  state.inFlight=null
 }
 // A blocked attempt is never silently retried. A running checkpoint can resume.
 save()
 while(state.status==='running'){
  const providerState=availability(setting('rewriteProvider:'+state.provider,null));setSetting('rewriteProvider:'+state.provider,providerState)
  if(providerState.status==='cooldown'||providerState.status==='needs_attention')return {id:state.id,status:'waiting',retryAt:providerState.retryAt,reason:providerState.reason}
  if(state.provider==='agy'&&process.env.PHONE_AGY_ENABLED!=='1')return {id:state.id,status:'waiting',reason:'AGY task weekly budget guard is not connected'}
  state.inFlight=randomUUID();save()
  const result=runRewriteBatch(singleStep?5:1000,{...state,cycleId:state.id,batchId:state.inFlight})
  const cooldown=recovery(result,providerState)
  if(cooldown)setSetting('rewriteProvider:'+state.provider,cooldown)
  else if(result.status==='failed')setSetting('rewriteProvider:'+state.provider,{status:[401,403].includes(result.httpStatus)||/must be injected/.test(result.error||'')?'needs_attention':'cooldown',reason:result.error,retryAt:new Date(Date.now()+15*60000).toISOString()})
  else if(!result.skipped)setSetting('rewriteProvider:'+state.provider,{status:'available',failures:0,lastSuccess:new Date().toISOString()})
  state={...advanceCycle(state,result),inFlight:null};save()
  console.log(JSON.stringify({cycleId:state.id,provider:result.provider,status:result.status||'empty',httpStatus:result.httpStatus,requested:result.requested,registered:result.registered,registeredComments:result.registeredComments}))
  if(singleStep)break
 }
 return {id:state.id,status:state.status,calls:state.results.length,registered:state.results.reduce((n,r)=>n+(r.registered||0),0)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href&&process.argv.includes('--run'))console.log(JSON.stringify(runRewriteCycle(process.env.PHONE_RESUME_CYCLE||null)))
