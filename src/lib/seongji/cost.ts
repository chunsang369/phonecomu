/**
 * 성지 후기 조건 → 비교 가능한 금액으로 환산 (서버·클라이언트 공용 순수 함수)
 *
 * 시세표의 '기기값'만으로는 매장끼리 비교가 안 된다(요금제 유지·부가서비스·카드 조건이 숨어 있음).
 * 그래서 후기마다 아래 세 값을 같은 기준으로 계산해 저장·비교한다.
 *  - 기기 실부담   : 현금완납가, 또는 할부원금 + 할부이자(연 5.9% 원리금균등 가정)
 *  - 숨은 조건 비용 : (가입 요금제 − 유지 후 요금제) × 유지 개월 + 부가서비스 월 합계 × 유지 개월
 *                    → 원래 쓰려던 요금제보다 '더 내야 했던 돈'. 선택약정이면 요금 25% 할인 반영
 *  - 실구매가 환산 = 기기 실부담 + 숨은 조건 비용
 *  - 24개월 총 납부액 = 기기 실부담 + 24개월 요금 + 부가서비스
 */
import { installment, SELECTIVE_RATE, TERM } from '@/lib/calculator/engine'

export const INSTALL_RATE = 5.9

export type ReviewCostInput = {
  discountType: '공시지원금' | '선택약정'
  payType: '현금완납' | '할부'
  devicePaid: number
  installMonths: number
  planPrice: number
  planHoldMonths: number
  planAfterPrice: number
  addonMonthly: number
  addonMonths: number
}

export function reviewCost(i: ReviewCostInput) {
  const months = i.payType === '할부' ? Math.max(i.installMonths, 1) : 0
  const devicePart = i.payType === '현금완납' ? i.devicePaid : Math.round(installment(i.devicePaid, months, INSTALL_RATE) * months)
  const rate = i.discountType === '선택약정' ? 1 - SELECTIVE_RATE : 1
  const hold = Math.min(Math.max(i.planHoldMonths, 0), TERM)
  const planTotal = Math.round((i.planPrice * hold + i.planAfterPrice * (TERM - hold)) * rate)
  const extraPlan = Math.max(Math.round((i.planPrice - i.planAfterPrice) * hold * rate), 0)
  const addon = Math.max(i.addonMonthly, 0) * Math.max(i.addonMonths, 0)
  const hiddenCost = extraPlan + addon
  return {
    devicePart,
    hiddenCost,
    realPrice: devicePart + hiddenCost,
    total24: devicePart + planTotal + addon,
  }
}

export const PROMISE_LABEL: Record<string, string> = {
  kept: '약속대로 진행',
  partial: '일부 달라짐',
  broken: '현장에서 조건 변경',
}

export const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'] as const
