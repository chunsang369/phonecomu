import { setting,setSetting } from './runtime.mjs'
import {accessFailure,isAccessRestriction} from '../../../demo/access-retry-policy.mjs'
export const backoffKey=source=>`backoff:${new URL(source.url).hostname}`
export function retryDelay(failures,retryAfter,now=Date.now(),random=Math.random()) {
 const requested=Number(retryAfter)>0?Number(retryAfter)*1000:Date.parse(retryAfter||'')-now
 const exponential=Math.min(6*3600000,5*60000*2**Math.min(20,Math.max(0,failures-1)))
 return Math.max(Number.isFinite(requested)?requested:0,Math.min(6*3600000,Math.round(exponential*(1+random*0.1))))
}
export function backoff(source,now=Date.now()){
 const pause=setting(`collectionPause:${new URL(source.url).hostname}`,null)
 if(process.env.PHONE_COLLECTION_RETRY!=='1'&&(['retry_pending','retry_running'].includes(pause?.status)||pause?.skipRounds>0))return {nextAttempt:pause.retryAt||'다음 두 정기 회차 제외',...pause}
 const state=setting(backoffKey(source),null);return state&&Date.parse(state.nextAttempt)>now?state:null
}
export function recordFailure(source,error,now=Date.now()) {
 const old=setting(backoffKey(source),{}),failures=(old.failures||0)+1
 const state={host:new URL(source.url).hostname,failures,cycle:Math.ceil(failures/3),reason:error.message,lastFailure:new Date(now).toISOString(),nextAttempt:new Date(now+retryDelay(failures,error.retryAfter,now)).toISOString()}
 if(isAccessRestriction(error.message)){
  const key=`collectionPause:${state.host}`,prior=setting(key,{})
  const next=accessFailure(prior,{sourceId:source.id,url:error.url||source.url,mode:error.mode||'list',batchId:process.env.PHONE_COLLECTION_BATCH_ID,message:error.message,retryAfter:error.retryAfter},now,process.env.PHONE_COLLECTION_RETRY==='1')
  setSetting(key,next);state.nextAttempt=next.retryAt||state.nextAttempt
 }
 setSetting(backoffKey(source),state);return state
}
export function recordSuccess(source){setSetting(backoffKey(source),{failures:0,nextAttempt:null,lastSuccess:new Date().toISOString()})}
