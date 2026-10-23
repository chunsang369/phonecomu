const pacific=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'numeric',day:'numeric',timeZoneName:'longOffset'})
export function nextPacificMidnight(now){
 const fields=date=>Object.fromEntries(pacific.formatToParts(new Date(date)).map(p=>[p.type,p.value]))
 const f=fields(now),wall=Date.UTC(+f.year,+f.month-1,+f.day+1),offset=fields(wall+8*3600000).timeZoneName.match(/GMT([+-])(\d+):(\d+)/)
 const minutes=offset?(offset[1]==='-'?-1:1)*(+offset[2]*60 + +offset[3]):0
 return wall-minutes*60000
}
export function availability(state,now=Date.now()){
 if(!state)return {status:'available_pending'}
 return state.status==='cooldown'&&now>=Date.parse(state.retryAt)?{...state,status:'available_pending'}:state
}
export function recovery(result,previous=null,now=Date.now(),random=Math.random){
 const failures=(previous?.failures||0)+1,http=result.httpStatus
 if(http!==429&&http!==503)return null
 let seconds,reason
 if(http===429&&result.quotaScope==='day'){
  seconds=Math.max(0,(nextPacificMidnight(now)-now)/1000,result.retryAfterSeconds||0);reason='daily_quota_pacific_midnight'
 }else if(Number.isFinite(result.retryAfterSeconds)&&result.retryAfterSeconds>=0){seconds=result.retryAfterSeconds;reason='provider_retry_hint'}
 else {seconds=Math.min(http===503?1800:3600,(http===429&&result.quotaScope!=='minute'?300:60)*2**Math.min(failures-1,6));reason=http===503?'service_busy_recheck_not_reset_guarantee':'quota_recheck_not_reset_guarantee'}
 seconds+=Math.floor(random()*Math.min(30,seconds*.1))
 return {status:'cooldown',failures,httpStatus:http,reason,failedAt:new Date(now).toISOString(),retryAt:new Date(now+seconds*1000).toISOString(),waitSeconds:seconds,model:result.model||previous?.model,projectRef:result.projectRef||'unmapped-project'}
}
export function rejectionCategories(result){
 return [...new Set((result.failed||[]).map(f=>/Length/.test(f.error)?'body_length':/수치/.test(f.error)?'numbers':/원문 그대로|공백|패딩/.test(f.error)?'unchanged_or_padding':/댓글|Comment/.test(f.error)?'comments':/누락/.test(f.error)?'missing_output':'other_review'))]
}
