'use client'

import { useEffect, useRef } from 'react'
import { incrementViewCount } from '@/lib/actions/view'

interface ViewCounterProps {
  postId: string
}

// 게시글 상세가 실제로 브라우저에 마운트될 때만 조회수를 1 증가시킨다.
// (서버 컴포넌트 렌더/프리페치로 인한 과다 증가를 피하기 위한 클라이언트 트리거)
export default function ViewCounter({ postId }: ViewCounterProps) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    incrementViewCount(postId).catch(() => {
      /* 조회수 증가 실패는 조용히 무시 */
    })
  }, [postId])

  return null
}
