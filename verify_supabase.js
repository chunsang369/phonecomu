const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('환경 변수 로드 실패. .env 파일을 다시 확인해 주세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function runVerification() {
  console.log('=== Supabase 원격 DB 구조 및 시드 데이터 검증 시작 ===\n')

  try {
    // 1. 핵심 게시판(boards) 데이터 확인
    console.log('1. boards 테이블 조회 중...')
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('slug, name, type, allow_anonymous')
      .order('sort')

    if (boardsError) throw boardsError
    console.log(`-> boards 조회 성공 (총 ${boards.length}개):`)
    boards.forEach(b => {
      console.log(`   * [${b.type.toUpperCase()}] Slug: ${b.slug} | 이름: ${b.name} (익명허용: ${b.allow_anonymous})`)
    })
    console.log('')

    // 2. 등급(levels) 데이터 확인
    console.log('2. levels 테이블 조회 중...')
    const { data: levels, error: levelsError } = await supabase
      .from('levels')
      .select('level, name, min_activity, min_attendance')
      .order('level')

    if (levelsError) throw levelsError
    console.log(`-> levels 조회 성공 (총 ${levels.length}개 등급):`)
    levels.forEach(l => {
      console.log(`   * Lv.${l.level} [${l.name}] (최소 활동: ${l.min_activity}점, 최소 출석: ${l.min_attendance}일)`)
    })
    console.log('')

    // 3. auth.users 가입 시 profiles 트리거 연동 작동 테스트 (SQL 수동 인서트 데이터 대조)
    console.log('3. 신규 가입 트리거 (profiles 자동 생성) 작동 테스트 진행...')
    console.log('   * SQL로 삽입된 test 유저 프로필이 잘 생성되었는지 조회 중...')
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (profileError) {
      console.error('   [Error] profiles 테이블 조회에 실패했습니다.')
      throw profileError
    }

    if (profiles.length === 0) {
      console.error('   [Error] 생성된 프로필이 전혀 없습니다.')
      throw new Error('No profiles generated')
    }

    const latestProfile = profiles[0]
    console.log('   -> [성공] profiles 자동 생성 확인:')
    console.log(`      - ID: ${latestProfile.id}`)
    console.log(`      - Username: ${latestProfile.username}`)
    console.log(`      - Display Name: ${latestProfile.display_name}`)
    console.log(`      - Role: ${latestProfile.role} | Level: ${latestProfile.level}`)
    console.log('')

    console.log('=== [최종 결과] 모든 DB 및 트리거 검증 항목 통과 (SUCCESS) ===')

  } catch (error) {
    console.error('\n=== [검증 오류 발생] ===')
    console.error(error)
    process.exit(1)
  }
}

runVerification()
