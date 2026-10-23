import {row,execute,setSetting,setting} from '../src/lib/demo/runtime.mjs'
import {randomUUID} from 'node:crypto'
import {collectPage,closeReaders} from '../src/lib/demo/collector.mjs'
import {sourceDefinitions} from '../src/lib/demo/sources.mjs'
import {applyRoundPauses} from './collection-pauses.mjs'
import {collectWindow} from './collection-window.mjs'
import {refreshRecentSources} from './refresh-recent.mjs'
if(process.platform==='win32'||process.env.PHONE_COLLECTION_BATCH!=='1')throw new Error('Contabo 정기 수집 전용')
const started=Date.now(),results=[],batchId=randomUUID()
process.env.PHONE_COLLECTION_BATCH_ID=batchId
execute('INSERT INTO collection_batches(id,started_at) VALUES(?,?)',[batchId,new Date(started).toISOString()])
let refresh=null,completed=false
try {
 const enabled=sourceDefinitions.map(def=>row('SELECT * FROM sources WHERE id=?',[def.id])).filter(s=>s?.enabled)
 const {sources,skippedHosts}=applyRoundPauses(enabled,setting,setSetting)
 for(const host of skippedHosts)results.push({host,deferred:'접근 제한 후 지연 재시도 대기 또는 2회차 건너뜀',pause:setting(`collectionPause:${host}`,null)})
 await collectWindow({sources,collect:collectPage,setting,setSetting,deadline:started+25*60000,
  onPage:entry=>{results.push(entry);console.log(JSON.stringify(entry))}})
 const blockedHosts=results.filter(r=>r.blocked||r.deferred).map(r=>r.host||new URL(sources.find(s=>s.id===r.source).url).hostname)
 refresh=await refreshRecentSources(batchId,{blockedHosts})
 console.log(JSON.stringify({stage:'refresh-recent',...refresh}));completed=true
}finally{
 closeReaders()
 const finished=new Date().toISOString()
 execute('UPDATE collection_batches SET finished_at=?,status=? WHERE id=?',[finished,completed?'done':'failed',batchId])
 setSetting('lastCollectionBatch',{batchId,started:new Date(started).toISOString(),finished,results,refresh})
}
// The independent rewrite worker drains pending work; collection never invokes AI.
