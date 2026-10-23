// A cycle changes provider only after an actual Gemini HTTP 503.
export function advanceCycle(state,result){
 const next={...state,attempted:[...state.attempted],attemptedComments:[...state.attemptedComments],results:[...state.results,result]}
 if(result.skipped){next.status='done';return next}
 if(result.status==='failed'){
  if(state.provider==='gemini'&&result.httpStatus===503){
   next.provider='agy';next.freeAttemptId=result.id;next.attempted=[];next.attemptedComments=[]
  }else next.status='blocked'
  return next
 }
 next.attempted=[...new Set([...next.attempted,...(result.sourceIds||[])])]
 next.attemptedComments=[...new Set([...next.attemptedComments,...(result.commentKeys||[])])]
 const previous=state.results.at(-1)
 if(result.status==='partial'&&!result.registered&&!result.registeredComments&&previous?.status==='partial'&&!previous.registered&&!previous.registeredComments){next.status='blocked';next.error='Two batches failed review without any accepted output; inspect saved responses before more inference'}
 if(!(result.sourceIds?.length||result.commentKeys?.length))next.status='blocked'
 return next
}
