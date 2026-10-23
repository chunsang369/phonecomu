import { configureDemo } from '../src/lib/demo/ai.mjs'
configureDemo()
const { rows,row,execute,setSetting,setting }=await import('../src/lib/demo/runtime.mjs')
const { collectPage,closeReaders }=await import('../src/lib/demo/collector.mjs')
const { rewriteSource,publishReady }=await import('../src/lib/demo/source-rewriter.mjs')
const { sourceDefinitions }=await import('../src/lib/demo/sources.mjs')
const target=Number(process.argv.find(a=>a.startsWith('--target='))?.split('=')[1]||1000)
if(!Number.isInteger(target)||target<8||target>1000)throw new Error('target must be 8..1000')
const side=Math.max(1,Math.floor(target*0.075)),phone=Math.floor((target-side*4)/2)
const quotas=Object.fromEntries(sourceDefinitions.map(s=>[s.id,s.section==='phone'?phone:side]))
const count=id=>Number(row("SELECT count(*) n FROM collected WHERE source_id=? AND state IN ('ready','published')",[id]).n)
const inflight=new Set(),failures=new Set(),active=new Set(sourceDefinitions.map(s=>s.id))
let stop=false
const started=new Date().toISOString(),progress=()=>{
 const status={started,target,quotas,counts:Object.fromEntries(sourceDefinitions.map(s=>[s.id,count(s.id)])),published:rows("SELECT c.source_id,count(*) n FROM collected c JOIN posts p ON p.id=c.published_post_id WHERE p.status='published' GROUP BY c.source_id"),active:[...active],generating:inflight.size,failed:failures.size,updated:new Date().toISOString()}
 setSetting('corpusProgress',status);return status
}
process.on('SIGINT',()=>{stop=true})
execute("UPDATE posts SET status='fixture' WHERE generator IN ('scenario','ai') AND source_id IS NULL")
execute("UPDATE jobs SET status='held' WHERE status='pending' AND (json_extract(payload,'$.generator')='scenario' OR json_extract(payload,'$.postId') IN (SELECT id FROM posts WHERE status='fixture'))")
setSetting('sourceRules',{phone:['dcinside','ppomppu'],politics:['ruliweb','fmkorea'],anonymous:['ppomppu','fmkorea'],ratioEnforced:false,fmkAnonymousBoard:'love',target})
async function crawl(def) {
 const source=row('SELECT * FROM sources WHERE id=?',[def.id]);let barren=0
 try {
  for(let page=1;page<=100&&!stop;page++) {
   if(count(def.id)>=quotas[def.id])break
   const pending=Number(row("SELECT count(*) n FROM collected WHERE source_id=? AND state='reference'",[def.id]).n)
   if(count(def.id)+pending>=quotas[def.id]+3){await new Promise(r=>setTimeout(r,4000));page--;continue}
   const result=await collectPage(source,page,Math.min(30,quotas[def.id]-count(def.id)+3));console.log(JSON.stringify({stage:'crawl',source:def.id,page,...result}));progress()
   barren=result.new+result.updated===0?barren+1:0
   if(result.deferred||barren>=3||result.failed>0&&row('SELECT last_error FROM sources WHERE id=?',[def.id]).last_error?.match(/HTTP (403|429|430)/))break
  }
 }finally{active.delete(def.id);progress()}
}
async function rewrite() {
 while(!stop) {
  const candidate=rows("SELECT c.id,c.source_id,c.authored_at FROM collected c WHERE c.state='reference' AND c.comments_complete=1 ORDER BY c.authored_at DESC LIMIT 1500").find(c=>!inflight.has(c.id)&&!failures.has(c.id)&&count(c.source_id)+[...inflight].filter(id=>row('SELECT source_id FROM collected WHERE id=?',[id])?.source_id===c.source_id).length<quotas[c.source_id])
  if(!candidate){if(!active.size&&!inflight.size)break;await new Promise(r=>setTimeout(r,1500));continue}
  inflight.add(candidate.id)
  try {const result=await rewriteSource(candidate.id);const published=publishReady();console.log(JSON.stringify({stage:'rewrite',source:candidate.source_id,...result,published}))}
  catch(e){failures.add(candidate.id);execute("UPDATE collected SET state='rewrite_failed' WHERE id=? AND state='reference'",[candidate.id]);console.log(JSON.stringify({stage:'rewrite-error',source:candidate.source_id,error:e.message}))}
  finally{inflight.delete(candidate.id);progress()}
 }
}
console.log(JSON.stringify({stage:'start',...progress()}))
await Promise.all([...sourceDefinitions.map(crawl),...Array.from({length:3},rewrite)])
console.log(JSON.stringify({stage:'finished',...progress()}))

closeReaders()
