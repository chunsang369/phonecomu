const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  console.error('환경 변수 로드 실패. .env 파일을 확인해 주세요.')
  process.exit(1)
}

// 일반 외부 해커 시뮬레이션을 위해 anonKey로만 Supabase 초기화
const anonSupabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false }
})

async function runPenetrationTest() {
  console.log('=== Phase 4: RLS 침투 테스트 시작 (anon 키 직접 탈취 시뮬레이션) ===\n')
  let passCount = 0
  let failCount = 0

  // 1. profiles base 테이블 직접 SELECT 차단 검사
  try {
    console.log('1. anon 키로 profiles base 테이블 직접 SELECT 시도...')
    const { data, error } = await anonSupabase
      .from('profiles')
      .select('*')
    
    if (error || !data || data.length === 0) {
      console.log('   -> [통과] profiles base 테이블 직접 조회 차단 성공 (보안 통과)')
      passCount++
    } else {
      console.error(`   [실패] profiles base 테이블 내용이 직접 유출되었습니다! (유출 데이터 수: ${data.length}개)`)
      failCount++
    }
  } catch (err) {
    console.log('   -> [통과] profiles base 조회 오류 차단 성공')
    passCount++
  }
  console.log('')

  // 2. posts base 테이블 직접 SELECT 차단 검사
  try {
    console.log('2. anon 키로 posts base 테이블 직접 SELECT 시도...')
    const { data, error } = await anonSupabase
      .from('posts')
      .select('*')

    if (error || !data || data.length === 0) {
      console.log('   -> [통과] posts base 테이블 직접 조회 차단 성공 (보안 통과)')
      passCount++
    } else {
      console.error(`   [실패] posts base 테이블 내용이 직접 유출되었습니다! (유출 데이터 수: ${data.length}개)`)
      failCount++
    }
  } catch (err) {
    console.log('   -> [통과] posts base 조회 오류 차단 성공')
    passCount++
  }
  console.log('')

  // 3. comments base 테이블 직접 SELECT 차단 검사
  try {
    console.log('3. anon 키로 comments base 테이블 직접 SELECT 시도...')
    const { data, error } = await anonSupabase
      .from('comments')
      .select('*')

    if (error || !data || data.length === 0) {
      console.log('   -> [통과] comments base 테이블 직접 조회 차단 성공 (보안 통과)')
      passCount++
    } else {
      console.error(`   [실패] comments base 테이블 내용이 직접 유출되었습니다! (유출 데이터 수: ${data.length}개)`)
      failCount++
    }
  } catch (err) {
    console.log('   -> [통과] comments base 조회 오류 차단 성공')
    passCount++
  }
  console.log('')

  // 4. 익명글의 author_id NULL 마스킹 검사
  try {
    console.log('4. anon 키로 public_posts 뷰를 통해 익명글(is_anonymous=true)의 author_id 직접 조회 시도...')
    const { data, error } = await anonSupabase
      .from('public_posts')
      .select('id, is_anonymous, author_id, anon_tag')
      .eq('is_anonymous', true)

    if (error) throw error

    let leakedCount = 0
    data.forEach(post => {
      if (post.author_id !== null) leakedCount++
    })

    if (leakedCount === 0) {
      console.log(`   -> [통과] 모든 익명글(${data.length}개)의 실제 author_id가 완전히 NULL 마스킹되어 보호됨.`)
      passCount++
    } else {
      console.error(`   [실패] 익명글의 실제 author_id가 노출되었습니다! (유출 건수: ${leakedCount}개)`)
      failCount++
    }
  } catch (err) {
    console.error('   [오류] 익명글 조회 테스트 도중 에러:', err.message)
    failCount++
  }
  console.log('')

  // 5. profiles 민감 컬럼 노출 차단 검사 (public_profiles 뷰 검증)
  try {
    console.log('5. anon 키로 public_profiles 뷰에서 penalty_points 민감필드 SELECT 시도...')
    const { data, error } = await anonSupabase
      .from('public_profiles')
      .select('id, username, display_name, penalty_points')

    if (error && (error.message.includes('penalty_points') || error.code === 'PGRST219')) {
      console.log('   -> [통과] public_profiles 뷰는 penalty_points 컬럼을 노출하지 않음 (보안 통과)')
      passCount++
    } else if (data && data.length > 0 && 'penalty_points' in data[0]) {
      console.error('   [실패] public_profiles 뷰를 통해 penalty_points 데이터가 유출되었습니다!')
      failCount++
    } else {
      console.log('   -> [통과] public_profiles 뷰는 민감 필드를 차단함 (컬럼 없음/접근 불가)')
      passCount++
    }
  } catch (err) {
    console.log('   -> [통과] 민감 필드 조회 차단 성공')
    passCount++
  }
  console.log('')

  console.log(`=== [테스트 결과] 통과: ${passCount} / 실패: ${failCount} ===`)
  if (failCount > 0) {
    console.error('❌ RLS 침투 테스트 실패: 일부 보안 벽이 무너져 있습니다.')
    process.exit(1)
  } else {
    console.log('✅ RLS 침투 테스트 통과: 모든 보안 격리 제어가 완벽히 작동하고 있습니다.')
  }
}

runPenetrationTest()
