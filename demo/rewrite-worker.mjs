import {readFileSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {runRewriteCycle} from './rewrite-cycle.mjs'
import {setting,setSetting} from '../src/lib/demo/runtime.mjs'
import {availability} from './api-recovery-policy.mjs'

// Each timer tick makes at most one inference call. The separate publisher never waits for it.
const credential=process.env.CREDENTIALS_DIRECTORY
if(!process.env.GEMINI_API_KEY&&credential)process.env.GEMINI_API_KEY=readFileSync(join(credential,'gemini'),'utf8').trim()
let active=setting('rewriteWorker',{}),resume=null
if(active.cycleId){
 const saved=JSON.parse(readFileSync(join(dirname(process.env.PHONE_DEMO_DB),'rewrite-cycles',active.cycleId+'.json'),'utf8'))
 if(saved.status==='running')resume=saved.id
 // A disabled AGY budget path must not strand free API work after its cooldown expires.
 if(saved.provider==='agy'&&process.env.PHONE_AGY_ENABLED!=='1'&&availability(setting('rewriteProvider:gemini',null)).status!=='cooldown')resume=null
}
const result=runRewriteCycle(resume,{singleStep:true})
setSetting('rewriteWorker',{at:new Date().toISOString(),cycleId:result.id,...result})
console.log(JSON.stringify(result))
