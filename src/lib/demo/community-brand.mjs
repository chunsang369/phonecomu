// Transform the generated copy only. Source snapshots and attribution stay intact.
const names=/에펨코리아|FM\s*코리아|FMKorea|펨코|뽐뿌|Ppomppu|디시인사이드|디씨인사이드|DCInside|디시|디씨|루리웹|Ruliweb|클리앙|더쿠|보배드림|웃긴대학|웃대|오늘의유머|일간베스트|일베|인벤|에스엘알클럽|SLR클럽|82쿡|네이트\s*판|레딧|Reddit/giu
export const communityNameInstruction='제목·본문·모든 댓글에 등장하는 커뮤니티 이름은 성평제로 바꾼다. 뽐뿌/펨코/에펨코리아/디시/루리웹 등은 성평제로 통일한다. 명칭 치환을 완료한 최종 문장으로 본문 글자 수를 검증한다. 원본 출처 메타데이터는 변환 대상이 아니다.'
export const normalizeCommunityNames=text=>typeof text==='string'?text.replace(names,'성평제'):text
export function normalizeCommunityCopy(entry){
 return {...entry,title:normalizeCommunityNames(entry.title),content:normalizeCommunityNames(entry.content),comments:Array.isArray(entry.comments)?entry.comments.map(c=>({...c,content:normalizeCommunityNames(c.content)})):entry.comments}
}
