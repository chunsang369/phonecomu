import Link from 'next/link'
import SiteHeader from '@/components/layout/site-header'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { 
  FileText, 
  Mail, 
  AlertTriangle, 
  HelpCircle, 
  UserCheck, 
  LockKeyhole,
  LogIn
} from 'lucide-react'
import { getCurrentProfile } from '@/lib/auth/session'
import { q } from '@/lib/db'
import { getBoardBySlug } from '@/lib/queries/board'
import Footer from '@/components/ui/footer'
import InquiryBoard from './inquiry-board'
import TermsViewer from './terms-viewer'

interface PageProps {
  params: Promise<{ tab: string }>
}

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

const TABS = [
  { id: 'advertise', name: '광고문의', icon: Mail, desc: '배너 및 제휴 파트너십 문의' },
  { id: 'terms', name: '이용약관 및 개인정보 처리방침', icon: FileText, desc: '이용약관 및 개인정보 처리방침 전문' },
  { id: 'infringement', name: '권리침해신고', icon: AlertTriangle, desc: '저작권 및 명예훼손 권리 구제' },
  { id: 'contact', name: '문의/건의사항', icon: HelpCircle, desc: '서비스 이용 불편 및 제안 접수' }
]

export async function generateStaticParams() {
  return [...TABS.map((t) => ({ tab: t.id })), { tab: 'privacy' }]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tab } = await params
  const resolvedTab = tab === 'privacy' ? 'terms' : tab
  const currentTab = TABS.find((t) => t.id === resolvedTab)
  if (!currentTab) return { title: '지원 센터' }

  return {
    title: `${currentTab.name} | ${SITE} 고객지원 센터`,
    description: `${SITE}의 ${currentTab.name} 및 안내 페이지입니다.`,
    robots: { index: false, follow: true }
  }
}

export default async function SupportPage({ params }: PageProps) {
  const { tab } = await params
  
  // privacy로 진입할 경우 terms로 내부 리라우팅 처리
  const resolvedTab = tab === 'privacy' ? 'terms' : tab
  const currentTab = TABS.find((t) => t.id === resolvedTab)
  if (!currentTab) notFound()

  // 1. 로그인 유저 및 게시판 조회
  const me = await getCurrentProfile()
  const user = me ? { id: me.id } : null
  const inquiryBoard = await getBoardBySlug('inquiry')

  // 2. 1:1 비밀 문의 글과 답변(댓글). 스태프는 전체, 그 외에는 본인 글만.
  let userInquiries: any[] = []
  if (me && inquiryBoard) {
    const isStaff = ['admin', 'moderator'].includes(me.role)
    const posts = await q<{ id: string; title: string; content: string; created_at: string; author_id: string }>(
      `select id, title, content, created_at, author_id from posts
        where board_id = $1 and status = 'published' and ($2 or author_id = $3)
        order by created_at desc`,
      [inquiryBoard.id, isStaff, me.id],
    ).catch(() => [] as { id: string; title: string; content: string; created_at: string; author_id: string }[])

    if (posts.length > 0) {
      const comments = await q<{ id: string; post_id: string; content: string; created_at: string }>(
        `select id, post_id, content, created_at from comments
          where post_id = any($1::uuid[]) and status = 'published'
          order by created_at asc`,
        [posts.map((p) => p.id)],
      ).catch(() => [] as { id: string; post_id: string; content: string; created_at: string }[])

      const commentsMap = new Map<string, typeof comments>()
      comments.forEach((c) => {
        if (!commentsMap.has(c.post_id)) commentsMap.set(c.post_id, [])
        commentsMap.get(c.post_id)!.push(c)
      })

      userInquiries = posts.map((p) => ({
        ...p,
        // 이전 버전에서 제목에 붙던 [by:...] 꼬리표 제거
        title: p.title.replace(/s*[by:[^]]+]$/, ''),
        comment_count: commentsMap.get(p.id)?.length || 0,
        comments: commentsMap.get(p.id) || [],
      }))
    }
  }

  // 로그인 필수 탭 여부
  const isAuthRequired = ['advertise', 'infringement', 'contact'].includes(resolvedTab)

  return (
    <>
    <SiteHeader />
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 w-full flex-1">
        {/* 상단 브레드크럼 */}
        <nav className="text-xs text-slate-500 font-bold mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:text-slate-300">홈</Link>
          <span>&gt;</span>
          <span className="text-slate-300">고객지원 센터</span>
          <span>&gt;</span>
          <span className="text-purple-400 font-extrabold">{currentTab.name}</span>
        </nav>

        <h1 className="text-3xl font-black tracking-tight mb-8 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          고객지원 센터 <span className="text-sm font-bold text-slate-500 ml-2">Support & Policies Center</span>
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* 좌측 사이드바 탭 메뉴 */}
          <aside className="lg:col-span-4 space-y-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
              <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-wider px-3 mb-2">메뉴 가이드</h2>
              {TABS.map((t) => {
                const Icon = t.icon
                const isActive = t.id === resolvedTab
                return (
                  <Link
                    key={t.id}
                    href={`/support/${t.id}`}
                    className={`flex items-center gap-3 px-3.5 py-3.5 rounded-xl border transition-all duration-200 ${
                      isActive 
                        ? 'bg-purple-900/40 text-purple-200 border-purple-800/80 shadow-md shadow-purple-950/20' 
                        : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:border-slate-800/60'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                    <div className="text-left">
                      <p className="text-xs font-black leading-none">{t.name}</p>
                      <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-none">{t.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </aside>

          {/* 우측 콘텐츠 영역 */}
          <section className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-md min-h-[500px]">
              
              {/* 비로그인 유저가 1:1 비밀 게시판 접근 시 로그인 유도 표시 */}
              {isAuthRequired && !user ? (
                <div className="flex flex-col items-center justify-center text-center py-20 space-y-6">
                  <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                    <LockKeyhole className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white">로그인이 필요합니다</h3>
                    <p className="text-xs text-slate-500 max-w-sm font-semibold leading-relaxed">
                      1:1 비밀 문의게시판은 본인이 작성한 건의사항만 노출되도록 철저히 격리 보호되는 안심 서비스입니다. 로그인을 하시면 즉시 작성 및 조회가 가능합니다.
                    </p>
                  </div>
                  <Link
                    href={`/login?returnTo=/support/${resolvedTab}`}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 px-6 py-3 text-xs font-bold text-white transition shadow-md shadow-purple-950/20"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>로그인 페이지로 이동</span>
                  </Link>
                </div>
              ) : (
                <>
                  {/* [1] 이용약관 및 개인정보 처리방침 통합 토글 뷰어 */}
                  {resolvedTab === 'terms' && (
                    <TermsViewer />
                  )}

                  {/* [2] 비밀게시판 형식을 따르는 문의 탭들 (InquiryBoard 마운트) */}
                  {['advertise', 'infringement', 'contact'].includes(resolvedTab) && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-slate-850 pb-3">
                        <UserCheck className="h-5 w-5 text-purple-400" />
                        <span>{currentTab.name} 비밀 문의판</span>
                      </h3>
                      
                      {/* 알고사 스타일 1:1 비밀게시판 컴포넌트 마운트 */}
                      <InquiryBoard 
                        initialPosts={userInquiries} 
                        boardId={inquiryBoard?.id || 9999} 
                        activeTab={resolvedTab}
                      />
                    </div>
                  )}
                </>
              )}

            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
    </>
  )
}
