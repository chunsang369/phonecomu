import { rows,setting,execute,transaction } from '../src/lib/demo/runtime.mjs'
import { sourceDefinition } from '../src/lib/demo/sources.mjs'
import { hostname } from 'node:os'
let input='';for await(const chunk of process.stdin)input+=chunk
const config=JSON.parse(input)
transaction(()=>{
  for(const s of config.sources || []) {
    if(!sourceDefinition(s.id)||![0,1].includes(s.enabled)||!Number.isInteger(s.interval_minutes)||s.interval_minutes<30||s.interval_minutes>1440||!Number.isInteger(s.max_items)||s.max_items<1||s.max_items>10)throw new Error('Invalid source settings')
    execute('UPDATE sources SET enabled=?,interval_minutes=?,max_items=? WHERE id=?',[s.enabled,s.interval_minutes,s.max_items,s.id])
  }
})
console.log(JSON.stringify({hostname:hostname(),heartbeat:setting('collectorHeartbeat',null),sources:rows('SELECT id,last_checked,last_error FROM sources'),items:rows('SELECT * FROM collected ORDER BY collected_at DESC LIMIT 200')}))
