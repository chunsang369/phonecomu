import {readFileSync,writeFileSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {spawnSync} from 'node:child_process'
import {rows,row,execute,setSetting,setting} from '../src/lib/demo/runtime.mjs'
import {scheduleReady} from '../src/lib/demo/paced-publication.mjs'
// Re-parse already received responses. Never calls an inference provider.
const folder=join(dirname(process.env.PHONE_DEMO_DB),'rewrite-batches')
for(const run of rows("SELECT id,details FROM runs WHERE kind='gemini-batch' AND status='failed'")){
 const details=JSON.parse(run.details)
 if(details.failureStage!=='response_parse')continue
 const output=JSON.parse(readFileSync(join(folder,run.id+'-output.json'),'utf8'))
 if(!output.rawResponse)continue
 const parsed=spawnSync('/usr/bin/python3',['demo/gemini-batch-client.py','--parse-saved'],{input:JSON.stringify(output.rawResponse),encoding:'utf8',maxBuffer:4*1024*1024})
 if(parsed.status!==0)continue
 const value=JSON.parse(parsed.stdout).value,expected=new Set(details.sourceIds),seen=new Set(),valid=[],failed=[]
 if(!Array.isArray(value?.entries)||value.entries.some(e=>!expected.has(e.sourceId)||seen.has(e.sourceId)||!seen.add(e.sourceId)))continue
 for(const entry of value.entries){
  if(row("SELECT source_id FROM rewrites WHERE source_id=? AND status IN ('ready','published')",[entry.sourceId]))continue
  const check=spawnSync(process.execPath,['demo/import-reviewed.mjs','--check','--gemini-batch'],{input:JSON.stringify([entry]),encoding:'utf8'})
  if(check.status===0)valid.push(entry)
  else{const error=check.stderr.match(/Error: ([^\n]+)/)?.[1]||'Review failed';failed.push({id:entry.sourceId,error});setSetting('rewriteRetry:'+entry.sourceId,{error,validation:check.stdout,batchId:run.id,retryAt:new Date().toISOString()})}
 }
 if(valid.length){const imported=spawnSync(process.execPath,['demo/import-reviewed.mjs','--gemini-batch','--revise'],{input:JSON.stringify(valid),encoding:'utf8'});if(imported.status!==0)throw new Error('Saved response import failed')}
 const recovered={...details,status:'recovered',recoveredAt:new Date().toISOString(),registered:valid.length,failed,scheduled:scheduleReady()}
 writeFileSync(join(folder,run.id+'-recovered.json'),JSON.stringify({entries:valid,report:recovered},null,2),{mode:0o600})
 execute("UPDATE runs SET status='recovered',details=? WHERE id=?",[JSON.stringify(recovered),run.id])
 if(setting('rewriteProvider:gemini',{}).reason===details.error)setSetting('rewriteProvider:gemini',{status:'available_pending',reason:'Saved response parsed locally; no repeated API request'})
 console.log(JSON.stringify({id:run.id,registered:valid.length,failed:failed.length,inferenceCalls:0}))
}
