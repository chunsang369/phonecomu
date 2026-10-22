/**
 * 공시지원금 vs 선택약정 계산 엔진 (순수 함수, 서버·클라이언트 공용)
 *
 * 전제
 * - 단통법 폐지(2025-07-22) 이후: 추가지원금 상한 없음, 선택약정과 추가지원금 중복 수령 가능.
 * - 선택약정 할인율 25%, 비교 기간 24개월.
 * - 할부수수료: 원리금균등, 기본 연 5.9%(통신 3사 공통 관행. 계약서 기준으로 수정 가능).
 * - 해지 위약금은 추정식(아래 earlyTermination 주석 참고). 실제 청구액은 통신사 조회가 정확함.
 */

export const SELECTIVE_RATE = 0.25;
export const TERM = 24;

export type CalcInput = {
  price: number; // 출고가
  publicSubsidy: number; // 공시지원금
  switchSubsidy: number; // 전환지원금(번호이동, 공시 루트만)
  extraSubsidy: number; // 추가지원금(유통점)
  extraOnSelective: boolean; // 선택약정에도 추가지원금 적용
  installMonths: number; // 0 = 일시불
  annualRate: number; // 할부수수료 연이율(%)
  planHigh: number; // 가입 요금제 월 요금
  holdMonths: number; // 가입 요금제 유지 개월
  planLow: number; // 유지 후 변경 요금제 월 요금
};

export type Route = {
  key: 'public' | 'selective';
  label: string;
  principal: number; // 할부원금
  monthlyInstall: number; // 월 할부금(원금+이자)
  monthlyInterestAvg: number;
  interestTotal: number;
  deviceTotal: number; // 기기 총부담(원금+이자)
  feeTotal: number; // 24개월 요금(할인 후)
  discountTotal: number; // 24개월 요금할인 총액
  total: number; // 24개월 총비용
  months: { m: number; install: number; fee: number; discount: number; bill: number }[];
};

const won = (n: number) => Math.round(n);

/** 원리금균등 월 납입액 */
export function installment(principal: number, months: number, annualRate: number) {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** k회 납부 후 남은 할부원금 */
export function remainingPrincipal(principal: number, months: number, annualRate: number, paid: number) {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const k = Math.min(paid, months);
  if (r === 0) return principal * (1 - k / months);
  const pmt = installment(principal, months, annualRate);
  return principal * Math.pow(1 + r, k) - pmt * ((Math.pow(1 + r, k) - 1) / r);
}

export function feeAt(m: number, i: Pick<CalcInput, 'planHigh' | 'holdMonths' | 'planLow'>) {
  return m <= i.holdMonths ? i.planHigh : i.planLow;
}

function buildRoute(key: Route['key'], principal: number, discountRate: number, i: CalcInput): Route {
  const n = i.installMonths;
  const pmt = installment(principal, n, i.annualRate);
  const deviceTotal = n > 0 ? pmt * n : principal;
  const months: Route['months'] = [];
  let feeTotal = 0;
  let discountTotal = 0;
  for (let m = 1; m <= TERM; m++) {
    const fee = feeAt(m, i);
    const discount = won(fee * discountRate);
    const install = n > 0 && m <= n ? pmt : 0;
    feeTotal += fee - discount;
    discountTotal += discount;
    months.push({ m, install: won(install), fee, discount, bill: won(install + fee - discount) });
  }
  // 할부가 24개월을 넘으면 25개월차 이후 할부금은 총비용에만 포함(요금은 비교기간 밖)
  return {
    key,
    label: key === 'public' ? '공시지원금' : '선택약정',
    principal: won(principal),
    monthlyInstall: won(pmt),
    monthlyInterestAvg: n > 0 ? won((deviceTotal - principal) / n) : 0,
    interestTotal: won(deviceTotal - principal),
    deviceTotal: won(deviceTotal),
    feeTotal: won(feeTotal),
    discountTotal: won(discountTotal),
    total: won(deviceTotal + feeTotal),
    months,
  };
}

export function calculate(i: CalcInput) {
  const pub = buildRoute(
    'public',
    Math.max(i.price - i.publicSubsidy - i.switchSubsidy - i.extraSubsidy, 0),
    0,
    i,
  );
  const sel = buildRoute(
    'selective',
    Math.max(i.price - (i.extraOnSelective ? i.extraSubsidy : 0), 0),
    SELECTIVE_RATE,
    i,
  );
  const diff = sel.total - pub.total; // +면 공시 유리
  // 판정 부등식: 공시 쪽에만 붙는 지원금 vs 선택약정 요금할인 총액(할부이자 차이 포함)
  const subsidyOnlyPublic = i.publicSubsidy + i.switchSubsidy + (i.extraOnSelective ? 0 : i.extraSubsidy);
  return { pub, sel, diff, winner: diff > 0 ? 'public' : diff < 0 ? 'selective' : 'tie', subsidyOnlyPublic } as const;
}

/**
 * m개월 사용 후 해지 시 예상 비용 (추정)
 * - 공시지원금 반환금: (공시+전환지원금) × 잔여개월/24  ※ 일할 계산을 개월로 근사
 * - 선택약정 할인반환금: 6개월 이내 누적할인 100%, 이후 누적할인 × 잔여개월/(24-6)  ※ KT 공개 산식 기준, 통신사별 상이
 * - 잔여 할부원금: 해지 시 일시 상환 또는 할부 유지
 */
export function earlyTermination(i: CalcInput, m: number) {
  const r = calculate(i);
  const left = Math.max(TERM - m, 0);
  const pubRefund = won((i.publicSubsidy + i.switchSubsidy) * (left / TERM));
  const accDiscount = r.sel.months.slice(0, m).reduce((s, x) => s + x.discount, 0);
  const selRefund = won(m <= 6 ? accDiscount : accDiscount * Math.min(left / (TERM - 6), 1));
  return {
    pubRefund,
    selRefund,
    accDiscount: won(accDiscount),
    pubRemain: won(remainingPrincipal(r.pub.principal, i.installMonths, i.annualRate, m)),
    selRemain: won(remainingPrincipal(r.sel.principal, i.installMonths, i.annualRate, m)),
  };
}

/** 요금제를 24개월 유지할 때, 공시지원금이 선택약정보다 유리해지는 최소 지원금(손익분기) */
export function breakEvenSubsidy(monthlyFee: number) {
  return won(monthlyFee * SELECTIVE_RATE * TERM);
}
