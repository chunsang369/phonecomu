import type { QA } from '@/lib/seo/schema'

/**
 * 화면에 보이는 FAQ — FAQPage 구조화 데이터는 반드시 이 컴포넌트에 넘긴 같은 배열로 만든다(화면·마크업 일치).
 * 접는 UI 없이 서버 HTML에 질문·답을 모두 넣는다.
 */
export default function FaqSection({ items, className = '' }: { items: QA[]; className?: string }) {
  return (
    <section id="faq" className={`rounded-lg bg-white px-5 py-6 sm:px-[30px] dark:bg-[#111827] ${className}`}>
      <h2 className="text-[19px] font-bold text-black dark:text-white">자주 묻는 질문</h2>
      <dl className="mt-2 divide-y divide-[#EEE] dark:divide-slate-800">
        {items.map((f) => (
          <div key={f.q} className="py-4">
            <dt className="text-[16px] font-bold text-black dark:text-white">Q. {f.q}</dt>
            <dd className="mt-1.5 text-[15px] leading-[1.75] text-[#444] dark:text-slate-300">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
