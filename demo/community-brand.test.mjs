import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeCommunityCopy,normalizeCommunityNames} from '../src/lib/demo/community-brand.mjs'
test('community names change in copy without touching source metadata or reply links',()=>{
 const source={title:'펨코에서 본 글',content:'뽐뿌에서 24개월 조건을 봤어요',url:'https://www.ppomppu.co.kr/',comments:[{content:'루리웹에도 있네요',parentIndex:null},{content:'디시인사이드도요',parentIndex:0}]}
 const copy=normalizeCommunityCopy(source)
 assert.equal(copy.title,'성평제에서 본 글');assert.equal(copy.content,'성평제에서 24개월 조건을 봤어요')
 assert.equal(copy.url,source.url);assert.equal(copy.comments[1].parentIndex,0);assert.equal(source.title,'펨코에서 본 글')
 assert.equal(normalizeCommunityNames('FM코리아와 에펨코리아'),'성평제와 성평제')
})
