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

async function insertBoard() {
  console.log('=== boards 테이블에 좌표게시판(coordinate) 추가 시작 ===')

  try {
    // 1. 이미 존재하는지 체크
    const { data: existing, error: checkError } = await supabase
      .from('boards')
      .select('id')
      .eq('slug', 'coordinate')
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      console.log('-> 이미 coordinate 슬러그의 게시판이 존재합니다. 작업을 취소합니다.')
      process.exit(0)
    }

    // 2. coordinate 게시판 정보 인서트
    const { data: newBoard, error: insertError } = await supabase
      .from('boards')
      .insert([
        {
          slug: 'coordinate',
          name: '좌표요청게시판',
          description: '전국 휴대폰 대란 성지 대리점의 좌표와 조건을 요청하는 공간입니다.',
          type: 'coordinate',
          allow_anonymous: false,
          read_min_level: 0,
          write_min_level: 1,
          sort: 40
        }
      ])
      .select()

    if (insertError) throw insertError

    console.log('-> [성공] 좌표요청게시판(coordinate) 등록 완료:', newBoard)
  } catch (error) {
    console.error('-> [에러 발생] 게시판 등록 실패:', error)
    process.exit(1)
  }
}

insertBoard()
