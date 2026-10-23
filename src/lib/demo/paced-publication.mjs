import {rows,row,setting,setSetting,transaction,execute} from './runtime.mjs'
import {publishOne} from './source-rewriter.mjs'
const localTime=now=>new Date(now+9*3600000)
export function publicationGap(now=Date.now(),random=Math.random()){
 const local=localTime(now),hour=local.getUTCHours(),day=local.getUTCDay()
 const [min,max]=hour>=2&&hour<9?[2400,4200]:hour>=18||hour<2?[30,180]:day>=1&&day<=5?[120,600]:[30,300]
 return Math.round(min+(max-min)*random)*1000
}
function night(now){
 const local=localTime(now),date=local.toISOString().slice(0,10),hour=local.getUTCHours()
 return {date,active:hour>=2&&hour<9,end:Date.parse(date+'T09:00:00+09:00')}
}
function followingTime(now,random=Math.random()){
 const n=night(now),next=now+publicationGap(now,random)
 if(n.active&&next>n.end)return n.end+publicationGap(n.end,random)
 const evening=Date.parse(n.date+'T18:00:00+09:00'),hour=localTime(now).getUTCHours()
 return hour>=9&&hour<18&&next>evening?evening+publicationGap(evening,random):next
}
export function scheduleReady(now=Date.now(),random=Math.random){
 return transaction(()=>{
  execute('CREATE TABLE IF NOT EXISTS publication_schedule(source_id TEXT PRIMARY KEY,due_at TEXT NOT NULL,published_at TEXT)')
  const ready=rows("SELECT r.source_id FROM rewrites r LEFT JOIN publication_schedule p ON p.source_id=r.source_id WHERE r.status='ready' AND r.model IN ('chatgpt-current-session','gemini-batch-reviewed') AND p.source_id IS NULL ORDER BY r.created_at,r.source_id")
  if(!ready.length)return 0
  let cursor=Math.max(now,Date.parse(row('SELECT max(due_at) at FROM publication_schedule')?.at||0)||0,Date.parse(setting('lastSourcePublish','1970-01-01'))||0)
  for(const r of ready){
   let due=followingTime(cursor,random()),n=night(due)
   if(n.active){
    const used=Number(row("SELECT count(*) n FROM publication_schedule WHERE julianday(due_at)>=julianday(?) AND julianday(due_at)<julianday(?)",[n.date+'T02:00:00+09:00',n.date+'T09:00:00+09:00']).n)
    if(used>=9)due=n.end+publicationGap(n.end,random())
   }
   execute('INSERT INTO publication_schedule(source_id,due_at) VALUES(?,?)',[r.source_id,new Date(due).toISOString()]);cursor=due
  }
  return ready.length
 })
}
export function publishTick(now=Date.now()){
 scheduleReady(now)
 return transaction(()=>{
  const n=night(now),nightCount=setting('nightPublicationCount',{date:n.date,count:0})
  if(n.active&&nightCount.date===n.date&&nightCount.count>=9){
   const next=new Date(n.end+publicationGap(n.end)).toISOString();setSetting('nextSourcePublication',next)
   return {waiting:true,reason:'새벽 게시 최대 9개',next}
  }
  const gate=Date.parse(setting('nextSourcePublication','1970-01-01'))
  if(gate>now)return {waiting:true,next:new Date(gate).toISOString()}
  const candidate=row("SELECT p.source_id,p.due_at FROM publication_schedule p JOIN rewrites r ON r.source_id=p.source_id WHERE p.published_at IS NULL AND r.status='ready' AND r.model IN ('chatgpt-current-session','gemini-batch-reviewed') ORDER BY p.due_at,p.source_id LIMIT 1")
  if(!candidate)return {waiting:true,reason:'검수된 글 대기'}
  if(Date.parse(candidate.due_at)>now){setSetting('nextSourcePublication',candidate.due_at);return {waiting:true,next:candidate.due_at}}
  let postId
  execute('SAVEPOINT publication_candidate')
  try{postId=publishOne(candidate.source_id,now);execute('RELEASE publication_candidate')}
  catch(error){
   execute('ROLLBACK TO publication_candidate');execute('RELEASE publication_candidate')
   execute("UPDATE rewrites SET status='audit_hold',error=? WHERE source_id=?",[error.message,candidate.source_id])
   setSetting('rewriteRetry:'+candidate.source_id,{error:error.message,retryAt:new Date(now).toISOString(),at:new Date(now).toISOString()})
   return {held:candidate.source_id,reason:error.message}
  }
  const at=new Date(now).toISOString()
  execute('UPDATE publication_schedule SET published_at=? WHERE source_id=?',[at,candidate.source_id])
  if(n.active)setSetting('nightPublicationCount',{date:n.date,count:(nightCount.date===n.date?nightCount.count:0)+1})
  const following=row("SELECT p.due_at FROM publication_schedule p JOIN rewrites r ON r.source_id=p.source_id WHERE p.published_at IS NULL AND r.status='ready' ORDER BY p.due_at LIMIT 1")
  const planned=Date.parse(following?.due_at||'')
  // Keep assigned times. Only overdue work gets a new gap rather than bursting after downtime.
  const next=new Date(planned>=now+publicationGap(now,0)?planned:followingTime(now)).toISOString()
  setSetting('nextSourcePublication',next);setSetting('lastSourcePublish',at)
  return {postId,next}
 })
}
