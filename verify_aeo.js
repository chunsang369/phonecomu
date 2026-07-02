const { createClient } = require('@supabase/supabase-js')
const http = require('http')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const siteUrl = 'http://localhost:3000'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

// 간단한 http GET 요청 래퍼 (문자열 리턴)
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }))
    }).on('error', reject)
  })
}

async function runAEODoDVerification() {
  console.log('=== Phase 3a: 자유게시판 AEO/SEO 구조화 데이터 DoD 검증 시작 ===\n')

  let testPostId = null

  try {
    // 1. 검증을 위한 테스트용 게시글 강제 삽입
    console.log('1. 검증용 임시 게시글 데이터베이스 삽입 중...')
    
    // boardId는 free 게시판의 ID 조회
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('slug', 'free')
      .single()

    if (!board) throw new Error('자유게시판(free) boards 정보를 찾을 수 없습니다.')

    const uniqueId = Date.now()
    const testTitle = `DOD_TEST_TITLE_${uniqueId}`
    const testContent = `This is a highly structured test content for DoD 3a verification. We need this content to appear inside page source HTML.`

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        board_id: board.id,
        author_id: '1ba360c4-81f8-48b5-97d3-edf13386e657', // profiles에 실재하는 테스트 사용자 ID 연동
        title: testTitle,
        content: testContent,
        status: 'published',
        is_anonymous: false
      })
      .select('id')
      .single()

    if (postError) throw postError
    testPostId = post.id
    console.log(`   * 테스트 게시글 삽입 성공 (ID: ${testPostId})`)
    console.log('')

    // 2. sitemap.xml 조회 및 URL 수록 여부 검사
    console.log('2. /api/sitemap.xml 조회 및 검증 중...')
    const sitemapRes = await fetchUrl(`${siteUrl}/api/sitemap.xml`)
    
    if (sitemapRes.status !== 200) {
      throw new Error(`/api/sitemap.xml 응답 코드 오류: ${sitemapRes.status}`)
    }

    const sitemapBody = sitemapRes.body
    console.log(`   * sitemap.xml 크기: ${sitemapBody.length} bytes`)

    const targetUrlString = `/board/free/${testPostId}`
    if (sitemapBody.includes(targetUrlString)) {
      console.log(`   -> [통과] sitemap.xml 내에 게시글 URL이 동적으로 포함되어 있음: ${targetUrlString}`)
    } else {
      console.error(`   [실패] sitemap.xml에 URL이 누락되었습니다: ${targetUrlString}`)
      throw new Error('Sitemap validation failed')
    }
    console.log('')

    // 3. 글 상세 페이지 소스 코드 감사 (AEO / HTML / JSON-LD 검사)
    const detailPageUrl = `${siteUrl}/board/free/${testPostId}`
    console.log(`3. 상세 페이지 소스코드 감사 진행: ${detailPageUrl}`)
    
    const detailRes = await fetchUrl(detailPageUrl)
    if (detailRes.status !== 200) {
      throw new Error(`상세 페이지 응답 코드 오류: ${detailRes.status}`)
    }

    const htmlSource = detailRes.body
    console.log(`   * 페이지 소스코드 크기: ${htmlSource.length} bytes`)

    // 검사 ①: 본문 텍스트가 HTML 상에 존재하는지 확인
    console.log('   * 검사 ①: 페이지 소스 상에 본문 텍스트 존재 검증...')
    if (htmlSource.includes(testContent)) {
      console.log('   -> [통과] 페이지 소스 HTML 내에 본문 텍스트가 명확하게 렌더링되어 존재함.')
    } else {
      console.error('   [실패] 페이지 소스에 본문 텍스트가 존재하지 않음 (Static / SSR 렌더링 실패)')
      throw new Error('Body text missing in source HTML')
    }

    // 검사 ②: JSON-LD 구조화 데이터 스크립트 존재 확인
    console.log('   * 검사 ②: 페이지 소스 상에 JSON-LD 스크립트 존재 검증...')
    const hasJsonLdTag = htmlSource.includes('type="application/ld+json"')
    const hasDiscussionPosting = htmlSource.includes('DiscussionForumPosting')
    const hasTitleInJsonLd = htmlSource.includes(testTitle)

    if (hasJsonLdTag && hasDiscussionPosting && hasTitleInJsonLd) {
      console.log('   -> [통과] DiscussionForumPosting 형식의 JSON-LD 스펙이 페이지 소스에 온전히 존재함.')
    } else {
      console.error('   [실패] JSON-LD 스키마 또는 제목 데이터가 소스코드 내에 누락되었습니다.')
      throw new Error('JSON-LD schema validation failed')
    }
    console.log('')

    console.log('=== [최종 결과] Phase 3a 모든 DoD 검증 항목 통과 (SUCCESS) ===')

  } catch (error) {
    console.error('\n=== [DoD 검증 오류 발생] ===')
    console.error(error)
    process.exit(1)
  } finally {
    // 4. 테스트 데이터 삭제 (Cleanup)
    if (testPostId) {
      console.log('4. 검증용 임시 게시글 정리(Cleanup) 진행...')
      await supabase.from('posts').delete().eq('id', testPostId)
      console.log('   -> 테스트 데이터가 안전하게 영구 삭제되었습니다.\n')
    }
  }
}

runAEODoDVerification()
