'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface BackButtonProps {
  // 히스토리가 없을 때(직접 URL 진입/새 탭) 돌아갈 대체 경로
  fallbackHref?: string
  label?: string
  className?: string
}

export default function BackButton({ fallbackHref = '/', label = '뒤로가기', className = '' }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // 이전 히스토리가 있으면 뒤로, 없으면 대체 경로로 이동
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1 rounded-lg border border-[#E5E8EC] bg-white px-3 py-1.5 text-xs font-bold text-[#5B6472] transition hover:bg-[#F7F8FA] hover:text-[#1A1D24] dark:border-[#334155] dark:bg-[#151E2E] dark:text-[#94A3B8] dark:hover:bg-[#1E293B] ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}
