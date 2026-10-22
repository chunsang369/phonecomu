import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Guide, GuideBlock } from '@/lib/guides/types'

/**
 * 가이드 본문 (서버 컴포넌트) — GEO·AEO 전략 v4 B1 블록 순서
 * H1 → 첫 문단 답(data-seo=answer) → 기준일(conditions) → 목차 → 질문형 H2 + 첫 문장 답 → 표(compare) → FAQ
 * → 관련 문서(related) → 작성자·수정일(byline/modified) → CTA
 * 모든 내용은 서버 HTML에 들어간다(접는 UI·JS 렌더링 없음).
 */

function Block({ b }: { b: GuideBlock }) {
  if (b.type === 'p') return <p className="mt-3 text-[16px] leading-[1.8] text-[#333] dark:text-slate-300">{b.text}</p>
  if (b.type === 'note')
    return <p className="mt-3 rounded-lg bg-[#F7F3FF] px-4 py-3 text-[14px] leading-relaxed text-[#4E07D2] dark:bg-[#2A1366]/40 dark:text-[#C4B5FD]">{b.text}</p>
  if (b.type === 'list') {
    const Tag = b.ordered ? 'ol' : 'ul'
    return (
      <Tag className={`mt-3 space-y-1.5 pl-5 text-[16px] leading-[1.7] text-[#333] dark:text-slate-300 ${b.ordered ? 'list-decimal' : 'list-disc'}`}>
        {b.items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </Tag>
    )
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table data-seo="compare" className="w-full min-w-[520px] border-collapse text-[14px]">
        {b.caption && <caption className="mb-2 text-left text-[13px] text-[#888]">{b.caption}</caption>}
        <thead>
          <tr className="bg-[#F7F8FA] dark:bg-slate-800/60">
            {b.head.map((h) => (
              <th key={h} scope="col" className="border border-[#E5E7EB] px-3 py-2 text-left font-bold text-[#222] dark:border-slate-700 dark:text-slate-100">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="border border-[#E5E7EB] px-3 py-2 text-left align-top font-bold text-[#222] dark:border-slate-700 dark:text-slate-200">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="border border-[#E5E7EB] px-3 py-2 align-top text-[#333] dark:border-slate-700 dark:text-slate-300">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function GuideArticle({ g, relatedGuides }: { g: Guide; relatedGuides: { slug: string; title: string }[] }) {
  return (
    <article className="rounded-lg bg-white px-5 py-7 sm:px-10 sm:py-10 dark:bg-[#111827]">
      <nav aria-label="현재 위치" className="text-[13px] text-[#999]">
        <Link href="/" className="hover:text-[#5707EB]">성지평가제 홈</Link> <ChevronRight className="inline h-3 w-3" />{' '}
        <Link href="/guide" className="hover:text-[#5707EB]">휴대폰 구매 가이드</Link>
      </nav>
      <h1 className="mt-3 text-[26px] font-extrabold leading-snug tracking-[-0.5px] text-black sm:text-[30px] dark:text-white">{g.title}</h1>

      {/* 첫 문단: 질문에 대한 직접 답 */}
      <p data-seo="answer" className="mt-5 rounded-xl border-l-4 border-[#5707EB] bg-[#F7F8FA] px-5 py-4 text-[17px] font-medium leading-[1.75] text-black dark:bg-slate-800/60 dark:text-white">
        {g.summary}
      </p>
      <section data-seo="conditions" className="mt-2 text-[13px] text-[#888]">
        내용 기준일 <time data-seo="price-basis" dateTime={g.dateModified}>{g.dateModified}</time> · 통신사 지원금·요금은 시점마다 바뀌므로 개통 전 통신사 공시와 계약서로 다시 확인하세요.
      </section>

      <nav aria-label="목차" className="mt-6 rounded-lg border border-[#EEE] px-5 py-4 dark:border-slate-800">
        <p className="text-[14px] font-bold text-black dark:text-white">목차</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-[#555] dark:text-slate-300">
          {g.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="hover:text-[#5707EB] hover:underline">
                {s.question}
              </a>
            </li>
          ))}
          {g.howTo && (
            <li>
              <a href="#steps" className="hover:text-[#5707EB] hover:underline">
                {g.howTo.name}
              </a>
            </li>
          )}
          <li>
            <a href="#faq" className="hover:text-[#5707EB] hover:underline">
              자주 묻는 질문
            </a>
          </li>
        </ol>
      </nav>

      {g.sections.map((s) => (
        <section key={s.id} id={s.id} className="mt-10 scroll-mt-28">
          <h2 className="text-[21px] font-bold leading-snug text-black dark:text-white">{s.question}</h2>
          <p className="mt-3 text-[16px] font-medium leading-[1.8] text-black dark:text-slate-100">{s.answer}</p>
          {s.blocks?.map((b, i) => (
            <Block key={i} b={b} />
          ))}
        </section>
      ))}

      {g.howTo && (
        <section id="steps" className="mt-10 scroll-mt-28">
          <h2 className="text-[21px] font-bold text-black dark:text-white">{g.howTo.name}</h2>
          <ol className="mt-4 space-y-3">
            {g.howTo.steps.map((s, i) => (
              <li key={s.name} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5707EB] text-[13px] font-bold text-white">{i + 1}</span>
                <div>
                  <p className="text-[16px] font-bold text-black dark:text-white">{s.name}</p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-[#444] dark:text-slate-300">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section id="faq" className="mt-12 scroll-mt-28">
        <h2 className="text-[21px] font-bold text-black dark:text-white">자주 묻는 질문</h2>
        <dl className="mt-4 divide-y divide-[#EEE] dark:divide-slate-800">
          {g.faq.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="text-[16px] font-bold text-black dark:text-white">Q. {f.q}</dt>
              <dd className="mt-1.5 text-[15px] leading-[1.75] text-[#444] dark:text-slate-300">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {g.sources && g.sources.length > 0 && (
        <section className="mt-10 border-t border-[#EEE] pt-5 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-black dark:text-white">근거 자료</h2>
          <ul className="mt-2 space-y-1 text-[13px] text-[#666] dark:text-slate-400">
            {g.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener" className="text-[#5707EB] hover:underline dark:text-[#A78BFA]">
                  {s.name}
                </a>
                {s.note && ` — ${s.note}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatedGuides.length > 0 && (
        <nav data-seo="related" aria-label="관련 가이드" className="mt-10 border-t border-[#EEE] pt-5 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-black dark:text-white">함께 보면 좋은 가이드</h2>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <li>
              <Link href="/guide" className="flex items-center justify-between rounded-lg border border-[#EEE] px-4 py-3 text-[14px] font-bold text-[#333] hover:border-[#5707EB] hover:text-[#5707EB] dark:border-slate-700 dark:text-slate-200">
                휴대폰 구매 가이드 전체 <ChevronRight className="h-4 w-4" />
              </Link>
            </li>
            {relatedGuides.map((r) => (
              <li key={r.slug}>
                <Link href={`/guide/${r.slug}`} className="flex items-center justify-between rounded-lg border border-[#EEE] px-4 py-3 text-[14px] font-bold text-[#333] hover:border-[#5707EB] hover:text-[#5707EB] dark:border-slate-700 dark:text-slate-200">
                  {r.title} <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p data-seo="byline" className="mt-8 text-[13px] text-[#999]">
        작성·검수: <Link href="/about" className="underline hover:text-[#5707EB]">성지평가제 운영팀</Link> · 최초 작성{' '}
        <time dateTime={g.datePublished}>{g.datePublished}</time> · 최종 수정 <time data-seo="modified" dateTime={g.dateModified}>{g.dateModified}</time>
      </p>

      {g.cta && (
        <div data-seo="cta" className="mt-5 flex flex-wrap gap-2">
          {g.cta.map((c) => (
            <Link key={c.href} href={c.href} className="flex h-11 items-center gap-1 rounded-lg bg-[#5707EB] px-5 text-[15px] font-bold text-white hover:bg-[#4E07D2]">
              {c.label} <ChevronRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
