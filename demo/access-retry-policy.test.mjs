import test from 'node:test'
import assert from 'node:assert/strict'
import {accessFailure,isAccessRestriction} from './access-retry-policy.mjs'
import {applyRoundPauses} from './collection-pauses.mjs'
test('first block schedules one retry after 30 minutes; second block skips exactly two regular rounds',()=>{
 const now=Date.parse('2026-10-23T00:00:00Z'),failure={sourceId:'a',url:'https://www.fmkorea.com/love',mode:'list',batchId:'round1',message:'HTTP 403'}
 const pending=accessFailure(null,failure,now)
 assert.equal(Date.parse(pending.retryAt)-now,1800000);assert.equal(pending.skipRounds,0)
 assert.deepEqual(accessFailure(pending,failure,now+1000),pending)
 let saved=pending;const sources=[{url:failure.url},{url:'https://www.fmkorea.com/politics'}]
 const run=()=>applyRoundPauses(sources,()=>saved,(_,value)=>saved=value)
 assert.equal(run().sources.length,0);assert.equal(saved.skipRounds,0)
 saved=accessFailure(pending,failure,now+1800000,true)
 assert.equal(run().sources.length,0);assert.equal(saved.skipRounds,1)
 assert.equal(run().sources.length,0);assert.equal(saved.skipRounds,0)
 assert.equal(run().sources.length,2)
 assert.equal(isAccessRestriction('HTTP 503'),false)
 assert.equal(Date.parse(accessFailure(null,{...failure,retryAfter:'3600'},now).retryAt)-now,3600000)
})
