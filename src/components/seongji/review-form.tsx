'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Star } from 'lucide-react'
import { DEVICES } from '@/lib/calculator/devices'
import { createStoreReview, storesInRegion } from '@/lib/actions/seongji'
import { REGIONS, reviewCost } from '@/lib/seongji/cost'

const KRW = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n))
const toNum = (v: string) => Number(v.replace(/[^0-9]/g, '')) || 0
const NEW = '__new__'
const MANUAL = '__manual__'

const card = 'rounded-lg bg-white p-5 sm:p-[30px] dark:bg-[#111827]'
const h2 = 'text-[17px] font-bold text-black dark:text-white'
const label = 'mb-1 block text-[13px] font-bold text-[#666] dark:text-slate-400'
const field =
  'h-10 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 text-[14px] text-[#222] focus:border-[#5707EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const seg = (on: boolean) =>
  `h-10 flex-1 whitespace-nowrap px-3 text-[13px] font-bold ${on ? 'bg-[#5707EB] text-white dark:bg-[#A78BFA] dark:text-[#14082E]' : 'bg-white text-[#666] dark:bg-slate-900 dark:text-slate-300'}`

function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-[#E0E0E0] dark:border-slate-700">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} className={seg(value === o)} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

function Money({ id, value, onChange }: { id: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="relative">
      <input id={id} inputMode="numeric" className={`${field} pr-8 text-right tabular-nums`} value={KRW(value)} onChange={(e) => onChange(toNum(e.target.value))} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] text-[#999]">원</span>
    </div>
  )
}

function Stars({ value, onChange, name }: { value: number; onChange: (n: number) => void; name: string }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={name}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}점`} onClick={() => onChange(n)}>
          <Star className={`h-6 w-6 ${n <= value ? 'fill-[#FFB800] text-[#FFB800]' : 'text-[#DDD]'}`} />
        </button>
      ))}
      <span className="ml-1 text-[13px] font-bold text-[#666]">{value}점</span>
    </div>
  )
}

export default function ReviewForm({ initialStore }: { initialStore?: { id: string; region: string } }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  // 매장
  const [region, setRegion] = useState<string>(initialStore?.region ?? '서울')
  const [stores, setStores] = useState<{ id: string; alias: string; district: string }[]>([])
  const [storeId, setStoreId] = useState<string>(initialStore?.id ?? NEW)
  const [district, setDistrict] = useState('')
  const [alias, setAlias] = useState('')

  // 조건
  const [carrier, setCarrier] = useState<'SKT' | 'KT' | 'LGU+'>('SKT')
  const [deviceId, setDeviceId] = useState('갤럭시 S26-256GB')
  const [manualDevice, setManualDevice] = useState('')
  const [devicePrice, setDevicePrice] = useState(DEVICES.find((d) => d.id === '갤럭시 S26-256GB')?.price ?? 0)
  const [joinType, setJoinType] = useState<'번호이동' | '기기변경' | '신규가입'>('번호이동')
  const [discountType, setDiscountType] = useState<'공시지원금' | '선택약정'>('공시지원금')
  const [payType, setPayType] = useState<'현금완납' | '할부'>('현금완납')
  const [devicePaid, setDevicePaid] = useState(0)
  const [installMonths, setInstallMonths] = useState(24)
  const [planPrice, setPlanPrice] = useState(89000)
  const [planHoldMonths, setPlanHoldMonths] = useState(6)
  const [planAfterPrice, setPlanAfterPrice] = useState(59000)
  const [addonMonthly, setAddonMonthly] = useState(0)
  const [addonMonths, setAddonMonths] = useState(0)
  const [cardRequired, setCardRequired] = useState(false)
  const [promise, setPromise] = useState<'kept' | 'partial' | 'broken'>('kept')
  const [ratingPrice, setRatingPrice] = useState(5)
  const [ratingService, setRatingService] = useState(5)
  const [ratingTrust, setRatingTrust] = useState(5)
  const [purchasedOn, setPurchasedOn] = useState(today)
  const [comment, setComment] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    storesInRegion(region).then((list) => {
      if (!alive) return
      setStores(list)
      setStoreId((cur) => (cur !== NEW && !list.some((s) => s.id === cur) ? NEW : cur))
    })
    return () => {
      alive = false
    }
  }, [region])

  const deviceName = deviceId === MANUAL ? manualDevice.trim() : (() => {
    const d = DEVICES.find((x) => x.id === deviceId)
    return d ? `${d.model} ${d.storage}` : ''
  })()

  const cost = reviewCost({ discountType, payType, devicePaid, installMonths, planPrice, planHoldMonths, planAfterPrice, addonMonthly, addonMonths })

  const submit = async () => {
    setError('')
    if (!deviceName) return setError('기종을 입력해 주세요.')
    if (storeId === NEW && alias.trim().length < 2) return setError('매장 별칭을 2자 이상 입력해 주세요.')
    setLoading(true)
    try {
      const res = await createStoreReview({
        storeId: storeId === NEW ? null : storeId,
        newStore: storeId === NEW ? { region: region as (typeof REGIONS)[number], district: district.trim(), alias: alias.trim() } : null,
        carrier, deviceName, devicePrice, joinType, discountType, payType, devicePaid, installMonths,
        planPrice, planHoldMonths, planAfterPrice, addonMonthly, addonMonths, cardRequired, promise,
        ratingPrice, ratingService, ratingTrust, purchasedOn, comment,
      })
      if ('error' in res && res.error) setError(res.error)
      else if ('storeId' in res && res.storeId) {
        router.push(`/seongji/${res.storeId}`)
        router.refresh()
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. 매장 */}
      <section className={card}>
        <h2 className={h2}>1. 어느 성지에서 샀나요?</h2>
        <p className="mt-1 text-[13px] text-[#999]">매장 실명·전화번호·주소·오픈채팅은 적지 마세요. 지역과 별칭(예: &lsquo;강남역 3번출구 2층&rsquo;)으로 구분합니다.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
          <label>
            <span className={label}>지역</span>
            <select className={field} value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>매장</span>
            <select className={field} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value={NEW}>+ 새 매장 등록</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.district ? `${s.district} · ` : ''}
                  {s.alias}
                </option>
              ))}
            </select>
          </label>
        </div>
        {storeId === NEW && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
            <label>
              <span className={label}>구·동 (선택)</span>
              <input className={field} maxLength={20} placeholder="예: 강남구" value={district} onChange={(e) => setDistrict(e.target.value)} />
            </label>
            <label>
              <span className={label}>매장 별칭</span>
              <input className={field} maxLength={20} placeholder="예: 강남역 3번출구 2층" value={alias} onChange={(e) => setAlias(e.target.value)} />
            </label>
          </div>
        )}
      </section>

      {/* 2. 조건 */}
      <section className={card}>
        <h2 className={h2}>2. 실제 개통 조건</h2>
        <p className="mt-1 text-[13px] text-[#999]">시세표 금액이 아니라 계약서·청구서 기준으로 적어 주세요. 이 값으로 다른 후기와 같은 기준의 실구매가를 계산합니다.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>통신사</span>
            <Seg value={carrier} options={['SKT', 'KT', 'LGU+'] as const} onChange={setCarrier} />
          </div>
          <div>
            <span className={label}>가입 유형</span>
            <Seg value={joinType} options={['번호이동', '기기변경', '신규가입'] as const} onChange={setJoinType} />
          </div>
          <label>
            <span className={label}>기종</span>
            <select
              className={field}
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value)
                const d = DEVICES.find((x) => x.id === e.target.value)
                if (d) setDevicePrice(d.price)
              }}
            >
              {DEVICES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.model} {d.storage}
                </option>
              ))}
              <option value={MANUAL}>직접 입력</option>
            </select>
            {deviceId === MANUAL && <input className={`${field} mt-2`} maxLength={60} placeholder="기종명" value={manualDevice} onChange={(e) => setManualDevice(e.target.value)} />}
          </label>
          <label>
            <span className={label}>출고가</span>
            <Money id="r-price" value={devicePrice} onChange={setDevicePrice} />
          </label>
          <div>
            <span className={label}>할인 방식</span>
            <Seg value={discountType} options={['공시지원금', '선택약정'] as const} onChange={setDiscountType} />
          </div>
          <div>
            <span className={label}>기기값 지불</span>
            <Seg value={payType} options={['현금완납', '할부'] as const} onChange={setPayType} />
          </div>
          <label>
            <span className={label}>{payType === '현금완납' ? '현금완납가 (실제 낸 돈)' : '할부원금 (계약서 금액)'}</span>
            <Money id="r-paid" value={devicePaid} onChange={setDevicePaid} />
          </label>
          {payType === '할부' && (
            <label>
              <span className={label}>할부 개월</span>
              <select className={field} value={installMonths} onChange={(e) => setInstallMonths(Number(e.target.value))}>
                {[12, 24, 30, 36, 48].map((n) => (
                  <option key={n} value={n}>
                    {n}개월
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className={label}>가입 요금제 (월)</span>
            <Money id="r-plan" value={planPrice} onChange={setPlanPrice} />
          </label>
          <label>
            <span className={label}>요금제 유지 조건</span>
            <select className={field} value={planHoldMonths} onChange={(e) => setPlanHoldMonths(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? '유지 조건 없음' : `${m}개월 유지`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>유지 후 쓸 요금제 (월)</span>
            <Money id="r-after" value={planAfterPrice} onChange={setPlanAfterPrice} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className={label}>부가서비스 (월 합계)</span>
              <Money id="r-addon" value={addonMonthly} onChange={setAddonMonthly} />
            </label>
            <label>
              <span className={label}>부가 유지 개월</span>
              <select className={field} value={addonMonths} onChange={(e) => setAddonMonths(Number(e.target.value))}>
                {[0, 1, 2, 3, 4, 5, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m}개월
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-[14px] text-[#454545] dark:text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-[#5707EB]" checked={cardRequired} onChange={(e) => setCardRequired(e.target.checked)} />
            제휴카드 발급·실적 조건이 있었음
          </label>
          <label>
            <span className={label}>구매일</span>
            <input type="date" className={field} max={today} value={purchasedOn} onChange={(e) => setPurchasedOn(e.target.value)} />
          </label>
        </div>

        {/* 실구매가 미리보기 */}
        <div className="mt-5 grid grid-cols-1 gap-2 rounded-lg bg-[#F7F3FF] p-4 sm:grid-cols-3 dark:bg-[#2A1366]/40">
          <div>
            <p className="text-[12px] font-bold text-[#666]">기기 실부담</p>
            <p className="text-[17px] font-extrabold tabular-nums text-black dark:text-white">{KRW(cost.devicePart)}원</p>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#666]">숨은 조건 비용</p>
            <p className="text-[17px] font-extrabold tabular-nums text-rose-500">+{KRW(cost.hiddenCost)}원</p>
            <p className="text-[11px] text-[#999]">요금제 유지 차액 + 부가서비스</p>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#5707EB] dark:text-[#C4B5FD]">실구매가 환산</p>
            <p className="text-[20px] font-extrabold tabular-nums text-[#5707EB] dark:text-[#C4B5FD]">{KRW(cost.realPrice)}원</p>
            <p className="text-[11px] text-[#999]">24개월 총 납부 {KRW(cost.total24)}원</p>
          </div>
        </div>
      </section>

      {/* 3. 평가 */}
      <section className={card}>
        <h2 className={h2}>3. 평가</h2>
        <div className="mt-4 space-y-4">
          <div>
            <span className={label}>안내받은 조건대로 진행됐나요?</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  ['kept', '약속대로 진행'],
                  ['partial', '일부 달라짐'],
                  ['broken', '현장에서 조건 변경 (낚시)'],
                ] as const
              ).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={promise === v}
                  onClick={() => setPromise(v)}
                  className={`h-11 rounded-lg border text-[14px] font-bold ${
                    promise === v
                      ? v === 'broken'
                        ? 'border-rose-500 bg-rose-50 text-rose-600'
                        : 'border-[#5707EB] bg-[#F3EEFE] text-[#5707EB]'
                      : 'border-[#E0E0E0] text-[#666] dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <span className={label}>가격</span>
              <Stars name="가격 평점" value={ratingPrice} onChange={setRatingPrice} />
            </div>
            <div>
              <span className={label}>응대·설명</span>
              <Stars name="응대 평점" value={ratingService} onChange={setRatingService} />
            </div>
            <div>
              <span className={label}>약속 이행</span>
              <Stars name="약속 이행 평점" value={ratingTrust} onChange={setRatingTrust} />
            </div>
          </div>
          <label className="block">
            <span className={label}>후기 (선택)</span>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-[#E0E0E0] bg-white p-3 text-[14px] leading-relaxed focus:border-[#5707EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              maxLength={2000}
              placeholder="안내받은 내용과 실제 계약이 달랐던 점, 대기 시간, 개통 후 처리 등 다음 사람에게 도움이 될 내용을 적어 주세요."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
        </div>
      </section>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-[14px] font-bold text-rose-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="flex h-12 items-center gap-2 rounded-lg bg-[#5707EB] px-8 text-[16px] font-bold text-white hover:bg-[#4E07D2] disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          후기 등록 (+20 리터)
        </button>
      </div>
    </div>
  )
}
