import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { rows,row,execute,fingerprint,setSetting,setting } from './runtime.mjs'
import { hasContact } from './content-policy.mjs'
import { sourceDefinition,listUrl } from './sources.mjs'
import { backoff,recordFailure,recordSuccess } from './retry.mjs'
import {isAccessRestriction} from '../../../demo/access-retry-policy.mjs'
const readers=new Map()
export function closeReaders(){for(const r of readers.values())r.child.stdin.end();readers.clear()}
export function fetchPublic(source,url,mode) {
 let reader=readers.get(source)
 if(!reader) {
  const child=spawn(process.env.PHONE_PYTHON || 'python3',[resolve(/* turbopackIgnore: true */ 'demo/fetch-public.py'),'--stream'],{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}})
  reader={child,pending:[],buffer:''};readers.set(source,reader)
  child.stderr.resume()
  child.stdout.on('data',chunk=>{reader.buffer+=chunk;let at;while((at=reader.buffer.indexOf('\n'))>=0){const line=reader.buffer.slice(0,at);reader.buffer=reader.buffer.slice(at+1);const request=reader.pending.shift();if(!request)continue;clearTimeout(request.timer);try{const value=JSON.parse(line);if(value.error){const e=new Error(value.error);e.retryAfter=value.retry_after;request.reject(e);}else request.resolve(value)}catch{request.reject(new Error('수집 데이터 형식 오류'))}}})
  const fail=()=>{for(const p of reader.pending){clearTimeout(p.timer);p.reject(new Error('수집 프로세스 종료'))}readers.delete(source)}
  child.on('error',fail);child.on('close',fail)
 }
 return new Promise((resolveResult,reject)=>{const timer=setTimeout(()=>reader.child.kill(),300000);reader.pending.push({resolve:resolveResult,reject,timer});reader.child.stdin.write(JSON.stringify({source,url,mode})+'\n')}).catch(error=>{error.url=url;error.mode=mode;throw error})
}
export function ingest(source,item) {
 const def=sourceDefinition(source.id)
 if(!def || source.permission!=='rewrite_only')throw new Error('수집 대상 확인 필요')
 if(typeof item.title!=='string'||typeof item.content!=='string'||!/^\d+$/.test(item.external_id || '')||!Number.isFinite(Date.parse(item.authored_at)))throw new Error('원문 필드 누락')
 const url=new URL(item.url),origin=new URL(def.url)
 if(url.protocol!=='https:'||url.hostname!==origin.hostname)throw new Error('출처 불일치')
 if(def.family==='ruliweb' ? (!url.pathname.startsWith('/community/board/300148/read/') || url.pathname.split('/').pop()!==item.external_id || url.searchParams.get('cate')!=='527') : def.family==='fmkorea' ? url.pathname!==`/${item.external_id}` : (url.searchParams.get('id')!==origin.searchParams.get('id')||url.searchParams.get('no')!==item.external_id||!['/zboard/view.php','/board/view/'].includes(url.pathname)))throw new Error('출처 식별자 불일치')
 const comments=item.comments || (item.comments_json?JSON.parse(item.comments_json):[])
 if(!Array.isArray(comments)||comments.length>300)throw new Error('댓글 한도 또는 형식 오류')
 const metrics=['view_count','upvotes','downvotes'].map(k=>{const v=item[k];if(v!=null&&(!Number.isSafeInteger(v)||v<0))throw new Error('원문 지표 형식 오류');return v??null})
 const full=item.title+item.content+JSON.stringify(comments.map(c=>c.content))
 if(hasContact(full))return 'excluded'
 const hash=fingerprint(item.title+item.content),existing=row('SELECT id,comments_complete,state FROM collected WHERE url=? OR fingerprint=?',[item.url,hash])
 if(existing&&item.images?.length)execute('UPDATE collected SET images_json=? WHERE id=?',[JSON.stringify(item.images),existing.id])
 if(existing && (existing.comments_complete || existing.state!=='reference'))return 'duplicate'
 const complete=Number(!!item.comments_complete&&comments.length===item.comment_count)
 for(const [i,c] of comments.entries())if(typeof c.content!=='string'||(c.parentIndex!==null&&(!Number.isInteger(c.parentIndex)||c.parentIndex<0||c.parentIndex>=i)))throw new Error('원문 댓글 연결 오류')
 const values=[JSON.stringify(comments),item.comment_count??null,complete,def.boardId,def.family]
 if(existing){execute('UPDATE collected SET comments_json=?,comment_count=?,comments_complete=?,target_board=?,source_family=? WHERE id=?',[...values,existing.id]);execute('UPDATE collected SET source_view_count=?,source_upvotes=?,source_downvotes=?,metrics_collected_at=? WHERE id=?',[...metrics,item.collected_at||new Date().toISOString(),existing.id]);return 'updated'}
 const id=randomUUID()
 const analysis={section:def.section,characters:item.content.length,commentsComplete:!!complete}
 execute('INSERT INTO collected(id,source_id,external_id,url,title,content,authored_at,collected_at,fingerprint,analysis,comments_json,comment_count,comments_complete,target_board,source_family) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,source.id,item.external_id,item.url,item.title,item.content,new Date(item.authored_at).toISOString(),item.collected_at||new Date().toISOString(),hash,JSON.stringify(analysis),...values])
 execute('UPDATE collected SET source_view_count=?,source_upvotes=?,source_downvotes=?,metrics_collected_at=? WHERE id=?',[...metrics,item.collected_at||new Date().toISOString(),id])
 if(item.images?.length)execute('UPDATE collected SET images_json=? WHERE id=?',[JSON.stringify(item.images),id])
 if(process.env.PHONE_COLLECTION_BATCH_ID)execute('INSERT OR IGNORE INTO collection_batch_items VALUES(?,?)',[id,process.env.PHONE_COLLECTION_BATCH_ID])
 return 'new'
}
export async function collectPage(source,page=1,maxItems=30,{deadline=Infinity,skipExisting=false}={}) {
 if(setting('collectionMode',null)==='scheduled'&&process.env.PHONE_COLLECTION_BATCH!=='1')return {new:0,updated:0,duplicate:0,excluded:0,failed:0,deferred:'다음 정기 수집 회차'}
 const waiting=backoff(source);if(waiting)return {new:0,updated:0,duplicate:0,excluded:0,failed:0,deferred:waiting.nextAttempt}
 const result={new:0,updated:0,duplicate:0,excluded:0,failed:0,listed:0,complete:false,blocked:false},errors=[];let limited=false
 const id=randomUUID();execute('INSERT INTO runs(id,kind,started_at,status,details) VALUES(?,?,?,?,?)',[id,'collect',new Date().toISOString(),'running',JSON.stringify({source:source.id,page})])
 try {
  const list=await fetchPublic(source.id,listUrl(sourceDefinition(source.id),page),'list')
  if(!Array.isArray(list.links))throw new Error('게시판 목록 형식 오류')
  result.listed=list.links.length;result.signature=fingerprint(list.links.join('\n'));result.complete=true
  await new Promise(r=>setTimeout(r,7000+Math.floor(Math.random()*3000)))
  for(const url of list.links) {
   if(result.new+result.updated>=maxItems||Date.now()>=deadline){result.complete=false;break}
   if(row(skipExisting?'SELECT id FROM collected WHERE url=?':'SELECT id FROM collected WHERE url=? AND comments_complete=1',[url])){result.duplicate++;continue}
   try{const item=await fetchPublic(source.id,url,'detail');result[ingest(source,item)]++;if(isAccessRestriction(item.comments_error)||isAccessRestriction(item.images_error))throw Object.assign(new Error(item.comments_error||item.images_error),{url,mode:'detail'})}
   catch(e){result.failed++;errors.push(url+' '+e.message);if(/HTTP (30[12378]|403|429|430|50[234])|timed out|Timeout/i.test(e.message)){recordFailure(source,e);limited=true;result.complete=false;break}}
   await new Promise(r=>setTimeout(r,7000+Math.floor(Math.random()*3000)))
  }
 }catch(e){result.failed++;errors.push(e.message);recordFailure(source,e);limited=true}
 result.blocked=limited
 if(!limited&&result.new+result.updated>0)recordSuccess(source)
 const at=new Date().toISOString();execute('UPDATE sources SET last_checked=?,last_error=? WHERE id=?',[at,errors.length?errors.join('; ').slice(0,500):null,source.id])
 execute('UPDATE runs SET status=?,finished_at=?,details=? WHERE id=?',[errors.length?'partial':'done',at,JSON.stringify({source:source.id,page,...result,errors}),id]);setSetting('collectorHeartbeat',at)
 return result
}
export async function collectDue(force=false) {
 const result=[]
 for(const source of rows('SELECT * FROM sources WHERE enabled=1')) {
  if(source.permission!=='rewrite_only'||(!force&&source.last_checked&&Date.now()-Date.parse(source.last_checked)<source.interval_minutes*60000))continue
  result.push({source:source.id,...await collectPage(source,1,source.max_items)})
 }
 return result
}
