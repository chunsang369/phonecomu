/**
 * 광고 자리(슬롯) 등록부 — 아이보스 홈 실측 비율(1400px 레이아웃) 기준
 *
 * 광고 네트워크 설정은 src/components/ads/ad-config.ts(.env.local 의 NEXT_PUBLIC_* 값, Aside 작성)를 따른다.
 * 각 슬롯은 네트워크 광고 단위(placement) 하나에 연결된다. 네트워크·자사 광고가 모두 없으면
 * AdSlot 이 같은 크기의 '광고 영역' 자리표시를 그린다(레이아웃 밀림 없음).
 * 자체 광고 API 를 붙일 때는 AdSlot 의 house/네트워크 분기 앞에 그 API 결과를 넣으면 된다.
 */
import type { AdPlacement } from '@/components/ads/ad-config'

export type AdSlotId = 'home-top' | 'home-side' | 'board-top' | 'board-side' | 'post-bottom' | 'post-side' | 'calc-bottom'

export type AdSlotSpec = {
  name: string
  width: number // 권장 소재 가로(px)
  height: number // 권장 소재 세로(px)
  placement: AdPlacement // 연결할 네트워크 광고 단위
}

export const AD_SLOTS: Record<AdSlotId, AdSlotSpec> = {
  'home-top': { name: '홈 상단 메인 배너', width: 820, height: 124, placement: 'board-list' },
  'home-side': { name: '홈 우측 사이드 배너', width: 360, height: 300, placement: 'home-sidebar' },
  'board-top': { name: '게시판 목록 상단 배너', width: 820, height: 100, placement: 'board-list' },
  'board-side': { name: '게시판 우측 사이드 배너', width: 360, height: 300, placement: 'home-sidebar' },
  'post-bottom': { name: '글 본문 하단 배너', width: 728, height: 90, placement: 'post-bottom' },
  'post-side': { name: '글 상세 우측 사이드 배너', width: 360, height: 300, placement: 'home-sidebar' },
  'calc-bottom': { name: '요금계산기 하단 배너', width: 1280, height: 120, placement: 'board-list' },
}
