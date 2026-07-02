'use client';

/**
 * 공시지원금 vs 선택약정 총비용 계산기
 * 사용자 제공 calculator-slice 코드 이식 및 Tailwind v4 프리미엄 스타일 리팩토링 적용
 */

import { useMemo, useState } from 'react';
import { Smartphone, Check, HelpCircle, Info } from 'lucide-react';

// ── 시드 프리셋 (출고가만 제공. 지원금은 통신사·요금제·시점별로 다르므로 반드시 직접 입력) ──
const DEVICE_PRESETS = [
  { label: '직접 입력 (아래에서 수정 가능)', price: 0 },
  { label: '갤럭시 S25 (256GB)', price: 1155000 },
  { label: '갤럭시 S25+ (256GB)', price: 1353000 },
  { label: '갤럭시 S25 울트라 (256GB)', price: 1698400 },
  { label: '아이폰 16 (128GB)', price: 1250000 },
  { label: '아이폰 16 프로 (256GB)', price: 1700000 },
];

const KRW = (n: number) =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(n));

export default function SubsidyCalculator() {
  // ── 입력 상태 ──
  const [devicePrice, setDevicePrice] = useState(1155000); // P_device 출고가
  const [publicSubsidy, setPublicSubsidy] = useState(500000); // S_public 공시지원금
  const [extraSubsidy, setExtraSubsidy] = useState(0); // S_extra 추가지원금(판매점)
  const [planHigh, setPlanHigh] = useState(89000); // P_high 유지 요금제(월, 부가세포함)
  const [holdMonths, setHoldMonths] = useState(6); // M 유지 의무 개월
  const [planLow, setPlanLow] = useState(49000); // P_low 이후 하향 요금제(월)
  const [term, setTerm] = useState<24>(24); // T 총 비교 기간(고정 24)

  const r = useMemo(() => {
    const M = Math.min(Math.max(holdMonths, 0), term);
    // 공통 요금 궤적(할인 전 원금 기준)
    const feeTrajectory = planHigh * M + planLow * (term - M);

    // ── 공시지원금 루트 ──
    const gongsiDevice = Math.max(devicePrice - publicSubsidy - extraSubsidy, 0);
    const gongsiFees = feeTrajectory; // 요금 할인 없음
    const gongsiTotal = gongsiDevice + gongsiFees;

    // ── 선택약정 루트 ──
    // 24개월 전 기간 25% 요금할인 적용
    const discounted = feeTrajectory * 0.75;
    const sunyakDevice = devicePrice; // 지원금 없음(자급가/할부원금 전액)
    const sunyakTotal = sunyakDevice + discounted;

    // ── 판정 부등식 양변 ──
    const subsidySide = publicSubsidy + extraSubsidy; // 받는 지원금 총액
    const discountSide = feeTrajectory - discounted; // 요금할인 총액
    const diff = sunyakTotal - gongsiTotal; // (+)면 공시 유리

    return { M, gongsiDevice, gongsiFees, gongsiTotal, sunyakDevice, discounted, sunyakTotal, subsidySide, discountSide, diff };
  }, [devicePrice, publicSubsidy, extraSubsidy, planHigh, holdMonths, planLow, term]);

  const winner = r.diff > 0 ? '공시지원금' : r.diff < 0 ? '선택약정' : '동일';

  // 테일윈드 스타일 바인딩
  const inputCls =
    'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-[15px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#7C3AED] dark:focus:ring-[#A78BFA] text-slate-800 dark:text-slate-100 transition';
  const labelCls = 'mb-1.5 block text-[13px] font-extrabold text-slate-600 dark:text-slate-400';

  const num = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(Number(e.target.value.replace(/[^0-9]/g, '')) || 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      
      {/* ── 입력부 ── */}
      <section
        aria-label="계산 조건 입력"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#111827] dark:border-slate-800"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="device">
              기기 선택 (출고가 자동 입력)
            </label>
            <div className="relative">
              <select
                id="device"
                className={`${inputCls} appearance-none cursor-pointer pr-10`}
                onChange={(e) => {
                  const p = DEVICE_PRESETS[Number(e.target.value)];
                  if (p.price > 0) setDevicePrice(p.price);
                }}
              >
                {DEVICE_PRESETS.map((d, i) => (
                  <option key={d.label} value={i} className="dark:bg-[#111827]">{d.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                <Smartphone className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="price">출고가 (원)</label>
            <input id="price" inputMode="numeric" className={inputCls} value={KRW(devicePrice)} onChange={num(setDevicePrice)} />
          </div>
          
          <div>
            <label className={labelCls} htmlFor="pub">
              공시지원금 (원) 
              <span className="font-normal text-[11px] text-slate-400 pl-1">(통신사별 확인 필요)</span>
            </label>
            <input id="pub" inputMode="numeric" className={inputCls} value={KRW(publicSubsidy)} onChange={num(setPublicSubsidy)} />
          </div>
          
          <div>
            <label className={labelCls} htmlFor="extra">추가지원금 (원) — 판매점 지급분</label>
            <input id="extra" inputMode="numeric" className={inputCls} value={KRW(extraSubsidy)} onChange={num(setExtraSubsidy)} />
          </div>
          
          <div>
            <label className={labelCls} htmlFor="high">유지 요금제 (월, 부가세 포함)</label>
            <input id="high" inputMode="numeric" className={inputCls} value={KRW(planHigh)} onChange={num(setPlanHigh)} />
          </div>
          
          <div>
            <label className={labelCls} htmlFor="hold">요금제 유지 의무 기간 (개월)</label>
            <input id="hold" inputMode="numeric" className={inputCls} value={holdMonths} onChange={(e) => setHoldMonths(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} />
          </div>
          
          <div>
            <label className={labelCls} htmlFor="low">유지 후 하향 요금제 (월)</label>
            <input id="low" inputMode="numeric" className={inputCls} value={KRW(planLow)} onChange={num(setPlanLow)} />
          </div>
          


        </div>
      </section>

      {/* ── 판정부 (시그니처: 부등식 양변을 금액으로 병기) ── */}
      <section aria-label="판정 결과" className="space-y-4">
        
        <div className="rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-white/10 w-24 h-24 rounded-full -mr-6 -mt-6 pointer-events-none" />
          <p className="text-[12px] font-extrabold uppercase tracking-widest text-purple-200">
            24개월 총비용 판정 결과
          </p>
          <h2 className="mt-1.5 text-2xl font-black">
            {winner === '동일' ? (
              '두 방식의 총비용이 동일합니다'
            ) : (
              <>{winner}이 <span className="tabular-nums font-extrabold underline decoration-white decoration-2 underline-offset-4">{KRW(Math.abs(r.diff))}원</span> 더 유리</>
            )}
          </h2>
          
          {/* 판정 원리 노출 — AEO 인용 가능 문장 */}
          <div className="mt-4 border-t border-white/20 pt-4 text-[14px] leading-relaxed text-purple-100 flex flex-col sm:flex-row justify-between gap-2">
            <div>
              받는 지원금 총액 <b className="tabular-nums text-white text-base">{KRW(r.subsidySide)}원</b>
              {' vs '}
              요금할인 총액 <b className="tabular-nums text-white text-base">{KRW(r.discountSide)}원</b>
            </div>
            <div className="text-xs text-purple-200 font-bold self-end sm:self-center">
              * 지원금이 크면 공시, 할인이 크면 선약 유리!
            </div>
          </div>
        </div>

        {/* 상세 비교 표 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { name: '공시지원금 (기기값 직접 할인)', device: r.gongsiDevice, fees: r.gongsiFees, total: r.gongsiTotal, win: r.diff > 0 },
            { name: '선택약정 (매월 요금 25% 할인)', device: r.sunyakDevice, fees: r.discounted, total: r.sunyakTotal, win: r.diff < 0 },
          ].map((c) => (
            <div
              key={c.name}
              className={`rounded-2xl border p-5 transition ${
                c.win
                  ? 'border-[#7C3AED] dark:border-[#A78BFA] bg-[#F5F3FF] dark:bg-[#1E1B4B]/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-black text-slate-800 dark:text-slate-100">
                  {c.name}
                </p>
                {c.win && (
                  <span className="flex items-center gap-0.5 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                    <Check className="h-3 w-3" />
                    추천
                  </span>
                )}
              </div>
              
              <dl className="mt-4 space-y-2 text-[14px] font-bold text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <dt className="text-slate-400 font-medium">기기값 실부담</dt>
                  <dd className="tabular-nums text-slate-800 dark:text-slate-200">{KRW(c.device)}원</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400 font-medium">요금 납부액 ({term}개월)</dt>
                  <dd className="tabular-nums text-slate-800 dark:text-slate-200">{KRW(c.fees)}원</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 font-black text-slate-950 dark:text-white">
                  <dt>2년 총비용</dt>
                  <dd className="tabular-nums text-base text-[#7C3AED] dark:text-[#A78BFA]">{KRW(c.total)}원</dd>
                </div>
                <div className="flex justify-between text-[13px] text-slate-400 dark:text-slate-500 font-medium">
                  <dt>월평균 환산액</dt>
                  <dd className="tabular-nums">{KRW(c.total / term)}원/월</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {/* 고지 — 정직한 한계 명시 */}
        <div className="rounded-xl bg-slate-50 dark:bg-[#1E293B]/20 p-4 border border-slate-100 dark:border-slate-800/60">
          <p className="text-[12px] leading-relaxed text-slate-400 dark:text-slate-500 font-bold flex gap-1 items-start">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              ※ 24개월 약정 완주를 가정한 계산입니다. 중도 해지·요금제 조기 변경 시 공시지원금은
              지원금 반환금(위약금4), 선택약정은 할인반환금이 발생하며 구조가 서로 다릅니다. 결합할인·제휴카드 할인은
              두 방식에 동일하게 적용되므로 비교 결과에 직접적인 영향을 주지 않습니다. 요금은 부가세 포함
              청구액 기준으로 입력하세요.
            </span>
          </p>
        </div>

      </section>
      
    </div>
  );
}
