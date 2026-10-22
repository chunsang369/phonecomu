'use client'

// 홈 우측 '새글 / 새댓글' 탭 목록 (아이보스 우측 하단 카드와 같은 구성)
import { useState } from 'react'
import Link from 'next/link'

type Item = { id: string; text: string; href: string }

export default function SideTabs({ posts, comments }: { posts: Item[]; comments: Item[] }) {
  const [tab, setTab] = useState<'posts' | 'comments'>('posts')
  const items = tab === 'posts' ? posts : comments
  return (
    <section className="rounded-lg bg-white p-5 dark:bg-[#111827]">
      <div className="flex items-center justify-between">
        <div className="flex gap-4" role="tablist">
          {(
            [
              ['posts', '새글'],
              ['comments', '새댓글'],
            ] as const
          ).map(([k, t]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`text-[17px] font-bold leading-9 ${tab === k ? 'text-black dark:text-white' : 'text-[#AAA] hover:text-[#666]'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <Link href="/board/free" className="text-[13px] text-[#999] hover:text-[#5707EB]">
          더보기
        </Link>
      </div>
      <ul className="mt-2 space-y-0.5">
        {items.length === 0 && <li className="py-6 text-center text-[13px] text-[#AAA]">아직 {tab === 'posts' ? '글' : '댓글'}이 없습니다.</li>}
        {items.map((it) => (
          <li key={it.id}>
            <Link href={it.href} className="block truncate py-1.5 text-[15px] text-black hover:text-[#5707EB] dark:text-slate-200 dark:hover:text-[#A78BFA]">
              {it.text}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
