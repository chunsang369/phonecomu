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

const DUMMY_POSTS = [
  // 1. 자유게시판 (free)
  {
    board_slug: 'free',
    title: '이번 갤럭시 S26 진짜 역대급 디자인으로 뽑혔네요 ㄷㄷ',
    content: '이번에 유출 샷 보니까 베젤도 역대급으로 얇고 링 카메라 배치도 대칭형이라 엄청 예쁘네요. 기변 욕구 제대로 뿜뿜합니다. 빨리 실물 보고 싶네요.',
    is_anonymous: false,
    upvotes: 42,
    view_count: 1205
  },
  {
    board_slug: 'free',
    title: '성지 처음 가봤는데 신세계네요 ㅋㅋ',
    content: '맨날 공식 대리점에서 할부금 다 내고 호갱 당하며 사다가 오늘 성지라는 곳 처음 방문해서 샀는데 진짜 훨씬 저렴하게 구매했습니다. 다들 이래서 대란 대란 하는 거였군요!',
    is_anonymous: false,
    upvotes: 28,
    view_count: 850
  },

  // 2. 정보게시판 (info)
  {
    board_slug: 'info',
    title: '[꿀팁] 자급제 + 알뜰폰 조합 vs 성지 기변 요금 총 합산 비교표',
    content: '2년 동안 사용하는 요금을 엑셀로 전부 합산해서 비교 분석해 보았습니다. 결론부터 말씀드리면 높은 요금제를 평소에도 사용하시는 분들은 성지 기변이 유리하며, 데이터를 소량만 사용하시는 분들은 무조건 자급제+알뜰폰이 가성비 최고입니다.',
    is_anonymous: false,
    upvotes: 89,
    view_count: 3450
  },
  {
    board_slug: 'info',
    title: '7월 이동통신 3사 공시지원금 변동 예상 및 스팟 타이밍 분석',
    content: '이통사 내부 마케팅 정책 변동 동향 보고서입니다. 신규 플래그십 출시를 앞두고 구형 재고 소진용 사전 보조금 변동 추이를 기반으로 분석해 본 결과, 이번 주말 스팟 대란이 가장 기대되는 타이밍입니다.',
    is_anonymous: false,
    upvotes: 67,
    view_count: 2120
  },

  // 3. 익명게시판 (anonymous)
  {
    board_slug: 'anonymous',
    title: '아 진짜 폰 바꾸고 싶은데 와이프 몰래 바꾸는 방법 없냐',
    content: '지금 갤럭시 S21 쓰고있는데 너무 느려져서 진짜 기기변경하고 싶거든... 근데 등짝 스매싱각이라 현명하게 와이프 몰래 무사히 지를 수 있는 꼼수 아는 형들 꿀팁 좀 공유해 줘.',
    is_anonymous: true,
    upvotes: 15,
    view_count: 420
  },
  {
    board_slug: 'anonymous',
    title: '퇴근길 지하철에서 액정 깨먹었다 ㅠㅠ',
    content: '사람이 너무 많아서 복잡한 틈에 밀리다가 주머니에서 툭 떨어졌는데 모서리부터 수직 낙하했어... 보험도 안 들어놨는데 수리비 폭탄 각이다 하... 퇴근길에 멘탈 바사삭.',
    is_anonymous: true,
    upvotes: 11,
    view_count: 310
  },

  // 4. 좌표요청게시판 (coordinate)
  {
    board_slug: 'coordinate',
    title: '[강남/역삼] 갤럭시 S26 기변 좋은 조건 좌표 정보 공유 부탁드립니다.',
    content: 'SK 기기변경으로 온가족할인 묶여있어서 무조건 기변으로 진행해야 합니다. 당일 조건 괜찮은 대리점 정보 아시는 분 쪽지나 댓글로 공유 좀 간절히 부탁드립니다!',
    is_anonymous: false,
    upvotes: 8,
    view_count: 215
  },
  {
    board_slug: 'coordinate',
    title: '[부천/중동] 아이폰 17 번이 24 요금제 조건 좋은 성지 있나요?',
    content: '번호이동으로 기기 변경하려는데 중동 현대백화점 인근에 괜찮은 당일 단가표 나오는 대리점 매장 있으면 좌표 공유 요청드립니다.',
    is_anonymous: false,
    upvotes: 5,
    view_count: 180
  },

  // 5. 질문/답변게시판 (qna)
  {
    board_slug: 'qna',
    title: '성지 은어 중에서 \'징\'이랑 \'차비\'가 정확히 무슨 뜻인가요?',
    content: '초보라 성지 단가표를 보는데 통 알아듣기 힘든 단어들이 많네요. 징이 얼마고 차비가 얼마라는 게 현금지원금이나 차액 페이백을 뜻하는 건가요? 정확한 개념 설명 부탁드립니다.',
    is_anonymous: false,
    upvotes: 14,
    view_count: 530
  },
  {
    board_slug: 'qna',
    title: '알뜰폰 번호이동 시 남은 약정 위약금은 어떻게 처리되나요?',
    content: '기존 통신사 약정이 3달 정도 남았는데 지금 알뜰폰으로 넘어가면 위약금 고지서가 다음 달 요금에 합산되어서 청구되는지 아니면 기존 통신사에서 따로 청구되는지 궁금합니다.',
    is_anonymous: false,
    upvotes: 9,
    view_count: 312
  }
]

async function insertDummyPosts() {
  console.log('=== 모든 게시판에 리얼 더미 데이터 인서트 시작 (anon_tag 제외) ===\n')

  try {
    // 1. 게시판 슬러그 -> ID 매핑 조회
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('id, slug')

    if (boardsError) throw boardsError

    const boardMap = {}
    boards.forEach(b => {
      boardMap[b.slug] = b.id
    })

    // 2. 더미 유저 조회 (최초의 한 유저를 글쓴이 ID로 설정)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (profileError) throw profileError

    if (profiles.length === 0) {
      console.error('-> 등록된 유저 프로필이 전혀 없습니다. 먼저 한 명 이상 가입되어 있어야 글 작성이 가능합니다.')
      process.exit(1)
    }

    const dummyAuthorId = profiles[0].id
    console.log(`-> 대표 작성자 ID 매핑 완료: ${dummyAuthorId}`)

    // 3. 더미 글 데이터 INSERT 루프
    const insertData = DUMMY_POSTS.map(p => {
      const boardId = boardMap[p.board_slug]
      if (!boardId) {
        console.warn(`[경고] 슬러그가 ${p.board_slug}인 게시판을 찾을 수 없어 건너뜁니다.`)
        return null
      }

      return {
        board_id: boardId,
        author_id: dummyAuthorId,
        title: p.title,
        content: p.content,
        is_anonymous: p.is_anonymous,
        upvotes: p.upvotes,
        view_count: p.view_count,
        created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString() // 최근 3일 이내 랜덤 시간
      }
    }).filter(Boolean)

    const { data: insertedPosts, error: insertError } = await supabase
      .from('posts')
      .insert(insertData)
      .select()

    if (insertError) throw insertError

    console.log(`\n-> [성공] 총 ${insertedPosts.length}개의 리얼 휴대폰 대란 더미 게시물이 성공적으로 DB에 등록되었습니다!`)
  } catch (error) {
    console.error('-> [에러 발생] 더미 데이터 인서트 실패:', error)
    process.exit(1)
  }
}

insertDummyPosts()
