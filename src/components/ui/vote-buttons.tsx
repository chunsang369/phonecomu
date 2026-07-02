'use client'

import { useState } from 'react'
import { castVoteAction } from '@/lib/actions/vote'
import { Heart, ThumbsDown, Loader2 } from 'lucide-react'

interface VoteButtonsProps {
  postId: string
  initialUpvotes: number
  initialDownvotes: number
  currentUserId: string | null
}

export default function VoteButtons({ postId, initialUpvotes, initialDownvotes, currentUserId }: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleVote = async (value: 1 | -1) => {
    if (!currentUserId) {
      alert('로그인이 필요한 서비스입니다.')
      return
    }

    setLoading(true)
    try {
      const res = await castVoteAction('post', postId, value)
      if (res && res.error) {
        alert(res.error)
      } else if (res && res.success && res.actionValue !== undefined) {
        if (value === 1) {
          setUpvotes(prev => prev + res.actionValue)
          setLiked(res.actionValue > 0)
        } else {
          setDownvotes(prev => prev + Math.abs(res.actionValue))
          setDisliked(res.actionValue < 0)
        }
      }
    } catch {
      alert('투표 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {/* 좋아요 버튼 */}
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={`
          inline-flex items-center gap-2
          rounded-full px-7 py-2 text-sm font-bold
          border transition-all duration-200 disabled:opacity-50
          ${liked
            ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-md shadow-purple-200 dark:shadow-purple-900/30'
            : 'bg-white border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white dark:bg-transparent dark:hover:bg-[#7C3AED]'
          }
        `}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-white' : ''}`} />
        )}
        <span>야 맞다! 좋아요</span>
        <span className="font-black text-xs opacity-80">{upvotes}</span>
      </button>

      {/* 다른의견 버튼 */}
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={`
          inline-flex items-center gap-2
          rounded-full px-7 py-2 text-sm font-bold
          border transition-all duration-200 disabled:opacity-50
          ${disliked
            ? 'bg-slate-500 border-slate-500 text-white shadow-md dark:shadow-slate-900/30'
            : 'bg-white border-slate-400 text-slate-500 hover:bg-slate-500 hover:text-white dark:bg-transparent dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-600'
          }
        `}
      >
        <ThumbsDown className={`h-3.5 w-3.5 ${disliked ? 'fill-white' : ''}`} />
        <span>다른의견</span>
        <span className="font-black text-xs opacity-80">{downvotes}</span>
      </button>
    </div>
  )
}
