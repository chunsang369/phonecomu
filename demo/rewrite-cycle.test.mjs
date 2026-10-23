import test from 'node:test'
import assert from 'node:assert/strict'
import {advanceCycle} from './rewrite-cycle-state.mjs'
import {spawnSync} from 'node:child_process'
test('importing the batch under a caller --run flag never starts inference',()=>{
 const result=spawnSync(process.execPath,['--input-type=module','-e',"process.argv.push('--run');await import('./demo/rewrite-batch.mjs');console.log('import-only')"],{encoding:'utf8'})
 assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'import-only')
})
const initial=()=>({provider:'gemini',status:'running',attempted:[],attemptedComments:[],results:[]})
test('free cycles continue; real 503 hands pending work to AGY without a size threshold',()=>{
 let state=advanceCycle(initial(),{id:'one',status:'done',sourceIds:['a'],registered:1})
 state=advanceCycle(state,{id:'two',status:'partial',sourceIds:['b'],registered:0})
 assert.equal(state.provider,'gemini');assert.deepEqual(state.attempted,['a','b'])
 state=advanceCycle(state,{id:'three',status:'failed',httpStatus:503})
 assert.equal(state.provider,'agy');assert.equal(state.freeAttemptId,'three');assert.deepEqual(state.attempted,[])
 state=advanceCycle(state,{status:'done',sourceIds:['b'],registered:1})
 assert.deepEqual(state.attempted,['b'])
 assert.equal(advanceCycle(state,{skipped:'empty'}).status,'done')
})
test('quota, auth, parsing and timeout failures never authorize AGY; AGY failure stops',()=>{
 for(const httpStatus of [429,401,403,undefined]){
  const state=advanceCycle(initial(),{status:'failed',httpStatus})
  assert.equal(state.provider,'gemini');assert.equal(state.status,'blocked')
 }
 assert.equal(advanceCycle({...initial(),provider:'agy'},{status:'failed',httpStatus:503}).status,'blocked')
})
test('two consecutive entirely rejected batches stop consumption and preserve pending work',()=>{
 const first=advanceCycle(initial(),{status:'partial',sourceIds:['a'],registered:0})
 const next=advanceCycle(first,{status:'partial',sourceIds:['b'],registered:0})
 assert.equal(first.status,'running');assert.equal(next.status,'blocked');assert.equal(next.provider,'gemini')
})
