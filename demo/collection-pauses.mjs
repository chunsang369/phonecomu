export function applyRoundPauses(sources,setting,setSetting){
 const skippedHosts=[]
 for(const host of new Set(sources.map(s=>new URL(s.url).hostname))){
  const key=`collectionPause:${host}`,state=setting(key,null)
  if(['retry_pending','retry_running'].includes(state?.status)){skippedHosts.push(host);continue}
  if(state?.skipRounds>0){skippedHosts.push(host);setSetting(key,{...state,skipRounds:state.skipRounds-1,lastSkippedAt:new Date().toISOString()})}
 }
 return {sources:sources.filter(s=>!skippedHosts.includes(new URL(s.url).hostname)),skippedHosts}
}
