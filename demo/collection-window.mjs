// Visit every source in turn so one long archive cannot consume the entire window.
export async function collectWindow({sources,collect,setting,setSetting,deadline,now=Date.now,onPage=()=>{}}) {
 const pending=sources.map(source=>({source,page:1,cursor:setting(`backfillCursor:${source.id}`,1),seen:new Set()}))
 const results=[],blockedHosts=new Set()
 while(pending.length && now()<deadline) {
  const state=pending.shift(),{source,page}=state
  const host=source.url?new URL(source.url).hostname:source.id
  const result=blockedHosts.has(host)?{deferred:'이 회차에서 이미 접근 제한된 호스트'}:await collect(source,page,Infinity,{deadline,skipExisting:true})
  if(result.blocked||result.deferred)blockedHosts.add(host)
  const entry={source:source.id,page,...result};results.push(entry);onPage(entry)
  if(result.deferred||result.blocked||!result.complete||result.listed===0)continue
  // Some sites return their last page for any larger page number.
  if(state.seen.has(result.signature))continue
  state.seen.add(result.signature)
  if(page===1 && state.cursor>1)state.page=state.cursor
  else {state.page=page+1;state.cursor=state.page;setSetting(`backfillCursor:${source.id}`,state.page)}
  pending.push(state)
 }
 return results
}
