import test from 'node:test'
import assert from 'node:assert/strict'
import {applyRoundPauses} from './collection-pauses.mjs'
test('blocked FM host skips exactly two collection rounds across both boards',()=>{
 const sources=[{id:'politics',url:'https://www.fmkorea.com/politics'},{id:'love',url:'https://www.fmkorea.com/love'},{id:'phone',url:'https://www.ppomppu.co.kr/'}]
 const state=new Map([['collectionPause:www.fmkorea.com',{skipRounds:2}]])
 const next=()=>applyRoundPauses(sources,(k,d)=>state.get(k)??d,(k,v)=>state.set(k,v))
 assert.deepEqual(next().sources.map(s=>s.id),['phone'])
 assert.equal(state.get('collectionPause:www.fmkorea.com').skipRounds,1)
 assert.deepEqual(next().sources.map(s=>s.id),['phone'])
 assert.equal(next().sources.length,3)
})
