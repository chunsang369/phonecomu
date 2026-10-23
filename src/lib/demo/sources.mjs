// A source's destination is fixed before generation; the model cannot move politics into phone boards.
export const sourceDefinitions = [
  {id:'ppomppu',family:'ppomppu',section:'phone',boardId:2,name:'뽐뿌 휴대폰포럼',url:'https://www.ppomppu.co.kr/zboard/zboard.php?id=phone'},
  {id:'dcinside',family:'dcinside',section:'phone',boardId:2,name:'디시 휴대폰 갤러리',url:'https://gall.dcinside.com/board/lists/?id=cellularphone'},
  {id:'ruliweb-politics',family:'ruliweb',section:'politics',boardId:7,name:'루리웹 정치 게시판',url:'https://bbs.ruliweb.com/community/board/300148?cate=527'},
  {id:'fmkorea-politics',family:'fmkorea',section:'politics',boardId:7,name:'펨코 정치·시사',url:'https://www.fmkorea.com/politics'},
  {id:'ppomppu-anonymous',family:'ppomppu',section:'anonymous',boardId:6,name:'뽐뿌 고민포럼',url:'https://www.ppomppu.co.kr/zboard/zboard.php?id=problem'},
  {id:'fmkorea-anonymous',family:'fmkorea',section:'anonymous',boardId:6,name:'펨코 연애상담 (사용자 지정)',url:'https://www.fmkorea.com/love'},
  {id:'fmkorea-freeboard',family:'fmkorea',section:'free',boardId:5,name:'펨코 자유게시판',url:'https://www.fmkorea.com/free'},
  {id:'ppomppu-freeboard',family:'ppomppu',section:'free',boardId:5,name:'뽐뿌 자유게시판',url:'https://www.ppomppu.co.kr/zboard/zboard.php?id=freeboard'},
]
export const sourceDefinition = id => sourceDefinitions.find(s=>s.id===id)
export function listUrl(source,page=1) {
  const url=new URL(source.url)
  if(source.family==='fmkorea' && page===1)return url.href
  url.searchParams.set('page',String(page));return url.href
}
