import { one, q } from '@/lib/db'

export type StoreSummary = {
  id: string
  alias: string
  region: string
  district: string
  review_count: number
  avg_price: number | null
  avg_service: number | null
  avg_trust: number | null
  avg_total: number | null
  kept_rate: number | null // 약속 이행률(0~1)
  broken_count: number
  last_review_at: string | null
  latest_device: string | null
  latest_real_price: number | null
}

export type StoreReview = {
  id: string
  store_id: string
  post_id: string | null
  carrier: string
  device_name: string
  device_price: number
  join_type: string
  discount_type: string
  pay_type: string
  device_paid: number
  install_months: number
  plan_price: number
  plan_hold_months: number
  plan_after_price: number
  addon_monthly: number
  addon_months: number
  card_required: boolean
  promise: 'kept' | 'partial' | 'broken'
  rating_price: number
  rating_service: number
  rating_trust: number
  purchased_on: string
  real_price: number
  hidden_cost: number
  total_24m: number
  comment: string | null
  created_at: string
  author_display_name: string | null
  author_username: string | null
  store_alias?: string
  store_region?: string
  store_district?: string
}

const SUMMARY_SELECT = `
  select s.id, s.alias, s.region, s.district,
         count(r.id)::int as review_count,
         round(avg(r.rating_price)::numeric, 1)::float as avg_price,
         round(avg(r.rating_service)::numeric, 1)::float as avg_service,
         round(avg(r.rating_trust)::numeric, 1)::float as avg_trust,
         round(avg((r.rating_price + r.rating_service + r.rating_trust) / 3.0)::numeric, 1)::float as avg_total,
         case when count(r.id) > 0 then (count(*) filter (where r.promise = 'kept'))::float / count(r.id) end as kept_rate,
         (count(*) filter (where r.promise = 'broken'))::int as broken_count,
         max(r.created_at) as last_review_at,
         (array_agg(r.device_name order by r.created_at desc))[1] as latest_device,
         (array_agg(r.real_price order by r.created_at desc))[1] as latest_real_price
    from stores s
    left join store_reviews r on r.store_id = s.id and r.status = 'published'
   where s.status = 'active'`

export type StoreSort = 'score' | 'reviews' | 'recent'

/** 지역별 성지 목록 + 평가 집계 */
export async function listStores(region?: string, sort: StoreSort = 'score') {
  const order =
    sort === 'reviews'
      ? 'review_count desc, avg_total desc nulls last'
      : sort === 'recent'
        ? 'last_review_at desc nulls last'
        : // 후기 수가 적으면 평점이 쉽게 튀므로 (평균×후기수 + 3×2)/(후기수+2) 로 보정한 점수 순
          '((coalesce(avg_total, 0) * review_count + 6) / (review_count + 2)) desc, review_count desc'
  try {
    return await q<StoreSummary>(
      `select * from (${SUMMARY_SELECT} ${region ? 'and s.region = $1' : ''} group by s.id) t order by ${order} limit 100`,
      region ? [region] : [],
    )
  } catch (e) {
    console.error('listStores 오류:', (e as Error).message)
    return []
  }
}

export async function getStore(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  try {
    return await one<StoreSummary>(`${SUMMARY_SELECT} and s.id = $1 group by s.id`, [id])
  } catch {
    return null
  }
}

const REVIEW_SELECT = `
  select r.*, a.display_name as author_display_name, a.username as author_username,
         s.alias as store_alias, s.region as store_region, s.district as store_district
    from store_reviews r
    join stores s on s.id = r.store_id
    left join profiles a on a.id = r.author_id
   where r.status = 'published'`

export async function getStoreReviews(storeId: string) {
  try {
    return await q<StoreReview>(`${REVIEW_SELECT} and r.store_id = $1 order by r.created_at desc limit 200`, [storeId])
  } catch {
    return []
  }
}

export async function getRecentReviews(limit = 10, region?: string) {
  try {
    return await q<StoreReview>(
      `${REVIEW_SELECT} ${region ? 'and s.region = $2' : ''} order by r.created_at desc limit $1`,
      region ? [limit, region] : [limit],
    )
  } catch {
    return []
  }
}

/** 기종별 최근 실구매가 (후기 기준, 최근 60일) — 시세 참고용 */
export async function getDevicePriceBoard(region?: string) {
  try {
    return await q<{ device_name: string; carrier: string; n: number; min_real: number; avg_real: number; last_at: string }>(
      `select r.device_name, r.carrier, count(*)::int as n, min(r.real_price)::int as min_real,
              round(avg(r.real_price))::int as avg_real, max(r.created_at) as last_at
         from store_reviews r join stores s on s.id = r.store_id
        where r.status = 'published' and r.created_at > now() - interval '60 days' ${region ? 'and s.region = $1' : ''}
        group by r.device_name, r.carrier
        order by n desc, last_at desc limit 30`,
      region ? [region] : [],
    )
  } catch {
    return []
  }
}

/** 후기 작성 폼: 지역 내 기존 매장 */
export async function getStoresInRegion(region: string) {
  try {
    return await q<{ id: string; alias: string; district: string }>(
      "select id, alias, district from stores where region = $1 and status = 'active' order by district, alias limit 300",
      [region],
    )
  } catch {
    return []
  }
}
