import {notFound,redirect} from 'next/navigation'
import Link from 'next/link'
import {getCurrentProfile} from '@/lib/auth/session'
import {one} from '@/lib/db'
type Pipeline={updated:string;collected:number;ready:number;rewriteMode:string;nextPublication:string|null;sources:{source_id:string;state:string;count:number}[]}
export default async function SharedCommunityAdmin(){
 const user=await getCurrentProfile()
 if(!user)redirect('/login?next=/demo/admin')
 if(user.role!=='admin')notFound()
 const [counts,pipeline]=await Promise.all([
  one<{users:string;posts:string;comments:string}>(`select (select count(*) from profiles where is_test=true) users,(select count(*) from posts where source='community-rewrite' and status='published') posts,(select count(*) from comments c join posts p on p.id=c.post_id where p.source='community-rewrite' and c.status='published') comments`),
  one<{data:Pipeline}>('select data from community_pipeline_status where id=1')
 ])
 const p=pipeline?.data
 return <main className="mx-auto w-full max-w-5xl space-y-5 p-6"><Link href="/">← 홈페이지</Link><h1 className="text-2xl font-bold">커뮤니티 관리</h1><p>공개 데이터: Contabo PostgreSQL · 재구성: {p?.rewriteMode}</p><div className="grid grid-cols-2 gap-4 md:grid-cols-5">{[['테스트 계정',counts?.users],['게시 완료',counts?.posts],['공개 댓글',counts?.comments],['수집 자료',p?.collected],['검수 후 대기',p?.ready]].map(([label,value])=><div key={label} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{Number(value||0).toLocaleString()}</p></div>)}</div><p>수집: 하루 4회 · 한국시간 6시간 구간마다 무작위 1회 · 접근 제한 시 30분 후 재확인 · 재차 제한되면 정기 2회차 보류</p><p>다음 게시 가능 시각: {p?.nextPublication?new Date(p.nextPublication).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'검수 대기'}</p><table className="w-full text-left text-sm"><thead><tr><th>출처</th><th>처리 상태</th><th>건수</th></tr></thead><tbody>{p?.sources.map(s=><tr key={s.source_id+s.state} className="border-t"><td className="py-2">{s.source_id}</td><td>{s.state}</td><td>{s.count}</td></tr>)}</tbody></table><p className="text-xs text-slate-500">집계 갱신: {p?.updated?new Date(p.updated).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'대기'}</p></main>
}
