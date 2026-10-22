'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPost } from '@/lib/actions/post'
import { AlertCircle, Loader2 } from 'lucide-react'
import RichEditor from '@/components/editor/rich-editor'
import { htmlToText } from '@/lib/sanitize-html'

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

  // 이전에는 휴대폰정보나눔에 AEO 템플릿을 자동 주입했으나, 사용자 요청으로 제거함 (빈 본문으로 시작)
  const getInitialContent = () => ''

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

    // HTML 태그를 제외한 실제 텍스트 기준으로 검증 (이미지/표/동영상만 있는 글은 허용)
    const plainText = htmlToText(content)
    const hasMedia = /<(img|table|iframe|video)\b/i.test(content)
    if (plainText.trim().length < 5 && !hasMedia) {
      setErrorMsg('본문은 최소 5자 이상 입력해야 합니다.')
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
    } catch {
      setErrorMsg('글 작성 중 예상치 못한 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white px-3 pt-3 pb-24 md:rounded-xl md:px-6 md:pt-6 md:pb-6 md:shadow-md md:border md:border-[#E5E8EC] dark:bg-[#151E2E] dark:md:border-[#334155]">


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
          <label className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9] mb-1">
            내용
          </label>
          <RichEditor
            initialValue={getInitialContent()}
            onChange={setContent}
            disabled={loading}
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
