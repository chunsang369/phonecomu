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

async function renameBoard() {
  console.log('=== boards 테이블의 좌표요청게시판 -> 지역별 시세표 변경 시작 ===')

  try {
    const { data, error } = await supabase
      .from('boards')
      .update({
        name: '지역별 시세표',
        description: '전국 휴대폰 대란 성지 대리점의 지역별 시세표를 공유하는 공간입니다.'
      })
      .eq('slug', 'coordinate')
      .select()

    if (error) throw error

    console.log('-> [성공] 게시판명 변경 완료:', data)
  } catch (error) {
    console.error('-> [에러 발생] 게시판명 변경 실패:', error)
    process.exit(1)
  }
}

renameBoard()
