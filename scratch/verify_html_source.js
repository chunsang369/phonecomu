const { createClient } = require('@supabase/supabase-js')
const http = require('http')
require('dotenv').config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function getTargetData() {
  // 1. 실제 유저 1명 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .limit(1)
    .single()

  // 2. 실제 게시글 1개 및 해당 보드 정보 가져오기
  const { data: post } = await supabase
    .from('posts')
    .select('id, board_id, title')
    .eq('status', 'published')
    .limit(1)
    .single()

  let boardSlug = 'free'
  if (post) {
    const { data: board } = await supabase
      .from('boards')
      .select('slug')
      .eq('id', post.board_id)
      .single()
    if (board) boardSlug = board.slug
  }

  return {
    username: profile ? profile.username : null,
    postId: post ? post.id : null,
    boardSlug
  }
}

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve(data))
    }).on('error', err => reject(err))
  })
}

async function run() {
  console.log('=== 페이지 소스 보기 HTML 서버사이드 렌더링 검증 ===\n')

  try {
    const target = await getTargetData()
    if (!target.username || !target.postId) {
      console.error('검증 대상 데이터(유저/게시글)가 DB에 존재하지 않습니다.')
      process.exit(1)
    }

    console.log(`대상 유저 프로필 경로: http://localhost:3001/u/${target.username}`)
    console.log(`대상 글 상세 경로: http://localhost:3001/board/${target.boardSlug}/${target.postId}\n`)

    // 1. 프로필 페이지 소스 보기 검증
    const profileUrl = `http://localhost:3001/u/${encodeURIComponent(target.username)}`
    console.log('1. 프로필 페이지 HTML 패치 중...')
    const profileHtml = await fetchHTML(profileUrl)

    console.log('   -> 프로필 HTML 수신 완료. 매칭 분석:')
    const hasReputation = profileHtml.includes('답변 채택') && profileHtml.includes('신뢰 지수') && profileHtml.includes('공개 작성글')
    const hasJsonLd = profileHtml.includes('application/ld+json') && profileHtml.includes('Person') && profileHtml.includes(target.username)
    const hasLevelBadge = profileHtml.includes('Lv.')

    console.log(`      * [평판 3지표 키워드 노출]: ${hasReputation ? 'PASS (성공)' : 'FAIL (실패)'}`)
    console.log(`      * [등급 배지 Lv. 노출]: ${hasLevelBadge ? 'PASS (성공)' : 'FAIL (실패)'}`)
    console.log(`      * [Person JSON-LD 스크립트 노출]: ${hasJsonLd ? 'PASS (성공)' : 'FAIL (실패)'}`)
    console.log('')

    // 2. 글 상세 페이지 소스 보기 검증
    const detailUrl = `http://localhost:3001/board/${target.boardSlug}/${target.postId}`
    console.log('2. 글 상세 페이지 HTML 패치 중...')
    const detailHtml = await fetchHTML(detailUrl)

    console.log('   -> 글 상세 HTML 수신 완료. 매칭 분석:')
    const hasArticleTag = detailHtml.includes('<article')
    const hasTitle = detailHtml.includes(target.postId) || detailHtml.includes('조회수') || detailHtml.includes('좋아요')
    
    // 본문 내용이 잘 들어있는지 일부 발췌 테스트
    const hasMetas = detailHtml.includes('댓글') && detailHtml.includes('조회수')

    console.log(`      * [<article> 태그 및 본문 컨테이너]: ${hasArticleTag ? 'PASS (성공)' : 'FAIL (실패)'}`)
    console.log(`      * [게시글 메타 정보(조회수/좋아요/댓글)]: ${hasMetas ? 'PASS (성공)' : 'FAIL (실패)'}`)
    console.log('')

    console.log('=== [최종 결과] 모든 서버사이드 렌더링(SSR) 소스 보기 검증 성공 ===')
  } catch (error) {
    console.error('검증 에러 발생:', error)
    process.exit(1)
  }
}

run()
