import Link from 'next/link'
import { stats } from '@/lib/demo/runtime.mjs'
import { demoQuotes } from '@/lib/demo/catalog.mjs'

export default function DemoOverview() {
  const counts=stats()
  return <section className="space-y-4 rounded-lg bg-white p-5 dark:bg-[#111827]">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#5707EB]">PHONE COMMUNITY · LOCAL REFERENCE</p><h1 className="mt-1 text-2xl font-bold tracking-tight">휴대폰 선택, 함께 알아보면 쉬워져요</h1><p className="mt-2 text-sm text-slate-500">성지 정보부터 구매 후기까지. 내 조건에 맞는 이야기를 찾아보세요.</p></div><Link href="/demo/admin" className="rounded-lg border px-3 py-2 text-sm">데모 관리 ↗</Link></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[[counts.users,'테스트 회원'],[counts.posts,'예시 게시글'],[counts.comments,'예시 댓글'],[counts.votes,'추천 활동']].map(([n,label])=><div key={label} className="rounded-lg bg-[#F7F5FC] p-3 dark:bg-slate-800"><strong className="block text-xl text-[#5707EB]">{Number(n).toLocaleString('ko-KR')}</strong><span className="text-xs text-slate-500">{label}</span></div>)}</div>
    <div className="flex items-center justify-between border-t pt-4"><h2 className="text-sm font-bold">통신 3사 시세 한눈에 <span className="font-normal text-slate-400">· 예시</span></h2><Link href="/calculator" className="text-sm text-[#5707EB]">요금계산기 →</Link></div>
    <div className="grid gap-3 sm:grid-cols-3">{demoQuotes.filter(q=>q.region==='서울'&&q.device==='갤럭시 S26'&&q.joinType==='번호이동').map(q=><Link key={q.id} href="/calculator" className="rounded-lg border border-slate-200 p-3 hover:border-[#5707EB]"><span className="text-xs text-slate-500">{q.carrier} · {q.joinType}</span><p className="my-1 text-sm font-semibold">{q.device}</p><p className="text-lg font-bold">{(q.devicePaid/10000).toFixed(1)}<span className="text-xs font-normal">만원</span></p><span className="text-[11px] text-slate-400">월 {q.planPrice.toLocaleString()}원 · 6개월 유지</span></Link>)}</div>
  </section>
}
