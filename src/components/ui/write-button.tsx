'use client'

import { useRouter } from 'next/navigation'
import { PenTool } from 'lucide-react'

interface WriteButtonProps {
  boardSlug: string
  isLoggedIn: boolean
  className?: string
}

export default function WriteButton({ boardSlug, isLoggedIn, className }: WriteButtonProps) {
  const router = useRouter()

  const handleWriteClick = (e: React.MouseEvent) => {
    if(process.env.NEXT_PUBLIC_PHONE_DEMO==='1'){router.push(`/demo/write?board=${boardSlug}`);return}
    if (!isLoggedIn) {
      e.preventDefault()
      alert('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.')
      router.push('/login')
    } else {
      router.push(`/write/${boardSlug}`)
    }
  }

  return (
    <button
      onClick={handleWriteClick}
      className={className || "flex items-center gap-1 rounded bg-[#5707EB] px-5 py-2 text-xs font-bold text-white hover:bg-[#4E07D2] transition whitespace-nowrap shrink-0 shadow-sm"}
    >
      <PenTool className="h-3.5 w-3.5" />
      <span>글쓰기</span>
    </button>
  )
}
