'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Post {
  id: string
  title: string
  created_at: string
  comment_count: number
  upvotes: number
  board_slug: string
  board_name: string
  author_name: string
  author_username?: string | null
  is_anonymous?: boolean
}

interface MainTabbedFeedProps {
  initialPosts: Post[]
}

const TABS = [
  { id: "all", name: "지금 인기" },
  { id: "info", name: "정보공유" },
  { id: "qna", name: "질문답변" },
  { id: "free", name: "자유" },
  { id: "anonymous", name: "익명" },
  { id: "coordinate", name: "시세표" },
]

export default function MainTabbedFeed({ initialPosts }: MainTabbedFeedProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 8 // 아이보스 홈 피드와 같은 8줄

  // 탭 필터링 및 정렬 규칙 보정
  const getFilteredAndSortedPosts = () => {
    if (activeTab === 'all') {
      // 1. 최근 24시간 이내 글 필터링
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentPosts = initialPosts.filter(p => new Date(p.created_at) >= yesterday)
      
      // 2. 추천수(upvotes) 내림차순 정렬 (2차 정렬은 최신순)
      recentPosts.sort((a, b) => {
        if ((b.upvotes || 0) !== (a.upvotes || 0)) {
          return (b.upvotes || 0) - (a.upvotes || 0)
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      if (recentPosts.length >= 10) {
        return recentPosts
      }

      // 3. 모수가 부족할 경우 전체 기간 추천수(upvotes) 내림차순으로 추가 결합
      const existingIds = recentPosts.map(p => p.id)
      const olderPosts = initialPosts
        .filter(p => !existingIds.includes(p.id))
        .sort((a, b) => {
          if ((b.upvotes || 0) !== (a.upvotes || 0)) {
            return (b.upvotes || 0) - (a.upvotes || 0)
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

      return [...recentPosts, ...olderPosts]
    } else {
      // 개별 카테고리 탭은 최신 업로드일 순으로 내림차순 정렬
      return initialPosts
        .filter(p => p.board_slug === activeTab)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }

  const filteredPosts = getFilteredAndSortedPosts()

  // 페이지네이션 연산
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1
  const indexOfLastPost = currentPage * postsPerPage
  const indexOfFirstPost = indexOfLastPost - postsPerPage
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost)

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMins < 60 && diffHrs < 1) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    if (diffHrs < 24) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`
  }

  const isToday = (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString()

  // 아이보스 홈 피드 카드: 패딩 30, 탭 17px bold(#AAA→검정), 행 33px(분류 14px #999 · 제목 16px · 댓글수 12px 보라 · 시간)
  return (
    <section className="rounded-lg bg-white px-5 pt-6 sm:px-[30px] sm:pt-[30px] dark:bg-[#111827]">
      <ul className="flex gap-[26px] overflow-x-auto [scrollbar-width:none]" role="tablist">
        {TABS.map(tab => (
          <li key={tab.id} className="shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1)
              }}
              className={`text-[17px] font-bold leading-5 transition ${
                activeTab === tab.id ? "text-black dark:text-white" : "text-[#AAA] hover:text-[#666] dark:text-slate-500 dark:hover:text-slate-300"
              }`}
            >
              {tab.name}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 min-h-[264px]">
        {currentPosts.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-[#AAA]">아직 글이 없습니다.</div>
        ) : (
          <ul>
            {currentPosts.map(post => (
              <li key={post.id} className="flex h-[33px] items-center gap-3">
                <span className="w-[80px] shrink-0 truncate text-[14px] text-[#999]">{post.board_name}</span>
                <div className="flex min-w-0 flex-1 items-center">
                  <Link
                    href={`/board/${post.board_slug}/${post.id}`}
                    className="truncate text-[16px] tracking-[-0.4px] text-black hover:underline dark:text-slate-100"
                  >
                    {post.title}
                  </Link>
                  {post.comment_count > 0 && (
                    <span className="ml-1.5 shrink-0 text-[12px] font-bold tracking-[-0.5px] text-[#4E07D2] dark:text-[#A78BFA]">{post.comment_count}</span>
                  )}
                </div>
                <span className="hidden w-[110px] shrink-0 truncate text-[13px] text-[#888] sm:block">
                  {post.author_username && !post.is_anonymous ? (
                    <Link href={`/u/${post.author_username}`} className="hover:underline">{post.author_name}</Link>
                  ) : (
                    post.author_name
                  )}
                </span>
                <span className={`w-[42px] shrink-0 text-right text-[12px] tracking-[-0.5px] ${isToday(post.created_at) ? "font-medium text-[#4E07D2] dark:text-[#A78BFA]" : "text-[#454545] dark:text-slate-400"}`}>
                  {formatTime(post.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 하단 페이저 (아이보스: < 7 / 8 >) */}
      <div className="mt-3 flex h-[49px] items-center justify-center gap-4 border-t border-[#F0F1F3] text-[14px] font-bold dark:border-slate-800">
        <button
          type="button"
          aria-label="이전 페이지"
          onClick={() => handlePageChange("prev")}
          disabled={currentPage === 1}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E5E5E5] text-[#666] disabled:opacity-40 dark:border-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums text-black dark:text-white">
          {currentPage} <span className="font-normal text-[#AAA]">/ {totalPages}</span>
        </span>
        <button
          type="button"
          aria-label="다음 페이지"
          onClick={() => handlePageChange("next")}
          disabled={currentPage === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E5E5E5] text-[#666] disabled:opacity-40 dark:border-slate-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
