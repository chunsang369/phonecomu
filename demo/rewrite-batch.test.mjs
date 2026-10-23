import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareBatch} from './rewrite-batch.mjs'
const source=(i,extra={})=>({id:String(i),source_id:'dcinside',title:'알뜰폰 질문',content:'가'.repeat(30),comments_complete:0,comments_json:'[]',...extra})
test('batch has no 20/30 ready-queue cap and preserves whole inputs',()=>{
 const result=prepareBatch(Array.from({length:60},(_,i)=>source(i)),1000)
 assert.ok(result.selected.length>30);assert.ok(result.estimatedOutputTokens<=24000)
 assert.ok(result.selected.every(s=>s.content==='가'.repeat(30)))
 assert.equal(prepareBatch([source(1),source(2)],1).selected.length,1)
})
test('contacts excluded, incomplete threads accepted, oversized threads deferred intact',()=>{
 const result=prepareBatch([source(1,{content:'문의는 010-1234-5678 로 주세요'}),source(2),source(3,{comments_json:JSON.stringify([{content:'댓글'.repeat(15000),parentIndex:null}])})],1000)
 assert.deepEqual(result.selected.map(x=>x.sourceId),['2']);assert.equal(result.skipped.length,2)
})
