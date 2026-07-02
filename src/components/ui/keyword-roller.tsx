'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame } from 'lucide-react'

interface RollerItem {
  title: string
  href: string
}

/** 실데이터 인기글 제목 롤링 (3초 간격) — 라벨: '지금 뜨는 글' */
export default function KeywordRoller({ items }: { items: RollerItem[] }) {
  const [index, setIndex] = useState(0)
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(() => {
      setAnimate(false)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % items.length)
        setAnimate(true)
      }, 200)
    }, 3000)
    return () => clearInterval(timer)
  }, [items.length])

  const current = items[index]
  if (!current) return null

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-orange-400">
        <Flame className="h-3.5 w-3.5" aria-hidden />
        지금 뜨는 글
      </span>
      <Link
        href={current.href}
        className={`min-w-0 truncate text-xs text-slate-300 transition-all duration-200 hover:text-white ${
          animate ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        }`}
      >
        <span className="mr-1 font-bold tabular-nums text-slate-500">{index + 1}</span>
        {current.title}
      </Link>
    </div>
  )
}
