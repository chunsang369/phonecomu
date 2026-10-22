'use client'

/**
 * 광고 자리 (클라이언트 컴포넌트)
 *
 * 사용: <AdSlot slot="home-top" />  (슬롯 목록·크기: src/lib/ads/index.ts)
 *       <AdSlot placement="home-sidebar" />  (Aside 작성 버전과 같은 호출 방식도 지원)
 *
 * 노출 순서
 *   1) NEXT_PUBLIC_AD_PROVIDER(adsense | adfit | coupang) 가 있고 해당 자리 단위 ID가 있으면 그 네트워크 광고
 *      ※ 애드핏 운영정책상 한 페이지에 여러 네트워크를 동시에 넣지 않는다 → 네트워크는 하나만 사용
 *   2) 없으면 자사 광고(NEXT_PUBLIC_HOUSE_AD_URL/TITLE/DESC)
 *   3) 그것도 없으면 '광고 영역' 자리표시 (NEXT_PUBLIC_HIDE_AD_PLACEHOLDER=1 이면 렌더링 안 함)
 * 자리 크기를 먼저 확보해 광고가 늦게 떠도 레이아웃이 밀리지 않게 하고(CLS 0), 광고에는 회색 '광고' 라벨을 붙인다.
 *
 * 2026-10-22: Aside 가 만든 동명 파일을 Claude Code 가 실수로 덮어써 원본이 유실됨.
 * ad-config.ts(설정)는 그대로 두고 같은 설계로 다시 작성함.
 */

import { useEffect, useRef } from 'react'
import { adConfig, AD_SIZES, type AdPlacement } from './ad-config'
import { AD_SLOTS, type AdSlotId } from '@/lib/ads'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
    PartnersCoupang?: { G: new (opts: Record<string, unknown>) => unknown }
  }
}

const HIDE_PLACEHOLDER = process.env.NEXT_PUBLIC_HIDE_AD_PLACEHOLDER === '1'

function loadScript(src: string, attrs: Record<string, string> = {}) {
  return new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded) resolve()
      else existing.addEventListener('load', () => resolve(), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v))
    s.addEventListener('load', () => {
      s.dataset.loaded = '1'
      resolve()
    }, { once: true })
    document.head.appendChild(s)
  })
}

export default function AdSlot({ slot, placement: placementProp, className = '' }: { slot?: AdSlotId; placement?: AdPlacement; className?: string }) {
  const spec = slot ? AD_SLOTS[slot] : null
  const placement: AdPlacement = spec?.placement ?? placementProp ?? 'home-sidebar'
  const size = spec ? { w: spec.width, h: spec.height } : AD_SIZES[placement]
  const name = spec?.name ?? placement

  const provider = adConfig.provider
  const unit =
    provider === 'adsense' ? adConfig.adsenseSlot(placement) : provider === 'adfit' ? adConfig.adfitUnit(placement) : provider === 'coupang' ? adConfig.coupangWidget(placement) : ''
  const useNetwork = !!provider && !!unit && (provider !== 'adsense' || !!adConfig.adsenseClient) && (provider !== 'coupang' || !!adConfig.coupangTrackingCode)
  const house = adConfig.house

  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!useNetwork) return
    const box = boxRef.current
    if (!box) return
    if (provider === 'adsense') {
      loadScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adConfig.adsenseClient}`, { crossorigin: 'anonymous' }).then(() => {
        try {
          ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        } catch {
          /* 광고 차단 등 */
        }
      })
    } else if (provider === 'adfit') {
      loadScript('https://t1.daumcdn.net/kas/static/ba.min.js')
    } else if (provider === 'coupang') {
      loadScript('https://ads-partners.coupang.com/g.js').then(() => {
        if (!window.PartnersCoupang) return
        // 쿠팡 위젯을 이 자리에 렌더링 (container 옵션 지원 여부는 실제 위젯 ID로 연동할 때 확인 필요 [미확인])
        new window.PartnersCoupang.G({
          id: Number(unit),
          trackingCode: adConfig.coupangTrackingCode,
          template: 'carousel',
          width: String(size.w),
          height: String(size.h),
          container: box.id,
        })
      })
    }
  }, [useNetwork, provider, unit, size.w, size.h])

  const hasHouse = !useNetwork && !!house.url && !!house.title
  if (!useNetwork && !hasHouse && HIDE_PLACEHOLDER) return null

  return (
    <aside
      aria-label="광고"
      data-ad-slot={slot ?? placement}
      className={`relative w-full overflow-hidden rounded-lg bg-white dark:bg-[#111827] ${className}`}
      style={{ aspectRatio: `${size.w} / ${size.h}`, maxWidth: spec ? undefined : size.w }}
    >
      {useNetwork && (
        <div ref={boxRef} id={`ad-${slot ?? placement}`} className="flex h-full w-full items-center justify-center">
          {provider === 'adsense' && (
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', height: '100%' }}
              data-ad-client={adConfig.adsenseClient}
              data-ad-slot={unit}
              data-full-width-responsive="true"
            />
          )}
          {provider === 'adfit' && (
            <ins className="kakao_ad_area" style={{ display: 'none' }} data-ad-unit={unit} data-ad-width={String(size.w)} data-ad-height={String(size.h)} />
          )}
        </div>
      )}

      {hasHouse && (
        <a href={house.url} target="_blank" rel="sponsored noopener" className="flex h-full w-full flex-col justify-center gap-1 bg-[#F3EEFE] px-5 dark:bg-[#2A1366]/40">
          <span className="text-[15px] font-extrabold text-[#5707EB] dark:text-[#C4B5FD]">{house.title}</span>
          {house.desc && <span className="text-[12px] text-[#666] dark:text-slate-300">{house.desc}</span>}
        </a>
      )}

      {!useNetwork && !hasHouse && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 border border-dashed border-[#D9DCE1] bg-[#FAFBFC] text-center dark:border-slate-700 dark:bg-slate-900/40">
          <span className="text-[13px] font-bold text-[#AAA]">광고 영역</span>
          <span className="text-[11px] text-[#BBB]">
            {name} · {size.w}×{size.h}
          </span>
        </div>
      )}

      <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/35 px-1.5 py-[1px] text-[10px] font-medium text-white">광고</span>
    </aside>
  )
}
