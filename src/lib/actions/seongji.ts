'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { one, tx } from '@/lib/db'
import { getCurrentProfile } from '@/lib/auth/session'
import { awardPoints } from '@/lib/db/points'
import { getStoresInRegion } from '@/lib/queries/seongji'
import { PROMISE_LABEL, REGIONS, reviewCost } from '@/lib/seongji/cost'

const KRW = (n: number) => new Intl.NumberFormat('ko-KR').format(n)
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
// 매장 실명 대신 별칭을 쓰도록: 전화번호·오픈채팅·URL 차단
const CONTACT_RE = /(0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4})|(open\.kakao\.com)|(https?:\/\/)|(카톡\s*아이디)/i

const money = z.number().int().min(0).max(10_000_000)
const schema = z.object({
  storeId: z.string().uuid().nullable(),
  newStore: z
    .object({
      region: z.enum(REGIONS),
      district: z.string().trim().max(20),
      alias: z.string().trim().min(2, { message: '매장 별칭은 2자 이상 입력해 주세요.' }).max(20),
    })
    .nullable(),
  carrier: z.enum(['SKT', 'KT', 'LGU+']),
  deviceName: z.string().trim().min(2).max(60),
  devicePrice: money,
  joinType: z.enum(['번호이동', '기기변경', '신규가입']),
  discountType: z.enum(['공시지원금', '선택약정']),
  payType: z.enum(['현금완납', '할부']),
  devicePaid: money,
  installMonths: z.number().int().min(0).max(48),
  planPrice: money,
  planHoldMonths: z.number().int().min(0).max(24),
  planAfterPrice: money,
  addonMonthly: money,
  addonMonths: z.number().int().min(0).max(24),
  cardRequired: z.boolean(),
  promise: z.enum(['kept', 'partial', 'broken']),
  ratingPrice: z.number().int().min(1).max(5),
  ratingService: z.number().int().min(1).max(5),
  ratingTrust: z.number().int().min(1).max(5),
  purchasedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  comment: z.string().trim().max(2000),
})

export type ReviewInput = z.infer<typeof schema>

/** 후기 작성 폼: 지역 선택 시 기존 매장 목록 */
export async function storesInRegion(region: string) {
  if (!(REGIONS as readonly string[]).includes(region)) return []
  return getStoresInRegion(region)
}

export async function createStoreReview(input: ReviewInput) {
  const me = await getCurrentProfile()
  if (!me) return { error: '로그인이 필요합니다.' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data
  if (!d.storeId && !d.newStore) return { error: '매장을 선택하거나 새로 등록해 주세요.' }
  if (CONTACT_RE.test(`${d.newStore?.alias ?? ''} ${d.newStore?.district ?? ''} ${d.comment}`)) {
    return { error: '연락처·링크·오픈채팅은 적을 수 없습니다. 매장은 별칭으로만 적어 주세요.' }
  }
  if (new Date(d.purchasedOn) > new Date()) return { error: '구매일이 미래 날짜입니다.' }

  const cost = reviewCost({
    discountType: d.discountType,
    payType: d.payType,
    devicePaid: d.devicePaid,
    installMonths: d.installMonths,
    planPrice: d.planPrice,
    planHoldMonths: d.planHoldMonths,
    planAfterPrice: d.planAfterPrice,
    addonMonthly: d.addonMonthly,
    addonMonths: d.addonMonths,
  })

  try {
    const result = await tx(async (c) => {
      // 1. 매장: 기존 선택 또는 새로 등록(같은 지역·별칭이면 기존 매장 사용)
      let store = d.storeId
        ? await one<{ id: string; alias: string; region: string; district: string }>(
            "select id, alias, region, district from stores where id = $1 and status = 'active'",
            [d.storeId],
            c,
          )
        : null
      if (!store && d.newStore) {
        store = await one(
          `insert into stores (alias, region, district, created_by) values ($1, $2, $3, $4)
           on conflict (region, lower(district), lower(alias)) do update set alias = stores.alias
           returning id, alias, region, district`,
          [d.newStore.alias, d.newStore.region, d.newStore.district, me.id],
          c,
        )
      }
      if (!store) throw new Error('STORE_NOT_FOUND')

      // 2. 한 사람이 같은 매장에 30일 안에 중복 후기 금지
      const dup = await one(
        "select 1 from store_reviews where store_id = $1 and author_id = $2 and created_at > now() - interval '30 days'",
        [store.id, me.id],
        c,
      )
      if (dup) throw new Error('DUPLICATE')

      // 3. 커뮤니티 글(성지 평가 후기 게시판)로도 게시 — 댓글·추천·검색 노출
      const board = await one<{ id: number }>("select id from boards where slug = 'review'", [], c)
      const avg = Math.round(((d.ratingPrice + d.ratingService + d.ratingTrust) / 3) * 10) / 10
      const title = `[${store.region}${store.district ? ' ' + store.district : ''}] ${store.alias} · ${d.deviceName} ${d.carrier} ${d.joinType} 후기 (${avg}점)`
      const html = [
        `<p><strong>${PROMISE_LABEL[d.promise]}</strong> · 평점 ${avg} (가격 ${d.ratingPrice} / 응대 ${d.ratingService} / 약속 이행 ${d.ratingTrust})</p>`,
        '<ul>',
        `<li>매장: ${esc(store.region)} ${esc(store.district)} ${esc(store.alias)}</li>`,
        `<li>기종: ${esc(d.deviceName)} (출고가 ${KRW(d.devicePrice)}원) · ${d.carrier} ${d.joinType} · ${d.discountType}</li>`,
        `<li>기기값: ${d.payType === '현금완납' ? `현금완납 ${KRW(d.devicePaid)}원` : `할부원금 ${KRW(d.devicePaid)}원 (${d.installMonths}개월)`}</li>`,
        `<li>요금제: 월 ${KRW(d.planPrice)}원 ${d.planHoldMonths}개월 유지 → 이후 월 ${KRW(d.planAfterPrice)}원</li>`,
        `<li>부가서비스: ${d.addonMonthly ? `월 ${KRW(d.addonMonthly)}원 × ${d.addonMonths}개월` : '없음'} · 제휴카드 조건: ${d.cardRequired ? '있음' : '없음'}</li>`,
        `<li><strong>실구매가 환산 ${KRW(cost.realPrice)}원</strong> (기기 실부담 ${KRW(cost.devicePart)}원 + 숨은 조건 비용 ${KRW(cost.hiddenCost)}원) · 24개월 총 납부 ${KRW(cost.total24)}원</li>`,
        `<li>구매일: ${d.purchasedOn}</li>`,
        '</ul>',
        d.comment ? `<p>${esc(d.comment).replace(/\n/g, '<br>')}</p>` : '',
      ].join('')

      const post = await one<{ id: string }>(
        'insert into posts (board_id, author_id, title, content) values ($1, $2, $3, $4) returning id',
        [board!.id, me.id, title.slice(0, 100), html],
        c,
      )

      const review = await one<{ id: string }>(
        `insert into store_reviews (store_id, post_id, author_id, carrier, device_name, device_price, join_type, discount_type, pay_type,
            device_paid, install_months, plan_price, plan_hold_months, plan_after_price, addon_monthly, addon_months, card_required,
            promise, rating_price, rating_service, rating_trust, purchased_on, real_price, hidden_cost, total_24m, comment)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) returning id`,
        [
          store.id, post!.id, me.id, d.carrier, d.deviceName, d.devicePrice, d.joinType, d.discountType, d.payType,
          d.devicePaid, d.payType === '할부' ? d.installMonths : 0, d.planPrice, d.planHoldMonths, d.planAfterPrice,
          d.addonMonthly, d.addonMonths, d.cardRequired, d.promise, d.ratingPrice, d.ratingService, d.ratingTrust,
          d.purchasedOn, cost.realPrice, cost.hiddenCost, cost.total24, d.comment || null,
        ],
        c,
      )
      // 구조화 후기는 일반 글보다 정보 가치가 높아 포인트 +20
      await awardPoints(me.id, 20, 'store_review', review!.id, c)
      return { storeId: store.id }
    })

    revalidatePath('/seongji')
    revalidatePath(`/seongji/${result.storeId}`)
    revalidatePath('/')
    return { success: true, storeId: result.storeId }
  } catch (e) {
    const msg = (e as Error).message
    if (msg === 'DUPLICATE') return { error: '같은 매장 후기는 30일에 한 번만 쓸 수 있습니다.' }
    if (msg === 'STORE_NOT_FOUND') return { error: '매장을 찾을 수 없습니다.' }
    console.error('createStoreReview 실패:', msg)
    return { error: '후기 저장 중 오류가 발생했습니다.' }
  }
}
