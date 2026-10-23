import test from 'node:test'
import assert from 'node:assert/strict'
import {hasContact,availableComments,assertSourceContactFree,assertRewritten} from '../src/lib/demo/content-policy.mjs'
test('topics allowed; phone, email and messenger contact retained as exclusions',()=>{
 assert.equal(hasContact('알뜰폰 MVNO 요금제, 정치 의견, 카카오보험'),false)
 for(const t of ['010-1234-5678','02-123-4567','mail@example.com','카톡 아이디 hello123','https://open.kakao.com/o/example','카톡에 엘특 문의','카톡 백색전화 검색 후 문의'])assert.equal(hasContact(t),true)
 assert.throws(()=>assertSourceContactFree({title:'제목',content:'본문',comments_json:JSON.stringify([{content:'010-1234-5678'}])}),/연락처/)
})
test('padding, invisible characters and unchanged titles/bodies cannot pass as rewrites',()=>{
 const source={title:'아이폰 공시 질문',content:'프맥빼곤 다 공시로나오는데 이유가있음? 그게 더 싼가'}
 for(const changed of [source,{title:'공시가 궁금함',content:source.content+'         '},{title:'공시가 궁금함',content:source.content+'!!!'},{title:'공시가 궁금함',content:'다른\u200B문장이다'},{title:source.title,content:'다른 말로 쓴 본문이다'}])assert.throws(()=>assertRewritten(source,changed))
 assert.doesNotThrow(()=>assertRewritten(source,{title:'프맥 말고 공시로 나오는 이유?',content:'프로맥스 빼면 공시 조건이던데 그쪽이 더 저렴해서 그런 건가?'}))
})
test('partial comment snapshots retain known threads without inventing missing comments',()=>{
 const comments=[{content:'있는 댓글',parentIndex:null},{content:'',parentIndex:null},{content:'코멘트가 삭제되었습니다.(규칙위반)',parentIndex:0},{content:'원댓글 누락 답글',parentIndex:1},{content:'확보한 답글',parentIndex:0},{content:'답글의 답글',parentIndex:4}]
 const result=availableComments({comments_complete:0,comment_count:20,comments_json:JSON.stringify(comments)})
 assert.deepEqual(result.map(c=>c.parentIndex),[null,null,0,2]);assert.equal(result.length,4)
})
