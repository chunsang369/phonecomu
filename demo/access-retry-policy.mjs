export const isAccessRestriction=message=>/HTTP (403|429|430)|access denied|captcha|접근.?제한|봇.?차단/i.test(message||'')
export function accessFailure(previous,{sourceId,url,mode,batchId,message,retryAfter},now=Date.now(),isRetry=false){
 if(isRetry)return {...previous,status:'skip_rounds',skipRounds:2,reason:message,lastFailure:new Date(now).toISOString()}
 if(previous?.status==='retry_pending'||previous?.skipRounds>0)return previous
 const hint=Number(retryAfter)>0?Number(retryAfter)*1000:Date.parse(retryAfter||'')-now
 return {status:'retry_pending',skipRounds:0,sourceId,url,mode,batchId,reason:message,firstFailure:new Date(now).toISOString(),retryAt:new Date(now+Math.max(30*60000,Number.isFinite(hint)?hint:0)).toISOString()}
}
