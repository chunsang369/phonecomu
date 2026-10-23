// Topic and comment-completeness exclusions were removed by the user on 2026-10-23.
export function hasContact(text) {
 return /\b0(?:1[016789]|2|[3-6]\d|70)[- .]?\d{3,4}[- .]?\d{4}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:open\.)?kakao\.com\/|t\.me\/|(?:카톡|카카오톡|텔레그램|라인)\s*(?:아이디|id)\s*[:：=]?\s*[\w가-힣*]+|(?:카톡|카카오톡|텔레그램|라인)(?:에서|에)?\s+[\w가-힣]+\s*(?:검색|문의)/iu.test(text)
}
export function availableComments(source) {
 const comments=JSON.parse(source.comments_json || '[]'),indices=new Map(),result=[]
 for(const [i,c] of comments.entries()) {
  if(typeof c.content!=='string'||!c.content.trim()||/^(?:코멘트가 삭제되었습니다|삭제된 댓글|삭제된 코멘트|이 댓글은 삭제)/.test(c.content.trim()))continue
  if(c.parentIndex!==null&&(!Number.isInteger(c.parentIndex)||c.parentIndex<0||c.parentIndex>=i))throw new Error('원문 댓글 연결 오류')
  indices.set(i,result.length)
  result.push({...c,parentIndex:c.parentIndex===null?null:indices.get(c.parentIndex)??null})
 }
 return result
}
export function assertSourceContactFree(source) {
 if(hasContact(source.title+' '+source.content+' '+JSON.stringify(JSON.parse(source.comments_json||'[]').map(c=>c.content))))throw new Error('연락처 포함 원문은 게시하지 않습니다.')
}
export function assertRewritten(source, rewritten) {
 const normalize=text=>text.normalize('NFKC').replace(/[\s\p{P}\p{S}\p{Cf}]/gu,'')
 for(const key of ['title','content']) {
  const text=rewritten[key]
  if(typeof text!=='string'||text!==text.trim()||/[ \t]{3,}|[\u200B-\u200D\uFEFF]/u.test(text))throw new Error('공백 패딩 또는 보이지 않는 문자로 길이 조절 금지')
  if(normalize(source[key])===normalize(text))throw new Error('제목/본문 원문 그대로 또는 공백·기호만 변경한 결과')
 }
}
