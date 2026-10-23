import test from 'node:test'
import assert from 'node:assert/strict'
import {nextPacificMidnight,recovery,availability,rejectionCategories} from './api-recovery-policy.mjs'
test('503 uses bounded recheck backoff, hint takes priority and expiry is only eligible',()=>{
 const now=Date.parse('2026-10-23T14:00:00Z'),first=recovery({httpStatus:503},null,now,()=>0)
 assert.equal(first.waitSeconds,60);assert.equal(recovery({httpStatus:503},first,now,()=>0).waitSeconds,120)
 assert.equal(recovery({httpStatus:503,retryAfterSeconds:9},first,now,()=>0).waitSeconds,9)
 assert.equal(availability(first,now+59000).status,'cooldown');assert.equal(availability(first,now+60000).status,'available_pending')
 assert.equal(recovery({httpStatus:403},first,now),null)
})
test('daily limits reset at Pacific midnight in summer and winter, not every minute',()=>{
 for(const [input,expected] of [['2026-10-23T14:00:00Z','2026-10-24T07:00:00Z'],['2026-12-23T14:00:00Z','2026-12-24T08:00:00Z']]){
  assert.equal(new Date(nextPacificMidnight(Date.parse(input))).toISOString(),new Date(expected).toISOString())
  assert.equal(recovery({httpStatus:429,quotaScope:'day',retryAfterSeconds:60},null,Date.parse(input),()=>0).retryAt,new Date(expected).toISOString())
 }
})
test('review rejection is distinct from transport failure',()=>{
 assert.deepEqual(rejectionCategories({failed:[{error:'Length validation failed'},{error:'원문/댓글 수치 보존 검사 실패'}]}),['body_length','numbers'])
})
