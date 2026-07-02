'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPost } from '@/lib/actions/post'
import { AlertCircle, Loader2 } from 'lucide-react'

interface Board {
  id: number
  slug: string
  name: string
  type: string
  allow_anonymous: boolean
  description: string | null
}

interface WriteFormProps {
  board: Board
}

export default function WriteForm({ board }: WriteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 정보게시판(info)인 경우 AEO 템플릿 강제 주입
  const getInitialContent = () => {
    if (board.slug === 'info') {
      return `[질문/주제 개요]\n여기에 마케팅 또는 휴대폰 관련 질문이나 주제 요약을 한 줄로 입력하세요.\n\n[핵심 답변 요약 (Answer-First)]\n여기에 AI 답변 엔진(AEO)이 즉각 수집할 수 있도록 핵심 답변 또는 결론을 2~3줄 내로 요약하여 기재하세요.\n\n[상세 내용 및 실경험 근거]\n여기에 상세 설명 및 세부 비교 수치, 실제 경험담을 자유롭게 기재하세요.`
    }
    return ''
  }

  const [title, setTitle] = useState('')
  const [content, setContent] = useState(getInitialContent())
  const [isAnonymous, setIsAnonymous] = useState(board.type === 'anonymous')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    // 클라이언트 기초 검증
    if (title.trim().length < 2) {
      setErrorMsg('제목은 최소 2자 이상 입력해야 합니다.')
      setLoading(false)
      return
    }

    if (content.trim().length < 5) {
      setErrorMsg('본물은 최소 5자 이상 입력해야 합니다.')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('boardId', board.id.toString())
    formData.append('boardSlug', board.slug)
    formData.append('title', title)
    formData.append('content', content)
    formData.append('isAnonymous', isAnonymous ? 'true' : 'false')

    try {
      const res = await createPost(null, formData)

      if (res && res.error) {
        setErrorMsg(res.error)
      } else if (res && res.success && res.postId) {
        // 상세 페이지로 이동
        router.push(`/board/${board.slug}/${res.postId}`)
        router.refresh()
      }
    } catch (err) {
      setErrorMsg('글 작성 중 예상치 못한 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-md border border-[#E5E8EC] dark:bg-[#151E2E] dark:border-[#334155]">
      <div className="mb-6 border-b border-[#E5E8EC] pb-4 dark:border-[#334155]">
        <h1 className="text-2xl font-bold text-[#16305B] dark:text-[#38BDF8]">
          {board.name} 글쓰기
        </h1>
        {board.description && (
          <p className="mt-1 text-sm text-[#5B6472] dark:text-[#94A3B8]">
            {board.description}
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9]">
            제목
          </label>
          <input
            id="title"
            type="text"
            required
            disabled={loading}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
            placeholder="제목을 입력하세요 (최소 2자)"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9]">
            내용 {board.slug === 'info' && <span className="text-xs text-[#2563EB] dark:text-[#38BDF8]">(AEO 답변 템플릿 포함)</span>}
          </label>
          <textarea
            id="content"
            required
            disabled={loading}
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
            placeholder="내용을 입력하세요 (최소 5자)"
          />
        </div>

        {board.allow_anonymous && (
          <div className="flex items-center gap-2">
            <input
              id="isAnonymous"
              type="checkbox"
              disabled={loading || board.type === 'anonymous'}
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-[#E5E8EC] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <label htmlFor="isAnonymous" className="text-sm font-medium text-[#5B6472] dark:text-[#94A3B8]">
              익명으로 작성하기 {board.type === 'anonymous' && '(익명게시판 기본 강제)'}
            </label>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => router.back()}
            className="rounded-lg border border-[#E5E8EC] bg-white px-5 py-2.5 text-sm font-medium text-[#5B6472] hover:bg-[#F7F8FA] dark:border-[#334155] dark:bg-[#151E2E] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#16305B] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E4079] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:bg-gray-400 dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-5 animate-spin" />
                <span>등록 중...</span>
              </>
            ) : (
              '글 등록'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
