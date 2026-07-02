import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAllBoards } from '@/lib/queries/board'
import { getPostsByBoard } from '@/lib/queries/post'
import AttendanceButton from '@/components/ui/attendance-button'
import MainTabbedFeed from '@/components/ui/main-tabbed-feed'
import TrendingKeywords from '@/components/ui/trending-keywords'
import Footer from '@/components/ui/footer'
import { 
  Search, 
  User, 
  Bell, 
  MessageSquare, 
  Award, 
  Calendar, 
  ChevronRight, 
  Megaphone, 
  PenTool,
  Clock,
  Sparkles,
  HelpCircle,
  Smartphone,
  Info,
  MapPin,
  TrendingUp,
  Zap,
  Calculator,
  ChevronDown
} from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()

  // 1. 세션 사용자 및 프로필 데이터 취득
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let hasAttendedToday = false
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = prof

    const todayStr = new Date().toISOString().split('T')[0]
    const { data: att } = await supabase
      .from('attendance')
      .select('day')
      .eq('user_id', user.id)
      .eq('day', todayStr)
      .maybeSingle()
    hasAttendedToday = !!att
  }

  // 2. 전체 게시판 데이터 조회
  const allBoards = await getAllBoards()
  // 자유, 정보, 익명, 좌표, 질문/답변 게시판 필터링 (free, info, anonymous, coordinate, qna)
  const boards = allBoards.filter(b => ['free', 'info', 'anonymous', 'coordinate', 'qna'].includes(b.slug))

  // 3. 통합 피드 조립
  const allPostsPromises = boards.map(async (b) => {
    const posts = await getPostsByBoard(b.id, 10)
    return posts.map(p => ({
      id: p.id,
      title: p.title,
      created_at: p.created_at,
      comment_count: p.comment_count,
      upvotes: p.upvotes,
      board_slug: b.slug,
      board_name: b.name,
      author_name: p.is_anonymous ? (p.anon_tag || '익명') : (p.author?.display_name || '성지멤버')
    }))
  })
  
  const resolvedPosts = await Promise.all(allPostsPromises)
  const unifiedPosts = resolvedPosts.flat().sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // 4. 로그아웃 액션
  const handleLogout = async () => {
    'use server'
    const client = await createClient()
    await client.auth.signOut()
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0B0F19] text-[#1E293B] dark:text-[#E2E8F0] font-sans antialiased">
      
      {/* 1. 최상단 블랙/차콜 어두운 탭 바 (심플하게 정리) */}
      <div className="bg-[#2D2F34] text-[#B0B3B8] text-xs font-bold py-2 px-4 dark:bg-[#111317]">
        <div className="mx-auto max-w-7xl flex items-center gap-6 overflow-x-auto">
          <Link href="/" className="text-white font-extrabold pr-4 border-r border-slate-600">폰커뮤니티</Link>
          <Link href="/board/info" className="hover:text-white transition">정보게시판</Link>
          <Link href="/board/free" className="hover:text-white transition">자유게시판</Link>
          <Link href="/board/anonymous" className="hover:text-white transition">익명게시판</Link>
          <Link href="/board/coordinate" className="hover:text-white transition">지역별 시세표</Link>
          <Link href="/board/qna" className="hover:text-white transition">질문/답변게시판</Link>
        </div>
      </div>

      {/* 2단 프리미엄 헤더 GNB */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white shadow-sm dark:bg-[#111827] dark:border-[#1F2937]">
        
        {/* 상단 메인 헤더 (로고, 실시간 인기검색어, 검색바, 글쓰기 버튼) */}
        <div className="mx-auto flex h-20 items-center justify-between px-4 sm:px-6 max-w-7xl gap-6">
          <div className="flex items-center gap-6 flex-1">
            <Link href="/" className="text-2xl font-black text-[#1A1D24] dark:text-[#F3F4F6] tracking-tight shrink-0 flex items-center gap-1">
              <Smartphone className="h-6 w-6 text-[#7C3AED]" />
              <span>{siteName.toUpperCase()}</span>
            </Link>

            {/* 실시간 인기 키워드 3초 롤링 컴포넌트 마운트 */}
            <TrendingKeywords />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* 돋보기 아이콘이 들어간 모던 인풋창 */}
            <div className="relative max-w-[180px] sm:max-w-xs w-full">
              <input
                type="text"
                placeholder="검색"
                className="w-full rounded border border-[#CBD5E1] bg-white pl-3 pr-8 py-1.5 text-xs focus:border-[#7C3AED] focus:outline-none dark:border-[#374151] dark:bg-[#1F2937] dark:text-[#F3F4F6]"
              />
              <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8] cursor-pointer" />
            </div>

            {user ? (
              <Link
                href="/write/free"
                className="flex items-center gap-1 rounded bg-[#7C3AED] px-5 py-2 text-xs font-bold text-white hover:bg-[#6D28D9] transition whitespace-nowrap shrink-0"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>글쓰기</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded bg-[#7C3AED] px-5 py-2 text-xs font-bold text-white hover:bg-[#6D28D9] transition whitespace-nowrap shrink-0"
              >
                로그인
              </Link>
            )}
          </div>
        </div>

        {/* 하단 카테고리 LNB (익명, 정보, 자유 제외 올 은닉) */}
        <div className="border-t border-[#F1F5F9] bg-[#FAFBFD] dark:bg-[#0F172A] dark:border-[#1F2937] relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <nav className="flex items-center gap-6 text-xs font-bold text-[#475569] dark:text-[#94A3B8]">
              
              <Link href="/" className="text-[#7C3AED] dark:text-[#A78BFA] border-b-2 border-[#7C3AED] dark:border-[#A78BFA] py-3 shrink-0">
                커뮤니티 홈
              </Link>

              {/* 자유, 정보, 익명 게시판만 명시적으로 나열 */}
              {boards.map((b) => (
                <Link
                  key={b.id}
                  href={`/board/${b.slug}`}
                  className="hover:text-[#7C3AED] dark:hover:text-[#A78BFA] py-3 shrink-0 transition"
                >
                  {b.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 그리드 */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        
        {/* 1. 상단 광고 배너 및 휴대폰 상식 퀴즈 배치 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* 가로형 대형 광고 배너 (휴대폰 대리점 성지 입점 매칭 안내) */}
          <div className="lg:col-span-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] border border-[#DCFCE7] p-8 dark:from-[#064E3B] dark:to-[#022C22] dark:border-[#047857] flex flex-col justify-center min-h-[160px]">
            <span className="inline-block rounded bg-[#10B981] px-2 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wider w-max">
              검증된 대리점과 유저의 직거래 공간
            </span>
            <h2 className="mt-3 text-lg sm:text-xl font-black text-[#065F46] dark:text-[#A7F3D0] leading-snug">
              전국 휴대폰 성지 대리점 입점 및 실시간 좌표 매칭 오픈 &rarr;
            </h2>
            <p className="mt-2 text-xs text-[#047857] dark:text-[#34D399]">
              허위 좌표와 제휴카드 상술을 배제한 깨끗한 단가 비교 시장을 중개해 드립니다.
            </p>
          </div>

          {/* 우측 휴대폰 상식 퀴즈 위젯 */}
          <div className="lg:col-span-4 rounded-2xl border border-[#E5E8EC] bg-white p-6 shadow-sm dark:bg-[#111827] dark:border-[#1F2937] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#7C3AED] dark:text-[#A78BFA]">휴대폰 구매 상식 퀴즈</span>
              <h4 className="mt-1 text-xs font-bold text-[#1A1D24] dark:text-white leading-relaxed">
                Q. 이번 달 갤럭시 플래그십 기종을 기기 변경할 때, 공시지원금과 선택약정(25% 요금할인) 중 어떤 것이 유리할까요?
              </h4>
            </div>
            <button className="mt-4 w-full rounded bg-[#7C3AED] py-2 text-xs font-bold text-white hover:bg-[#6D28D9] transition">
              퀴즈 풀기
            </button>
          </div>

        </div>

        {/* 2. 핵심 탭 피드 및 프로필 카드 레이아웃 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* 중앙 통합 탭 피드 (8컬럼) */}
          <div className="lg:col-span-8">
            <MainTabbedFeed initialPosts={unifiedPosts} />
          </div>

          {/* 우측 사이드바 (4컬럼) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 로그인 카드 */}
            <div className="rounded-2xl border border-[#E5E8EC] bg-white shadow-sm dark:bg-[#111827] dark:border-[#1F2937] overflow-hidden">
              {user ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full border border-slate-100 bg-[#FAF8FE] dark:bg-[#1E1B4B] overflow-hidden flex items-center justify-center font-bold text-[#7C3AED] text-lg">
                        {profile?.display_name ? profile.display_name.substring(0, 1) : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-extrabold text-[#1A1D24] dark:text-white">
                            {profile?.display_name || '성지회원님'}
                          </h4>
                          <span className="text-[9px] text-[#94A3B8]">@ {profile?.username || 'unknown'}</span>
                        </div>
                        <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>접속중</span>
                        </p>
                      </div>
                    </div>
                    
                    <form action={handleLogout}>
                      <button type="submit" className="rounded border border-[#CBD5E1] px-2.5 py-1 text-[9px] font-bold text-[#5B6472] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        로그아웃
                      </button>
                    </form>
                  </div>

                  {/* 3단 정보 칩 그리드 */}
                  <div className="grid grid-cols-3 gap-2.5 text-center text-[10px] font-bold">
                    <div className="rounded-lg bg-[#FAF8FE] py-2.5 border border-[#F5F3FF] dark:bg-[#1E1B4B]/20 dark:border-[#312E81]">
                      <p className="text-[#94A3B8]">활동 포인트</p>
                      <p className="mt-0.5 text-sm text-[#7C3AED] dark:text-[#A78BFA]">{profile?.activity_points || 0} 리터</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2.5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                      <p className="text-[#94A3B8]">작성글 수</p>
                      <p className="mt-0.5 text-sm text-[#1A1D24] dark:text-white">1 게시</p>
                    </div>
                    <div className="rounded-lg bg-[#F5F3FF]/10 py-2.5 border border-[#F5F3FF] dark:bg-[#1E1B4B]/20 dark:border-[#312E81]">
                      <p className="text-[#94A3B8]">회원 등급</p>
                      <p className="mt-0.5 text-sm text-[#7C3AED] dark:text-[#A78BFA]">LV.{profile?.level || 1}</p>
                    </div>
                  </div>

                  {/* 출석 체크 컴포넌트 마운트 */}
                  <AttendanceButton 
                    initialDays={profile?.attendance_days || 0} 
                    hasAttendedToday={hasAttendedToday} 
                  />

                  {/* 내 정보 바로가기 4탭 버튼 */}
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold text-[#5B6472] dark:text-[#94A3B8] border-t border-slate-100 pt-3 dark:border-[#1F2937]">
                    <Link href="/mypage" className="hover:text-[#7C3AED]">내글</Link>
                    <Link href="/mypage" className="hover:text-[#7C3AED]">내댓글</Link>
                    <Link href="/mypage" className="hover:text-[#7C3AED]">스크랩</Link>
                    <Link href="/mypage" className="hover:text-[#7C3AED]">출석현황</Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {/* 독자 브랜드 로고 배치 */}
                  <div className="text-center py-4 border-b border-[#E5E8EC] dark:border-[#1F2937]">
                    <span className="text-xl font-black tracking-tight text-[#1A1D24] dark:text-white uppercase">
                      {siteName} <span className="text-[#7C3AED] text-sm">LOGIN</span>
                    </span>
                  </div>

                  <Link
                    href="/login"
                    className="block w-full text-center rounded bg-[#7C3AED] py-3 text-xs font-bold text-white hover:bg-[#6D28D9] transition"
                  >
                    로그인
                  </Link>

                  {/* 로그인 카드 하단 3단 링크 */}
                  <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-2">
                    <Link href="/login" className="hover:text-[#7C3AED]">회원가입</Link>
                    <span>|</span>
                    <Link href="/login" className="hover:text-[#7C3AED]">아이디찾기</Link>
                    <span>|</span>
                    <Link href="/login" className="hover:text-[#7C3AED]">비밀번호찾기</Link>
                  </div>
                </div>
              )}
            </div>

            {/* 선택약정 vs 공시지원금 계산기 광고 배너 */}
            <div className="rounded-2xl bg-gradient-to-br from-[#EEF2F6] to-[#E2E8F0] p-6 border border-[#E2E8F0] dark:from-[#1E293B] dark:to-[#0F172A] dark:border-[#374151] relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[140px]">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white leading-snug">
                  선택약정 vs 공시지원금 계산기<br />가장 유리한 혜택 직접 비교
                </h4>
                <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  할부이자(5.9%)와 추가지원금 한도가 정밀 적용된 자동 계산기
                </p>
              </div>
              <Link href="/calculator" className="mt-4 rounded bg-[#1E293B] dark:bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white w-max text-center hover:bg-slate-700 dark:hover:bg-slate-700 transition">
                계산기 바로가기 &rarr;
              </Link>
            </div>

          </div>

        </div>

        {/* 3. 오늘 봐야 할 게시글 (휴대폰 썸네일 피드) */}
        <div className="rounded-2xl bg-[#1E293B] p-6 shadow-sm dark:bg-[#0F172A] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-[#A78BFA]" />
              <span>오늘 봐야 할 휴대폰 꿀팁</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              &lt; 1 / 5 &gt;
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            
            <div className="group relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700/60 p-4 hover:border-[#7C3AED] transition-all hover:-translate-y-0.5 duration-300">
              <div className="aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-indigo-900 to-purple-800 mb-3 flex items-center justify-center font-bold text-indigo-200 text-xs uppercase tracking-wider">
                성지 구매 가이드
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition line-clamp-2 leading-snug">
                호갱 탈출을 위한 휴대폰 성지 구매 절차 A to Z 가이드북
              </h4>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="h-4 w-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white">G</span>
                <span>성지가이드</span>
                <span>•</span>
                <span>6월 28일</span>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700/60 p-4 hover:border-[#7C3AED] transition-all hover:-translate-y-0.5 duration-300">
              <div className="aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-red-900 to-orange-800 mb-3 flex items-center justify-center font-bold text-red-200 text-xs uppercase tracking-wider">
                초성 은어 사전
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition line-clamp-2 leading-snug">
                성지 단가표 은어 및 카카오톡 대란방 필수 초성 약어 사전
              </h4>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="h-4 w-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white">S</span>
                <span>성지분석기</span>
                <span>•</span>
                <span>7월 01일</span>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700/60 p-4 hover:border-[#7C3AED] transition-all hover:-translate-y-0.5 duration-300">
              <div className="aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-green-900 to-emerald-800 mb-3 flex items-center justify-center font-bold text-green-200 text-xs uppercase tracking-wider">
                공시 연동 표
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition line-clamp-2 leading-snug">
                [통신 3사 실시간 연동] 7월 모델별 공시지원금 변동 리스트
              </h4>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="h-4 w-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white">T</span>
                <span>통신동향봇</span>
                <span>•</span>
                <span>6월 30일</span>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700/60 p-4 hover:border-[#7C3AED] transition-all hover:-translate-y-0.5 duration-300">
              <div className="aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-cyan-900 to-blue-800 mb-3 flex items-center justify-center font-bold text-cyan-200 text-xs uppercase tracking-wider">
                제휴카드 분석
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition line-clamp-2 leading-snug">
                제휴카드는 상술일까 아닐까? 실질 할인율과 필수 유의사항 정리
              </h4>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="h-4 w-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white">H</span>
                <span>호갱탈출러</span>
                <span>•</span>
                <span>6월 30일</span>
              </div>
            </div>

          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}
