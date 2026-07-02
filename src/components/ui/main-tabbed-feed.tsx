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
  { id: 'all', name: '지금 인기' },
  { id: 'free', name: '자유게시판' },
  { id: 'anonymous', name: '익명게시판' },
  { id: 'info', name: '정보게시판' },
  { id: 'notice', name: '공지사항' }
]

export default function MainTabbedFeed({ initialPosts }: MainTabbedFeedProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 8

  // 탭 필터링
  const filteredPosts = activeTab === 'all'
    ? initialPosts
    : initialPosts.filter(p => p.board_slug === activeTab)

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

    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHrs < 24) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-2xl border border-[#E5E8EC] bg-white p-6 shadow-sm dark:bg-[#111827] dark:border-[#1F2937]">
      {/* 탭 헤더 */}
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 dark:border-[#1F2937] overflow-x-auto">
        <div className="flex items-center gap-5 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1)
              }}
              className={`pb-2 text-sm font-extrabold transition relative ${
                activeTab === tab.id
                  ? 'text-[#7C3AED] dark:text-[#A78BFA]'
                  : 'text-[#5B6472] hover:text-[#1A1D24] dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              <span>{tab.name}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#7C3AED] dark:bg-[#A78BFA]" />
              )}
            </button>
          ))}
        </div>
        
        {/* 미니 페이지네이션 */}
        <div className="flex items-center gap-3 shrink-0 pl-4 text-xs font-bold text-[#94A3B8]">
          <button 
            onClick={() => handlePageChange('prev')}
            disabled={currentPage === 1}
            className="rounded border border-[#E5E8EC] p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-[#374151] dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button 
            onClick={() => handlePageChange('next')}
            disabled={currentPage === totalPages}
            className="rounded border border-[#E5E8EC] p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-[#374151] dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 포스트 리스트 */}
      <div className="mt-4">
        {currentPosts.length === 0 ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">
            선택한 탭에 노출할 스레드가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-[#F1F5F9] dark:divide-[#1F2937]">
            {currentPosts.map(post => (
              <li key={post.id} className="flex items-center justify-between py-3.5 text-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#5B6472] dark:bg-[#1F2937] dark:text-[#94A3B8] shrink-0">
                    {post.board_name}
                  </span>
                  <Link
                    href={`/board/${post.board_slug}/${post.id}`}
                    className="truncate font-semibold text-[#1A1D24] hover:text-[#7C3AED] dark:text-[#E2E8F0] dark:hover:text-[#A78BFA] transition"
                  >
                    {post.title}
                  </Link>
                  {post.comment_count > 0 && (
                    <span className="text-[10px] font-extrabold text-[#7C3AED] dark:text-[#A78BFA]">
                      {post.comment_count}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-4 text-[#94A3B8] relative z-20">
                  {post.author_username && !post.is_anonymous ? (
                    <Link href={`/u/${post.author_username}`} className="font-bold text-[#5B6472] dark:text-[#94A3B8] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition hover:underline">
                      {post.author_name}
                    </Link>
                  ) : (
                    <span className="truncate max-w-[80px] font-medium text-[#5B6472] dark:text-[#94A3B8]">
                      {post.author_name}
                    </span>
                  )}
                  <span className="w-12 text-right font-medium">
                    {formatTime(post.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
