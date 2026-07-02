const { createClient } = require('@supabase/supabase-js')
const http = require('http')
require('dotenv').config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function fetchUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    }).on('error', err => resolve({ status: 500, error: err }))
  })
}

async function checkDetailAccess() {
  console.log('=== 비로그인 유저 글 상세 접근 테스트 ===')
  
  // 1. 존재하는 게시글 ID 하나 취득 (public_posts 뷰 쿼리)
  const { data: posts } = await supabase
    .from('public_posts')
    .select('id, board_id')
    .limit(1)

  if (!posts || posts.length === 0) {
    console.log('데이터베이스에 저장된 게시글이 없어 상세페이지 테스트를 진행할 수 없습니다.')
    process.exit(0)
  }

  const targetId = posts[0].id
  
  // board_id 에 매칭되는 slug 획득
  const { data: board } = await supabase
    .from('boards')
    .select('slug')
    .eq('id', posts[0].board_id)
    .single()

  const targetUrl = `http://localhost:3000/board/${board.slug}/${targetId}`
  console.log(`대상 글 URL: ${targetUrl}`)

  // 2. 비로그인 시점으로 상세 페이지 fetch
  const res = await fetchUrl(targetUrl)
  console.log(`Status Code: ${res.status}`)
  
  if (res.status === 200) {
    console.log('✅ 성공: 비로그인 유저도 상세글을 정상 열람할 수 있습니다.')
  } else {
    console.error(`❌ 에러: 상세글 열람 실패 (상태 코드: ${res.status})`)
    if (res.body) {
      console.log('Error Body Snippet:', res.body.substring(0, 500))
    }
  }
}

checkDetailAccess()
