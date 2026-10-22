import Link from 'next/link'
import { getPopularPosts24h } from '@/lib/queries/post'

/** 우측 '지금 인기' 순위 (아이보스 게시판 우측 순위 카드) */
export default async function PopularList() {
  const posts = await getPopularPosts24h()
  return (
    <section className="rounded-lg bg-white p-5 dark:bg-[#111827]">
      <h2 className="text-[17px] font-bold leading-9 text-black dark:text-white">지금 인기</h2>
      <ol className="mt-1">
        {posts.length === 0 && <li className="py-6 text-center text-[13px] text-[#AAA]">아직 인기글이 없습니다.</li>}
        {posts.map((p, i) => (
          <li key={p.id} className="flex h-[34px] items-center gap-3">
            <span className={`w-4 shrink-0 text-center text-[14px] font-bold ${i < 3 ? 'text-[#E53935]' : 'text-[#999]'}`}>{i + 1}</span>
            <Link href={`/board/${p.boardSlug}/${p.id}`} className="min-w-0 flex-1 truncate text-[15px] text-black hover:underline dark:text-slate-200">
              {p.title}
            </Link>
            {p.comments > 0 && <span className="shrink-0 text-[12px] font-bold text-[#4E07D2] dark:text-[#A78BFA]">{p.comments}</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}
