const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const serviceSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
const anonSupabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })

async function verifyAnonymousSlice() {
  console.log('=== Phase 3b: 익명게시판 슬라이스 작동 및 author_id NULL 은닉 DoD 검증 시작 ===\n')

  let testPostId = null

  try {
    // 1. anonymous 게시판 ID 조회
    const { data: board } = await serviceSupabase
      .from('boards')
      .select('id')
      .eq('slug', 'anonymous')
      .single()

    if (!board) throw new Error('익명게시판(anonymous) boards 정보를 찾을 수 없습니다.')

    // 2. 테스트용 익명 게시글 작성 시뮬레이션 (service_role 계정 권한으로 작성자 ID 연결해 작성)
    console.log('1. 익명 게시판(anonymous)에 is_anonymous=true 테스트 게시글 삽입 중...')
    const testTitle = `ANON_DOD_TEST_${Date.now()}`
    const testContent = 'Anonymous posting content for security validation.'

    const { data: post, error: postError } = await serviceSupabase
      .from('posts')
      .insert({
        board_id: board.id,
        author_id: '1ba360c4-81f8-48b5-97d3-edf13386e657', // 테스트 계정 ID
        title: testTitle,
        content: testContent,
        status: 'published',
        is_anonymous: true // 익명 플래그 지정
      })
      .select('id')
      .single()

    if (postError) throw postError
    testPostId = post.id
    console.log(`   * 임시 익명글 삽입 성공 (ID: ${testPostId})`)
    console.log('')

    // 3. 외부 anon API로 public_posts 뷰를 통해 해당 글을 직접 쿼리하여 데이터 검증
    console.log('2. anon 키(공개 클라이언트 API)로 public_posts 뷰에서 해당 익명글 쿼리 중...')
    const { data: fetchedPost, error: fetchError } = await anonSupabase
      .from('public_posts')
      .select('id, title, content, is_anonymous, author_id, author_username, author_display_name, anon_tag')
      .eq('id', testPostId)
      .single()

    if (fetchError) throw fetchError

    console.log('   * 쿼리 응답 수집 완료. 보안 필드 정밀 분석 시작:')
    console.log(`      - Title: ${fetchedPost.title}`)
    console.log(`      - Is Anonymous: ${fetchedPost.is_anonymous}`)
    console.log(`      - author_id: ${fetchedPost.author_id}`)
    console.log(`      - author_username: ${fetchedPost.author_username}`)
    console.log(`      - author_display_name: ${fetchedPost.author_display_name}`)
    console.log(`      - anon_tag: ${fetchedPost.anon_tag}`)
    console.log('')

    // 검사 ①: author_id 가 물리적으로 완전히 NULL 인지 검사
    console.log('   * 검사 ①: author_id NULL 은닉 검증...')
    if (fetchedPost.author_id === null) {
      console.log('   -> [통과] author_id가 데이터베이스 레벨에서 NULL화되어 보호받고 있습니다.')
    } else {
      console.error(`   [실패] author_id가 노출되었습니다! (값: ${fetchedPost.author_id})`)
      throw new Error('author_id leakage detected')
    }

    // 검사 ②: username 및 display_name 도 NULL 인지 검사
    console.log('   * 검사 ②: 작성자 프로필 정보 NULL 은닉 검증...')
    if (fetchedPost.author_username === null && fetchedPost.author_display_name === null) {
      console.log('   -> [통과] 작성자의 프로필 컬럼들이 데이터베이스 레벨에서 완전히 NULL화되었습니다.')
    } else {
      console.error(`   [실패] 프로필 정보가 유출되었습니다!`)
      throw new Error('Profile info leakage detected')
    }

    // 검사 ③: anon_tag가 익명-XXXX 형식으로 생성되었는지 검사 (정규식: /^익명-[a-f0-9]{4}$/)
    console.log('   * 검사 ③: md5 해시 기반 AnonBadge 태그 정밀 포맷 검증...')
    const tagRegex = /^익명-[a-f0-9]{4}$/
    if (tagRegex.test(fetchedPost.anon_tag)) {
      console.log(`   -> [통과] 익명태그 패턴 검증에 합격했습니다: ${fetchedPost.anon_tag}`)
    } else {
      console.error(`   [실패] 익명태그 포맷이 올바르지 않습니다: ${fetchedPost.anon_tag}`)
      throw new Error('Invalid anon_tag format')
    }
    console.log('')

    console.log('=== [최종 결과] Phase 3b 모든 DoD 검증 항목 통과 (SUCCESS) ===')

  } catch (error) {
    console.error('\n=== [DoD 검증 오류 발생] ===')
    console.error(error)
    process.exit(1)
  } finally {
    // 4. 테스트 데이터 삭제 (Cleanup)
    if (testPostId) {
      console.log('3. 검증용 임시 게시글 정리(Cleanup) 진행...')
      await serviceSupabase.from('posts').delete().eq('id', testPostId)
      console.log('   -> 테스트 데이터가 안전하게 영구 삭제되었습니다.\n')
    }
  }
}

verifyAnonymousSlice()
