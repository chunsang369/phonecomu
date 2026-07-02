const { createClient } = require('@supabase/supabase-js')
const http = require('http')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const siteUrl = 'http://localhost:3000'

const serviceSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
const anonSupabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })

const testUserId = '1ba360c4-81f8-48b5-97d3-edf13386e657' // 테스트용 유저 ID

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }))
    }).on('error', reject)
  })
}

async function verifyFTSAndLlmstxt() {
  console.log('=== Phase 3d: FTS 가중치 검색 및 llms.txt 노출 DoD 검증 시작 ===\n')

  let postAId = null
  let postBId = null

  try {
    // 1. free 게시판 ID 조회
    const { data: board } = await serviceSupabase
      .from('boards')
      .select('id')
      .eq('slug', 'free')
      .single()

    if (!board) throw new Error('자유게시판 boards 정보를 찾을 수 없습니다.')

    // 2. 검색용 테스트 글 2개 삽입 (가중치 비교 목적)
    console.log('1. FTS 가중치 비교용 임시 게시글 2개 삽입 중...')
    
    // 글 A: 제목에 키워드 포함 (가중치 상위 타겟)
    const { data: pA } = await serviceSupabase
      .from('posts')
      .insert({
        board_id: board.id,
        author_id: testUserId,
        title: 'FTS_GOLDEN_KEYWORD - 제목 매칭 테스트 글',
        content: 'This is simple test content.',
        status: 'published',
        is_anonymous: false
      })
      .select('id')
      .single()

    postAId = pA.id

    // 글 B: 본문에만 키워드 포함 (가중치 하위 타겟)
    const { data: pB } = await serviceSupabase
      .from('posts')
      .insert({
        board_id: board.id,
        author_id: testUserId,
        title: '일반적인 제목의 글',
        content: 'This is a test content containing the word FTS_GOLDEN_KEYWORD for matching weight validation.',
        status: 'published',
        is_anonymous: false
      })
      .select('id')
      .single()

    postBId = pB.id
    console.log(`   * 글 A 삽입 완료 (ID: ${postAId}, 제목 매칭)`)
    console.log(`   * 글 B 삽입 완료 (ID: ${postBId}, 본문 매칭)`)
    console.log('')

    // 3. FTS 검색 RPC 동작 및 순위(ts_rank) 가중치 대조 검증
    console.log('2. FTS search_posts RPC를 통한 가중치 검색 검사 진행...')
    const { data: searchResults, error: searchError } = await anonSupabase
      .rpc('search_posts', { query_text: 'FTS_GOLDEN_KEYWORD' })

    if (searchError) throw searchError

    console.log(`   * 검색 매칭 수: ${searchResults.length}개`)
    searchResults.forEach((r, idx) => {
      console.log(`      [${idx + 1}위] ID: ${r.id} | Title: ${r.title}`)
    })

    if (searchResults.length >= 2) {
      const firstPlace = searchResults[0].id
      const secondPlace = searchResults[1].id

      if (firstPlace === postAId && secondPlace === postBId) {
        console.log('   -> [통과] 제목 매칭(글 A)이 본문 매칭(글 B)보다 상위에 정렬되어 가중치 FTS가 완벽 작동함.')
      } else {
        console.error('   [실패] FTS 검색 가중치 랭킹 정렬이 유효하지 않습니다.')
        throw new Error('FTS rank sorting failed')
      }
    } else {
      console.error('   [실패] 검색 결과에서 테스트 글들이 검출되지 않았습니다.')
      throw new Error('FTS matching failed')
    }
    console.log('')

    // 4. llms.txt 동적 렌더링 검사
    console.log('3. /llms.txt 마크다운 렌더링 상태 검사 진행...')
    const llmRes = await fetchUrl(`${siteUrl}/llms.txt`)
    
    if (llmRes.status !== 200) {
      throw new Error(`/llms.txt 응답 오류: ${llmRes.status}`)
    }

    const contentType = llmRes.headers['content-type']
    console.log(`   * Content-Type: ${contentType}`)
    
    const body = llmRes.body
    console.log(`   * llms.txt 크기: ${body.length} bytes`)

    const hasTitle = body.includes('LLM Context 및 사이트 맵')
    const hasLevels = body.includes('6단계 등급 스키마 탑재')
    const hasRecentPost = body.includes('FTS_GOLDEN_KEYWORD')

    if (hasTitle && hasLevels && hasRecentPost) {
      console.log('   -> [통과] llms.txt 가 올바른 플레인 텍스트 마크다운 형식으로 사이트 맵과 동적 최근 글을 서빙함.')
    } else {
      console.error('   [실패] llms.txt 문서 구조 또는 동적 최근글 노출 상태 검증 실패')
      throw new Error('llms.txt formatting validation failed')
    }
    console.log('')

    console.log('=== [최종 결과] Phase 3d 모든 DoD 검증 항목 통과 (SUCCESS) ===')

  } catch (error) {
    console.error('\n=== [DoD 검증 오류 발생] ===')
    console.error(error)
    process.exit(1)
  } finally {
    // 5. 테스트 데이터 정리 (Cleanup)
    console.log('4. FTS 테스트 데이터 정리(Cleanup) 진행...')
    if (postAId) await serviceSupabase.from('posts').delete().eq('id', postAId)
    if (postBId) await serviceSupabase.from('posts').delete().eq('id', postBId)
    console.log('   -> 테스트 데이터가 안전하게 영구 삭제되었습니다.\n')
  }
}

verifyFTSAndLlmstxt()
