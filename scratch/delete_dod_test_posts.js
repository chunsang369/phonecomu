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

async function deleteDodTestPosts() {
  console.log('=== DB 내 무의미한 DOD 테스트 게시글 일괄 삭제 시작 ===')

  try {
    // 1. DOD_TEST_TITLE_ % 와 ANON_DOD_TEST_ % 에 부합하는 글 조회
    const { data: listToToDelete, error: selectError } = await supabase
      .from('posts')
      .select('id, title')
      .or('title.ilike.DOD_TEST_TITLE_%,title.ilike.ANON_DOD_TEST_%')

    if (selectError) throw selectError

    if (!listToToDelete || listToToDelete.length === 0) {
      console.log('-> 삭제할 대상 DOD 테스트 게시글이 존재하지 않습니다.')
      process.exit(0)
    }

    console.log(`-> 총 ${listToToDelete.length}개의 테스트 글 발견. 삭제를 진행합니다...`)
    
    // 2. 일괄 삭제 실행
    const deleteIds = listToToDelete.map(p => p.id)
    const { data: deleted, error: deleteError } = await supabase
      .from('posts')
      .delete()
      .in('id', deleteIds)
      .select()

    if (deleteError) throw deleteError

    console.log(`-> [성공] 총 ${deleted.length}개의 무의미한 테스트용 게시글이 완벽히 DB에서 삭제(DELETE)되었습니다!`)
  } catch (error) {
    console.error('-> [에러 발생] 게시글 삭제 실패:', error)
    process.exit(1)
  }
}

deleteDodTestPosts()
