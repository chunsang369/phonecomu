import { q } from '@/lib/db'

/** 검색·AI 방문 1건을 일자별(한국 시간) 카운터에 더한다. 실패해도 응답에 영향을 주지 않는다. */
export async function recordSeoHit(hit: { kind: 'bot' | 'ai_ref'; source: string }) {
  if (process.env.PHONE_DEMO === '1') return
  try {
    await q(
      `insert into seo_daily (day, kind, source, hits) values ((now() at time zone 'Asia/Seoul')::date, $1, $2, 1)
       on conflict (day, kind, source) do update set hits = seo_daily.hits + 1`,
      [hit.kind, hit.source],
    )
  } catch (e) {
    console.error('seo_daily 기록 실패:', (e as Error).message)
  }
}
