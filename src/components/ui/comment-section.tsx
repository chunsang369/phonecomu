'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createComment } from '@/lib/actions/comment'
import { Loader2, MessageSquare, Lock, Reply, Trash, Image } from 'lucide-react'
import AnonBadge from './anon-badge'

interface Comment {
  id: string
  post_id: string
  parent_id: string | null
  author_id: string | null
  is_anonymous: boolean
  is_secret: boolean
  content: string
  upvotes: number
  created_at: string
  author: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    level: number
  } | null
  anon_tag: string | null
}

interface CommentSectionProps {
  postId: string
  comments: Comment[]
  currentUserId: string | null
}

export default function CommentSection({ postId, comments, currentUserId }: CommentSectionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // 입력 폼 제어
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSecret, setIsSecret] = useState(false)

  // 대댓글 타겟 ID 제어 (replyTargetId)
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyIsAnonymous, setReplyIsAnonymous] = useState(false)
  const [replyIsSecret, setReplyIsSecret] = useState(false)

  // 이미지 업로드 로딩 제어
  const [imageUploading, setImageUploading] = useState(false)
  const [replyImageUploading, setReplyImageUploading] = useState<string | null>(null)

  // 이미지 업로드 헬퍼
  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) return data.url
      if (data.error) alert(data.error)
    } catch {
      alert('이미지 업로드 중 오류가 발생했습니다.')
    }
    return null
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isReply = false, parentId: string | null = null) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isReply && parentId) {
      setReplyImageUploading(parentId)
      const url = await uploadImage(file)
      if (url) {
        setReplyContent(prev => `${prev}\n[img:${url}]`)
      }
      setReplyImageUploading(null)
    } else {
      setImageUploading(true)
      const url = await uploadImage(file)
      if (url) {
        setContent(prev => `${prev}\n[img:${url}]`)
      }
      setImageUploading(false)
    }
  }

  // 댓글 내 [img:URL] 패턴 파싱하여 렌더링해주는 헬퍼
  const renderCommentContent = (text: string) => {
    if (!text) return ''
    const parts: React.ReactNode[] = []
    const imgRegex = /\[img:([^\s\]]+)\]/g
    let lastIndex = 0
    let match

    while ((match = imgRegex.exec(text)) !== null) {
      const preText = text.substring(lastIndex, match.index)
      if (preText) {
        parts.push(<span key={`txt-${lastIndex}`} className="whitespace-pre-wrap">{preText}</span>)
      }
      const imgUrl = match[1]
      parts.push(
        <div key={`img-${match.index}`} className="mt-2 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 max-w-sm">
          <img src={imgUrl} alt="댓글 이미지" className="max-h-60 w-auto object-cover" />
        </div>
      )
      lastIndex = imgRegex.lastIndex
    }

    const postText = text.substring(lastIndex)
    if (postText) {
      parts.push(<span key={`txt-${lastIndex}`} className="whitespace-pre-wrap">{postText}</span>)
    }

    return parts.length > 0 ? <div className="space-y-1">{parts}</div> : <span className="whitespace-pre-wrap">{text}</span>
  }

  // 댓글 트리 구조 생성 (부모 ID 기준 매핑)
  const parentComments = comments.filter(c => c.parent_id === null)
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  // 일반 댓글 등록
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) {
      alert('로그인이 필요한 서비스입니다.')
      return
    }
    if (content.trim().length < 2) {
      setErrorMsg('댓글 내용은 최소 2자 이상 입력해야 합니다.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('postId', postId)
    formData.append('content', content)
    formData.append('isAnonymous', isAnonymous ? 'true' : 'false')
    formData.append('isSecret', isSecret ? 'true' : 'false')

    try {
      const res = await createComment(null, formData)
      if (res && res.error) {
        setErrorMsg(res.error)
      } else {
        setContent('')
        setIsAnonymous(false)
        setIsSecret(false)
        router.refresh()
      }
    } catch (err) {
      setErrorMsg('댓글 작성 도중 예상치 못한 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 대댓글 등록
  const handleReplySubmit = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault()
    if (!currentUserId) {
      alert('로그인이 필요한 서비스입니다.')
      return
    }
    if (replyContent.trim().length < 2) {
      alert('대댓글 내용은 최소 2자 이상 입력해야 합니다.')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('postId', postId)
    formData.append('parentId', parentId)
    formData.append('content', replyContent)
    formData.append('isAnonymous', replyIsAnonymous ? 'true' : 'false')
    formData.append('isSecret', replyIsSecret ? 'true' : 'false')

    try {
      const res = await createComment(null, formData)
      if (res && res.error) {
        alert(res.error)
      } else {
        setReplyContent('')
        setReplyTargetId(null)
        setReplyIsAnonymous(false)
        setReplyIsSecret(false)
        router.refresh()
      }
    } catch (err) {
      alert('대댓글 작성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 개별 댓글 컴포넌트 렌더러
  const renderComment = (comment: Comment, depth = 0) => {
    const replies = getReplies(comment.id)
    const showReplyForm = replyTargetId === comment.id

    return (
      <div key={comment.id} className="space-y-4">
        {/* 댓글 본체 */}
        <div className={`flex gap-3 rounded-lg p-4 border border-[#E5E8EC] bg-white transition hover:shadow-sm dark:bg-[#151E2E] dark:border-[#334155] ${depth > 0 ? 'ml-6 sm:ml-10 bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {comment.is_secret ? (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    비밀댓글
                  </span>
                ) : comment.is_anonymous ? (
                  <AnonBadge tag={comment.anon_tag || '익명'} />
                ) : (
                  <div className="flex items-center gap-1 text-sm font-semibold text-[#1A1D24] dark:text-[#F1F5F9]">
                    {comment.author?.username ? (
                      <Link href={`/u/${comment.author.username}`} className="text-[#2563EB] dark:text-[#38BDF8] hover:underline font-extrabold transition">
                        {comment.author?.display_name || '탈퇴한 사용자'}
                      </Link>
                    ) : (
                      <span>{comment.author?.display_name || '탈퇴한 사용자'}</span>
                    )}
                    {comment.author && (
                      <span className="rounded bg-[#EFF4FF] px-1.5 py-0.5 text-[10px] font-bold text-[#2563EB] dark:bg-slate-800 dark:text-[#38BDF8]">
                        Lv.{comment.author.level}
                      </span>
                    )}
                  </div>
                )}
                
                <span className="text-xs text-[#94A3B8] dark:text-[#64748B]">
                  {new Date(comment.created_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>

                {comment.is_secret && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                    <Lock className="h-3 w-3" />
                    <span>비밀</span>
                  </span>
                )}
              </div>

              {currentUserId && (
                <button
                  onClick={() => {
                    setReplyTargetId(showReplyForm ? null : comment.id)
                    setReplyContent('')
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-[#5B6472] hover:text-[#2563EB] dark:text-[#94A3B8] dark:hover:text-[#38BDF8]"
                >
                  <Reply className="h-3 w-3" />
                  <span>답글</span>
                </button>
              )}
            </div>

            <div className="text-sm leading-relaxed text-[#1A1D24] dark:text-[#F1F5F9]">
              {renderCommentContent(comment.content)}
            </div>
          </div>
        </div>

        {/* 대댓글 답글 폼 */}
        {showReplyForm && (
          <div className="ml-6 sm:ml-10 rounded-xl border border-[#E5E8EC] bg-slate-50/50 p-4 dark:bg-slate-900/10 dark:border-[#334155]">
            <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="space-y-3">
              <textarea
                required
                rows={3}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="답글을 작성해 주세요 (최소 2자)..."
                className="block w-full rounded-lg bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9]"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-[#5B6472] dark:text-[#94A3B8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replyIsAnonymous}
                      onChange={(e) => setReplyIsAnonymous(e.target.checked)}
                      className="h-3.5 w-3.5 rounded text-[#2563EB]"
                    />
                    <span>익명</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[#5B6472] dark:text-[#94A3B8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replyIsSecret}
                      onChange={(e) => setReplyIsSecret(e.target.checked)}
                      className="h-3.5 w-3.5 rounded text-[#2563EB]"
                    />
                    <span>비밀 댓글</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#5B6472] hover:bg-gray-100 cursor-pointer dark:bg-[#151E2E] dark:border-[#334155] dark:text-[#94A3B8]">
                    {replyImageUploading === comment.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Image className="h-3.5 w-3.5" />
                    )}
                    <span>사진</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={loading || replyImageUploading !== null}
                      onChange={(e) => handleFileChange(e, true, comment.id)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setReplyTargetId(null)}
                    className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-[#5B6472] hover:bg-gray-100 dark:bg-[#151E2E] dark:border-[#334155] dark:text-[#94A3B8]"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-1 rounded-lg bg-[#16305B] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1E4079] dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
                  >
                    {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>답글 등록</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* 자식 대댓글 재귀 렌더링 */}
        {replies.length > 0 && (
          <div className="space-y-4">
            {replies.map(childComment => renderComment(childComment, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 border-b border-[#E5E8EC] pb-4 dark:border-[#334155]">
        <MessageSquare className="h-5 w-5 text-[#16305B] dark:text-[#38BDF8]" />
        <h3 className="text-lg font-bold text-[#16305B] dark:text-[#38BDF8]">
          댓글 ({comments.length})
        </h3>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* 댓글 리스트 */}
      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E8EC] py-12 text-center dark:border-[#334155]">
          <p className="text-sm text-[#94A3B8]">등록된 댓글이 없습니다. 첫 댓글을 작성해 보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {parentComments.map(c => renderComment(c))}
        </div>
      )}

      {/* 새 댓글 작성 폼 */}
      {currentUserId ? (
        <form onSubmit={handleCommentSubmit} className="rounded-xl border border-[#E5E8EC] bg-[#F8FAFC] p-4 dark:bg-[#0B111E] dark:border-[#334155] space-y-4">
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="비방, 욕설, 광고성 링크는 즉시 조치됩니다. 깨끗한 커뮤니티를 함께 만들어요 (최소 2자)..."
            className="block w-full rounded-lg bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] dark:border-[#334155] dark:bg-[#151E2E] dark:text-[#F1F5F9]"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-[#5B6472] dark:text-[#94A3B8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#2563EB]"
                />
                <span>익명</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[#5B6472] dark:text-[#94A3B8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#2563EB]"
                />
                <span>비밀 댓글</span>
              </label>
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#5B6472] hover:bg-gray-100 cursor-pointer dark:bg-[#151E2E] dark:border-[#334155] dark:text-[#94A3B8]">
                {imageUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Image className="h-4 w-4" />
                )}
                <span>사진 첨부</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={loading || imageUploading}
                  onChange={(e) => handleFileChange(e, false, null)}
                />
              </label>
              <button
                type="submit"
                disabled={loading || imageUploading}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#16305B] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1E4079] dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>댓글 등록</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-[#E5E8EC] bg-[#F8FAFC] py-6 text-center dark:bg-[#0B111E] dark:border-[#334155]">
          <p className="text-sm text-[#5B6472] dark:text-[#94A3B8]">
            댓글을 달려면 <Link href="/login" className="font-bold text-[#2563EB] hover:underline">로그인</Link>이 필요합니다.
          </p>
        </div>
      )}
    </section>
  )
}
