'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  PenTool, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  X, 
  HelpCircle,
  Megaphone
} from 'lucide-react'
import { createPost } from '@/lib/actions/post'
import { htmlToText, looksLikeHtml } from '@/lib/sanitize-html'

interface InquiryPost {
  id: string
  title: string
  content: string
  created_at: string
  comment_count: number
  comments: any[]
}

interface InquiryBoardProps {
  initialPosts: InquiryPost[]
  boardId: number
  activeTab: string
}

const CATEGORIES = [
  { id: 'all', name: '전체' },
  { id: 'advertise', name: '제휴/광고문의' },
  { id: 'terms', name: '이용/계정문의' },
  { id: 'privacy', name: '개인정보문의' },
  { id: 'infringement', name: '권리침해신고' },
  { id: 'contact', name: '일반문의/건의' }
]

export default function InquiryBoard({ initialPosts, boardId, activeTab }: InquiryBoardProps) {
  const router = useRouter()
  const [filter, setFilter] = useState(activeTab === 'terms' ? 'terms' : activeTab === 'privacy' ? 'privacy' : activeTab === 'infringement' ? 'infringement' : activeTab === 'advertise' ? 'advertise' : activeTab === 'contact' ? 'contact' : 'all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // 글쓰기 창 토글 및 입력 폼 상태
  const [showWriteModal, setShowWriteModal] = useState(false)
  const [writeCategory, setWriteCategory] = useState(filter === 'all' ? 'contact' : filter)
  const [subject, setSubject] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [bodyContent, setBodyContent] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  // 제목에서 분류 접두사 및 순수 제목 분리 파싱
  const parsePost = (post: InquiryPost) => {
    const match = post.title.match(/^\[(.*?)\]\s*(.*)$/)
    if (match) {
      return {
        categoryKey: CATEGORIES.find(c => c.name === match[1])?.id || 'contact',
        categoryName: match[1],
        pureTitle: match[2]
      }
    }
    return {
      categoryKey: 'contact',
      categoryName: '일반문의/건의',
      pureTitle: post.title
    }
  }

  // 필터링 적용
  const filteredPosts = initialPosts.filter(p => {
    if (filter === 'all') return true
    const parsed = parsePost(p)
    return parsed.categoryKey === filter
  })

  // 아코디언 토글
  const toggleExpand = (postId: string) => {
    setExpandedId(prev => (prev === postId ? null : postId))
  }

  // 등록 제출 핸들러
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (subject.trim().length < 2) {
      setErrorMsg('제목은 최소 2자 이상 입력해야 합니다.')
      return
    }
    if (!email.trim()) {
      setErrorMsg('회신받을 이메일 주소는 필수 입력 사항입니다.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('올바른 이메일 형식을 입력해 주세요.')
      return
    }

    // 본문 내용 포맷팅 조립 (이메일은 필수, 나머지는 미필수 처리)
    const formattedContent = `업체명 : ${companyName.trim() || '미기재'}
담당자분 성함 : ${contactName.trim() || '미기재'}
회신받을 휴대폰번호 : ${phone.trim() || '미기재'}
이메일 : ${email.trim()}
내용 : ${bodyContent.trim() || '내용 없음'}`

    const catName = CATEGORIES.find(c => c.id === writeCategory)?.name || '일반문의/건의'
    const fullTitle = `[${catName}] ${subject.trim()}`

    const formData = new FormData()
    formData.append('boardId', String(boardId))
    formData.append('boardSlug', 'inquiry')
    formData.append('title', fullTitle)
    formData.append('content', formattedContent)
    formData.append('isAnonymous', 'false')

    startTransition(async () => {
      try {
        const res = await createPost(null, formData)
        if (res && res.error) {
          setErrorMsg(res.error)
        } else {
          // 등록 성공 시 모달 초기화 및 화면 갱신
          setSubject('')
          setCompanyName('')
          setContactName('')
          setPhone('')
          setEmail('')
          setBodyContent('')
          setShowWriteModal(false)
          router.refresh()
        }
      } catch (err) {
        setErrorMsg('글 등록 중 오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="space-y-6">
      
      {/* 분류 필터 탭 (알고사 스타일의 상단 필터바) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-4 overflow-x-auto scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap ${
              filter === cat.id
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/20'
                : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 작성 버튼 및 안내 바 */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] text-slate-500 font-bold">
          건의/문의 내역 <b className="text-purple-400 tabular-nums">{filteredPosts.length}</b>건
        </p>
        <button
          onClick={() => {
            setWriteCategory(filter === 'all' ? 'contact' : filter)
            setShowWriteModal(true)
          }}
          className="flex items-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 px-4 py-2.5 text-xs font-bold text-white transition shadow-md shadow-purple-950/10 shrink-0"
        >
          <PenTool className="h-3.5 w-3.5" />
          <span>문의하기</span>
        </button>
      </div>

      {/* 게시판 리스트 테이블 (알고사 비밀 문의게시판 스타일) */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 font-black text-slate-400">
                <th className="px-4 py-3 text-center w-16">번호</th>
                <th className="px-4 py-3 w-28">분류</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3 w-24 text-center">작성일</th>
                <th className="px-4 py-3 w-24 text-center">답변여부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold">
              
              {/* 상단 상시 고정 공지 행 */}
              <tr className="bg-purple-950/10 border-b border-slate-800/80 text-purple-200 font-bold">
                <td className="px-4 py-4.5 text-center shrink-0">
                  <span className="rounded bg-purple-900/50 border border-purple-800/60 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-purple-300">
                    공지
                  </span>
                </td>
                <td className="px-4 py-4.5 text-slate-400 font-bold">건의/문의</td>
                <td className="px-4 py-4.5 flex items-center gap-2 min-w-0">
                  <Megaphone className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="truncate text-slate-200">건의/문의사항을 남겨주세요. 본인이 작성한 글만 보입니다.</span>
                </td>
                <td className="px-4 py-4.5 text-center text-slate-500 font-medium">-</td>
                <td className="px-4 py-4.5 text-center font-medium text-slate-500">-</td>
              </tr>

              {/* 목록 루프 */}
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500 text-xs">
                    접수된 {CATEGORIES.find(c => c.id === filter)?.name} 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post, index) => {
                  const isExpanded = expandedId === post.id
                  const parsed = parsePost(post)
                  const createdDate = new Date(post.created_at)
                  
                  // 관리자 답변이 있으면 완료, 없으면 대기 (comments 테이블에 댓글이 작성되었는지 판별)
                  const hasAnswer = post.comment_count > 0

                  return (
                    <Fragment key={post.id}>
                      {/* 게시글 행 */}
                      <tr 
                        onClick={() => toggleExpand(post.id)}
                        className={`hover:bg-slate-900/30 cursor-pointer transition ${isExpanded ? 'bg-slate-900/20' : ''}`}
                      >
                        <td className="px-4 py-4 text-center text-slate-500 tabular-nums">
                          {filteredPosts.length - index}
                        </td>
                        <td className="px-4 py-4 text-slate-400 font-bold">
                          {parsed.categoryName}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <span className={`truncate text-sm ${isExpanded ? 'text-purple-400 font-black' : 'text-slate-100 hover:text-purple-400'}`}>
                              {parsed.pureTitle}
                            </span>
                            {post.comment_count > 0 && (
                              <span className="text-[10px] rounded bg-purple-950/30 border border-purple-900/40 px-1 py-0.2 text-purple-400 tabular-nums font-black">
                                {post.comment_count}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-500 tabular-nums font-medium">
                          {createdDate.getFullYear().toString().slice(2)}.{String(createdDate.getMonth() + 1).padStart(2, '0')}.{String(createdDate.getDate()).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {hasAnswer ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/20 border border-emerald-900/60 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              답변완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-800 border border-slate-700/60 px-2 py-0.5 text-[10px] font-black text-slate-400">
                              <Clock className="h-3 w-3" />
                              접수대기
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* 아코디언 질문/답변 본문 펼침 행 */}
                      {isExpanded && (
                        <tr className="bg-slate-900/10 border-t border-b border-slate-800/80">
                          <td colSpan={5} className="px-6 py-5 bg-slate-950/30 space-y-5">
                            {/* 질문 본문 */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 uppercase">
                                <HelpCircle className="h-4 w-4 text-purple-400" />
                                <span>나의 문의 내용</span>
                              </div>
                              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-200 text-xs whitespace-pre-wrap leading-relaxed">
                                {looksLikeHtml(post.content) ? htmlToText(post.content) : post.content}
                              </div>
                            </div>

                            {/* 관리자 답변 */}
                            <div className="space-y-2 border-t border-slate-800/50 pt-4">
                              <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 uppercase">
                                <span className="h-4.5 w-4.5 rounded bg-purple-900/60 text-purple-300 font-extrabold text-[9px] flex items-center justify-center border border-purple-800/60">
                                  A
                                </span>
                                <span>운영진 답변</span>
                              </div>

                              {hasAnswer ? (
                                <div className="space-y-4">
                                  {post.comments.map((comment: any) => (
                                    <div key={comment.id} className="rounded-xl border border-purple-900/40 bg-purple-950/10 p-4 space-y-1.5">
                                      <p className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
                                        {comment.content}
                                      </p>
                                      <p className="text-[9px] text-purple-400/80 font-bold tabular-nums">
                                        답변등록일: {new Date(comment.created_at).toLocaleString('ko-KR')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-xs text-slate-500 font-medium">
                                  소중한 문의가 접수되었습니다. 운영팀 담당 부서에서 내용을 면밀히 확인 중이며,<br />
                                  영업일 기준 평균 12~24시간 이내에 이곳에 성실한 공식 답변을 등록해 드립니다.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* [쓰기] 서랍형 글쓰기 모달 창 */}
      {showWriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300 min-h-0">
            {/* 스크롤 가능한 본문 영역 */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent min-h-0">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6 sticky top-0 bg-slate-900 z-10">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-purple-400" />
                  <span>1:1 문의 작성하기</span>
                </h3>
                <button
                  onClick={() => setShowWriteModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 작성 폼 */}
              <form onSubmit={handleFormSubmit} className="space-y-4 pb-4">
                <div className="space-y-1.5">
                  <label htmlFor="writeCategory" className="text-[11px] font-black text-slate-400">문의 분류</label>
                  <select
                    id="writeCategory"
                    value={writeCategory}
                    onChange={(e) => setWriteCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-850 px-4 py-3 text-xs text-slate-100 focus:border-purple-600 focus:outline-none transition font-semibold"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                    <span>문의 제목</span>
                    <span className="text-[9px] text-rose-400 bg-rose-950/30 border border-rose-900/40 px-1.5 py-0.2 rounded font-black">* 필수</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="문의 내용을 요약하는 제목을 적어주세요."
                    className="w-full rounded-xl border border-slate-800 bg-slate-850 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-650 focus:border-purple-600 focus:outline-none transition font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="text-[11px] font-black text-slate-400">업체명 <span className="text-slate-500 font-bold text-[9px]">(선택)</span></label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="업체명을 입력해 주세요."
                    className="w-full rounded-xl border border-slate-800 bg-slate-850 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-650 focus:border-purple-600 focus:outline-none transition font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contactName" className="text-[11px] font-black text-slate-400">담당자분 성함 <span className="text-slate-500 font-bold text-[9px]">(선택)</span></label>
                  <input
                    id="contactName"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="담당자분의 이름을 입력해 주세요."
                    className="w-full rounded-xl border border-slate-800 bg-slate-850 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-650 focus:border-purple-600 focus:outline-none transition font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-[11px] font-black text-slate-400">회신받을 휴대폰번호 <span className="text-slate-500 font-bold text-[9px]">(선택)</span></label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className="w-full rounded-xl border border-slate-800 bg-slate-850 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-650 focus:border-purple-600 focus:outline-none transition font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                    <span>이메일</span>
                    <span className="text-[9px] text-rose-400 bg-rose-950/30 border border-rose-900/40 px-1.5 py-0.2 rounded font-black">* 필수</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="회신받으실 이메일 주소를 입력해 주세요."
                    className="w-full rounded-xl border border-slate-800 bg-slate-850 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-650 focus:border-purple-600 focus:outline-none transition font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bodyContent" className="text-[11px] font-black text-slate-400">내용 <span className="text-slate-500 font-bold text-[9px]">(선택)</span></label>
                  <textarea
                    id="bodyContent"
                    rows={6}
                    value={bodyContent}
                    onChange={(e) => setBodyContent(e.target.value)}
                    placeholder="문의 또는 건의하실 구체적인 내용을 적어주세요."
                    className="w-full rounded-xl border border-slate-800 bg-slate-850 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-650 focus:border-purple-600 focus:outline-none transition resize-none leading-relaxed font-semibold"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs text-rose-500 font-bold bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg break-all">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 px-5 py-3.5 text-xs font-bold text-white transition disabled:bg-slate-800 disabled:text-slate-500 shadow-md shadow-purple-950/20 mt-4"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>등록 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>문의 등록 완료</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 고정 푸터 경고 */}
            <div className="text-[10px] text-slate-500 font-bold text-center leading-normal mt-6 border-t border-slate-800/80 pt-4 shrink-0 bg-slate-900">
              * 기만 방어 규약에 의해 허위 비방 목적의 접수 등록 시<br />
              사이트 영구 정지 처벌을 수반할 수 있습니다.
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
