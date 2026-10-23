import test from 'node:test'
import assert from 'node:assert/strict'
import {collectWindow} from './collection-window.mjs'

function fixture(overrides={}) {
 const values=new Map(),calls=[]
 return {values,calls,sources:[{id:'phone'},{id:'politics'}],deadline:100,now:()=>0,
  setting:(key,fallback)=>values.get(key)??fallback,setSetting:(key,value)=>values.set(key,value),
  collect:async(source,page,max,options)=>{
   calls.push([source.id,page]);assert.equal(max,Infinity);assert.equal(options.skipExisting,true)
   return {new:0,duplicate:30,listed:page<4?30:0,complete:true,signature:`${source.id}:${page}`}
  },...overrides}
}
test('continues past fully duplicated pages and alternates sources until archive end',async()=>{
 const f=fixture();await collectWindow(f)
 assert.deepEqual(f.calls,[['phone',1],['politics',1],['phone',2],['politics',2],['phone',3],['politics',3],['phone',4],['politics',4]])
 assert.equal(f.values.get('backfillCursor:phone'),4)
})
test('checks latest first then resumes saved historical position without skipping partial page',async()=>{
 const f=fixture();f.sources=[{id:'phone'}];f.values.set('backfillCursor:phone',9)
 f.collect=async(s,p)=>{f.calls.push(p);return {listed:30,signature:String(p),complete:p===1}}
 await collectWindow(f)
 assert.deepEqual(f.calls,[1,9]);assert.equal(f.values.get('backfillCursor:phone'),9)
})
test('blocked host stops for the round while another source continues',async()=>{
 const f=fixture();const collect=f.collect
 f.collect=async(s,p,...rest)=>s.id==='phone'?{blocked:true,complete:false}:collect(s,p,...rest)
 await collectWindow(f)
 assert.deepEqual(f.calls,[['politics',1],['politics',2],['politics',3],['politics',4]])
 assert.equal(f.values.has('backfillCursor:phone'),false)
})
test('deadline ends window with resumable cursor',async()=>{
 let clock=0;const f=fixture({now:()=>clock,deadline:2});const collect=f.collect
 f.collect=async(...args)=>{clock++;return collect(...args)}
 await collectWindow(f);assert.equal(f.calls.length,2)
 assert.equal(f.values.get('backfillCursor:phone'),2)
})
test('repeated last page ends source instead of looping until deadline',async()=>{
 const f=fixture({sources:[{id:'phone'}]})
 f.collect=async(s,p)=>{f.calls.push(p);return {listed:30,complete:true,signature:'same'}}
 await collectWindow(f);assert.deepEqual(f.calls,[1,2])
 assert.equal(f.values.get('backfillCursor:phone'),2)
})
