// 광고 설정. 값은 모두 .env(.local)의 NEXT_PUBLIC_* 로 넣는다(공개 ID라 비밀값 아님).
// 아무 값도 없으면 광고 영역은 렌더링되지 않는다.
//
// NEXT_PUBLIC_AD_PROVIDER = adsense | adfit | coupang   (사이트 전체에 한 네트워크만 사용)
//   ※ 카카오 애드핏 운영정책: 타 광고 네트워크 스크립트를 한 페이지에 동시에 여러 개 게재하면 반려 사유.
//     그래서 네트워크는 하나만 고르고, 비어 있는 자리만 자사 광고(house)로 채운다.

export type AdPlacement = 'home-sidebar' | 'post-bottom' | 'board-list'

export type AdProvider = 'adsense' | 'adfit' | 'coupang'

// Next는 NEXT_PUBLIC_* 를 빌드 시 문자열로 치환하므로 키를 그대로 적어야 한다.
const ADSENSE_SLOTS: Record<AdPlacement, string> = {
  'home-sidebar': (process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_SIDEBAR ?? '').trim(),
  'post-bottom': (process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_BOTTOM ?? '').trim(),
  'board-list': (process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOARD_LIST ?? '').trim(),
}

const ADFIT_UNITS: Record<AdPlacement, string> = {
  'home-sidebar': (process.env.NEXT_PUBLIC_ADFIT_UNIT_HOME_SIDEBAR ?? '').trim(),
  'post-bottom': (process.env.NEXT_PUBLIC_ADFIT_UNIT_POST_BOTTOM ?? '').trim(),
  'board-list': (process.env.NEXT_PUBLIC_ADFIT_UNIT_BOARD_LIST ?? '').trim(),
}

// 쿠팡 파트너스 다이내믹 배너: 위젯 id + 트래킹코드
const COUPANG_WIDGETS: Record<AdPlacement, string> = {
  'home-sidebar': (process.env.NEXT_PUBLIC_COUPANG_WIDGET_HOME_SIDEBAR ?? '').trim(),
  'post-bottom': (process.env.NEXT_PUBLIC_COUPANG_WIDGET_POST_BOTTOM ?? '').trim(),
  'board-list': (process.env.NEXT_PUBLIC_COUPANG_WIDGET_BOARD_LIST ?? '').trim(),
}

// 자리별 크기 (애드핏·쿠팡은 고정 크기 광고 단위)
export const AD_SIZES: Record<AdPlacement, { w: number; h: number }> = {
  'home-sidebar': { w: 300, h: 250 },
  'post-bottom': { w: 320, h: 100 },
  'board-list': { w: 320, h: 100 },
}

export const adConfig = {
  provider: (process.env.NEXT_PUBLIC_AD_PROVIDER ?? '').trim() as AdProvider | '',
  adsenseClient: (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '').trim(), // ca-pub-xxxxxxxx
  coupangTrackingCode: (process.env.NEXT_PUBLIC_COUPANG_TRACKING_CODE ?? '').trim(), // AF0000000
  house: {
    url: (process.env.NEXT_PUBLIC_HOUSE_AD_URL ?? '').trim(),
    title: (process.env.NEXT_PUBLIC_HOUSE_AD_TITLE ?? '').trim(),
    desc: (process.env.NEXT_PUBLIC_HOUSE_AD_DESC ?? '').trim(),
  },
  adsenseSlot: (p: AdPlacement) => ADSENSE_SLOTS[p],
  adfitUnit: (p: AdPlacement) => ADFIT_UNITS[p],
  coupangWidget: (p: AdPlacement) => COUPANG_WIDGETS[p],
}
