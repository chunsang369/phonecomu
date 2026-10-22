import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'
import { q } from '@/lib/db'
import { GUIDES } from '@/lib/guides/content'
import { DEVICE_PRICE_AS_OF } from '@/lib/calculator/devices'
import { kstDate } from '@/lib/seo/schema'

/**
 * /sitemap.xml — GEO·AEO 전략 v4
 * - 실제 수정 시각만 lastmod로 쓴다(빌드 시각·현재 시각 금지), changefreq·priority 없음
 * - DB 오류를 빈 목록으로 삼키지 않는다: 빈 사이트맵이 캐시되는 것보다 오류 응답이 낫다
 */
export const revalidate = 3600

const ABOUT_UPDATED = '2026-10-22'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.PHONE_DEMO === '1') return []

  const [boards, posts, stores] = await Promise.all([
    q<{ slug: string; updated: string | null }>(
      `select b.slug, max(p.updated_at) as updated
         from boards b left join posts p on p.board_id = b.id and p.status = 'published'
        where b.read_min_level <= 0
        group by b.slug, b.sort order by b.sort`,
    ),
    q<{ id: string; slug: string; updated_at: string }>(
      `select p.id, b.slug, p.updated_at
         from posts p join boards b on b.id = p.board_id
        where p.status = 'published' and b.read_min_level <= 0
        order by p.updated_at desc limit 45000`,
    ),
    // 후기가 1건 이상인 매장만 (빈 매장 페이지는 색인 대상에서 제외)
    q<{ id: string; updated: string }>(
      `select s.id, max(r.created_at) as updated
         from stores s join store_reviews r on r.store_id = s.id and r.status = 'published'
        where s.status = 'active'
        group by s.id`,
    ),
  ])

  const latest = (dates: (string | null | undefined)[]) => dates.filter((d): d is string => !!d).sort().at(-1)
  const url = (path: string, lastModified?: string) => ({ url: `${SITE_URL}${path}`, ...(lastModified ? { lastModified } : {}) })
  const guideUpdated = latest(GUIDES.map((g) => g.dateModified))

  return [
    url('/', latest(posts.slice(0, 1).map((p) => p.updated_at))),
    url('/guide', guideUpdated && kstDate(guideUpdated)),
    ...GUIDES.map((g) => url(`/guide/${g.slug}`, kstDate(g.dateModified))),
    url('/seongji', latest(stores.map((s) => s.updated))),
    ...stores.map((s) => url(`/seongji/${s.id}`, s.updated)),
    url('/calculator', kstDate(DEVICE_PRICE_AS_OF)),
    url('/about', kstDate(ABOUT_UPDATED)),
    ...boards.map((b) => url(`/board/${b.slug}`, b.updated ?? undefined)),
    ...posts.map((p) => url(`/board/${p.slug}/${p.id}`, p.updated_at)),
  ]
}
