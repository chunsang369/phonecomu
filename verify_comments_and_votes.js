const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const serviceSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
const anonSupabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })

const testUserId = '1ba360c4-81f8-48b5-97d3-edf13386e657' // profiles에 실재하는 테스트 사용자

async function verifyCommentsAndVotes() {
  console.log('=== Phase 3c: 댓글트리, 비밀댓글 차단 및 다른의견 숨김 DoD 검증 시작 ===\n')

  let testPostId = null
  let parentCommentId = null
  let secretCommentId = null
  let replyCommentId = null

  try {
    // 1. free 게시판 ID 조회
    const { data: board } = await serviceSupabase
      .from('boards')
      .select('id')
      .eq('slug', 'free')
      .single()

    if (!board) throw new Error('자유게시판(free) boards 정보를 찾을 수 없습니다.')

    // 2. 테스트용 게시글 삽입
    console.log('1. 검증용 임시 게시글 데이터베이스 삽입 중...')
    const { data: post, error: postError } = await serviceSupabase
      .from('posts')
      .insert({
        board_id: board.id,
        author_id: testUserId,
        title: `DOD_VOTE_TEST_${Date.now()}`,
        content: 'This is a test post for comments tree and vote hiding logic.',
        status: 'published',
        is_anonymous: false
      })
      .select('id')
      .single()

    if (postError) throw postError
    testPostId = post.id
    console.log(`   * 테스트 게시글 삽입 성공 (ID: ${testPostId})`)
    console.log('')

    // 3. 댓글 트리 데이터 삽입 (일반 댓글 -> 비밀 대댓글 -> 일반 대대댓글)
    console.log('2. 계층형 댓글 트리 데이터 삽입 중...')
    
    // ① 일반 댓글 (부모)
    const { data: c1, error: e1 } = await serviceSupabase
      .from('comments')
      .insert({
        post_id: testPostId,
        author_id: testUserId,
        content: '1. 일반 부모 댓글입니다.',
        is_secret: false,
        is_anonymous: false
      })
      .select('id')
      .single()

    if (e1) throw e1
    parentCommentId = c1.id

    // ② 비밀 댓글 (자식)
    const { data: c2, error: e2 } = await serviceSupabase
      .from('comments')
      .insert({
        post_id: testPostId,
        parent_id: parentCommentId,
        author_id: testUserId,
        content: '2. 비밀 대댓글입니다. (🔒 보안 타겟)',
        is_secret: true,
        is_anonymous: false
      })
      .select('id')
      .single()

    if (e2) throw e2
    secretCommentId = c2.id

    // ③ 일반 대댓글 (자식의 자식)
    const { data: c3, error: e3 } = await serviceSupabase
      .from('comments')
      .insert({
        post_id: testPostId,
        parent_id: secretCommentId,
        author_id: testUserId,
        content: '3. 일반 대대댓글입니다.',
        is_secret: false,
        is_anonymous: false
      })
      .select('id')
      .single()

    if (e3) throw e3
    replyCommentId = c3.id
    console.log('   * [댓글 트리 구축 완료] 일반 댓글 -> 🔒 비밀 대댓글 -> 일반 대대댓글')
    console.log('')

    // 4. 비밀댓글 차단 E2E 검증 (anon vs service_role)
    console.log('3. 비밀댓글 RLS 보안 침투 차단 E2E 검증 진행...')
    
    // 타인/비로그인 시점으로 comments 테이블 select 조회
    const { data: anonComments, error: anonCommentError } = await anonSupabase
      .from('comments')
      .select('id, content, is_secret')
      .eq('post_id', testPostId)

    if (anonCommentError) throw anonCommentError

    console.log(`   * 비로그인(anon) 시점 수집된 댓글 수: ${anonComments.length}개`)
    
    let hasLeakedSecret = false
    anonComments.forEach(c => {
      console.log(`      - [댓글] ID: ${c.id} | Secret: ${c.is_secret} | 본문: ${c.content}`)
      if (c.id === secretCommentId) hasLeakedSecret = true
    })

    if (!hasLeakedSecret) {
      console.log('   -> [통과] 비로그인 타인은 🔒 비밀댓글의 행 자체에 접근할 수 없습니다 (RLS 차단 합격)')
    } else {
      console.error('   [실패] 비밀댓글 본문이 비로그인 사용자에게 유출되었습니다!')
      throw new Error('Secret comment leakage detected')
    }
    console.log('')

    // 5. 다른의견(downvotes) 5개 누적 시 뷰에서 자동 제외 검증
    console.log('4. 다른의견 5개 누적 시 목록 자동 숨김 검증 진행...')
    
    // 우선 현재 뷰(public_posts)에서 해당 글이 잘 조회되는지 선 확인
    const { data: beforeHide } = await anonSupabase
      .from('public_posts')
      .select('id, title, downvotes')
      .eq('id', testPostId)
      .single()

    if (!beforeHide) throw new Error('공개 뷰에서 테스트 글이 조회되지 않습니다.')
    console.log(`   * 다른의견 개수 (정산 전): ${beforeHide.downvotes}개 (목록 노출 상태)`)

    // 다른의견 누적 시뮬레이션: posts 테이블의 downvotes 개수를 5개로 인위적인 업데이트
    const { error: updateError } = await serviceSupabase
      .from('posts')
      .update({ downvotes: 5 })
      .eq('id', testPostId)

    if (updateError) throw updateError
    console.log('   * 다른의견(downvotes) 수치를 5개로 업데이트 완료.')

    // 다시 public_posts 뷰에서 해당 글이 잡히는지 SELECT 시도
    const { data: afterHide, error: afterError } = await anonSupabase
      .from('public_posts')
      .select('id')
      .eq('id', testPostId)
      .maybeSingle()

    if (afterError) throw afterError

    if (afterHide === null) {
      console.log('   -> [통과] 다른의견이 5개 이상 쌓인 글은 public_posts 뷰에서 완전히 은닉(필터링)되었습니다.')
    } else {
      console.error('   [실패] 다른의견이 5개 이상임에도 불구하고 공개 뷰에서 글이 여전히 노출됩니다!')
      throw new Error('Vote hide filter failed')
    }
    console.log('')

    console.log('=== [최종 결과] Phase 3c 모든 DoD 검증 항목 통과 (SUCCESS) ===')

  } catch (error) {
    console.error('\n=== [DoD 검증 오류 발생] ===')
    console.error(error)
    process.exit(1)
  } finally {
    // 6. 테스트 데이터 정리 (Cleanup)
    console.log('5. 테스트 데이터 정리(Cleanup) 진행...')
    if (testPostId) {
      await serviceSupabase.from('posts').delete().eq('id', testPostId)
    }
    console.log('   -> 테스트 데이터가 안전하게 영구 삭제되었습니다.\n')
  }
}

verifyCommentsAndVotes()
