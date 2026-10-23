import test from 'node:test'
import assert from 'node:assert/strict'
import {characterCount,rewriteLengthRule,checkRewriteLength} from '../src/lib/demo/rewrite-length.mjs'
test('length threshold decreases from 30 percent to 3 percent',()=>{
 for(const [n,d] of [[10,3],[100,29],[500,117],[1000,166],[2000,60]]){
  const original='가'.repeat(n), rule=rewriteLengthRule(original)
  assert.equal(rule.minimumDifference,d)
  assert.equal(checkRewriteLength(original,'나'.repeat(n+d)).valid,true)
  assert.equal(checkRewriteLength(original,'나'.repeat(n+d-1)).valid,false)
 }
})
test('counts spaces and unicode; rejects unchanged and excessive expansion',()=>{
 assert.equal(characterCount('가 😀\r\n나'),5)
 assert.equal(checkRewriteLength('가'.repeat(100),'나'.repeat(100)).valid,false)
 assert.equal(checkRewriteLength('가'.repeat(100),'나'.repeat(131)).valid,false)
 assert.equal(checkRewriteLength('가'.repeat(100),'나'.repeat(71)).valid,true)
})
