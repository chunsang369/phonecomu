'use client';

/**
 * 스마트폰 요금계산기 — 세티즌(fee.cetizen.com) 방식의 한 화면 비교표
 * - 위: 통신사 · 제조사 · 제품 · 요금제분류 · 가입조건 패널
 * - 아래: 요금제마다 [공시지원금 / 선택약정] 두 줄로 월 청구액 산식 표시, 유리한 쪽 강조
 * 요금제: 스마트초이스 Open API(서버에서 하루 캐시 후 props로 전달)
 * 출고가: src/lib/calculator/devices.ts · 계산식: src/lib/calculator/engine.ts
 */

import { useMemo, useState } from 'react';
import { Info, RotateCcw, Search } from 'lucide-react';
import { DEVICES, DEVICE_PRICE_AS_OF, type Maker } from '@/lib/calculator/devices';
import type { Age, Carrier, Plan, PlanSegment, Recommendation } from '@/lib/calculator/smartchoice';
import { calculate, earlyTermination, SELECTIVE_RATE, TERM, type CalcInput } from '@/lib/calculator/engine';

const KRW = (n: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(n));
const toNum = (v: string) => Number(v.replace(/[^0-9]/g, '')) || 0;

const CARRIERS: { id: Carrier; label: string }[] = [
  { id: 'SKT', label: 'SKT' },
  { id: 'KT', label: 'KT' },
  { id: 'LGU+', label: 'LG U+' },
];
const MAKERS: { id: Maker; label: string }[] = [
  { id: '삼성', label: '삼성전자' },
  { id: '애플', label: '애플' },
];
const SEGMENTS: PlanSegment[] = ['일반', '청년', '청소년', '시니어'];
const JOIN_TYPES = ['번호이동', '기기변경', '신규가입'] as const;
const INSTALLS = [0, 12, 24, 30, 36, 48];
type JoinType = (typeof JOIN_TYPES)[number];
type View = 'all' | 'public' | 'selective';

const BRAND = 'text-[#5707EB] dark:text-[#A78BFA]';
const colHead = 'border-b border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-[12px] font-bold text-[#666] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300';
const listItem = (on: boolean) =>
  `block w-full px-3 py-1.5 text-left text-[13px] transition ${
    on ? 'bg-[#F3EEFE] font-bold text-[#5707EB] dark:bg-[#2A1366] dark:text-[#C4B5FD]' : 'text-[#454545] hover:bg-[#F7F8FA] dark:text-slate-300 dark:hover:bg-slate-800'
  }`;
const chip = (on: boolean) =>
  `shrink-0 rounded-md border px-3 py-1.5 text-[13px] font-bold transition ${
    on
      ? 'border-[#5707EB] bg-[#5707EB] text-white dark:border-[#A78BFA] dark:bg-[#A78BFA] dark:text-[#14082E]'
      : 'border-[#DDD] bg-white text-[#555] hover:border-[#5707EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
  }`;
const fieldCls =
  'rounded-md border border-[#DDD] bg-white px-2.5 py-1.5 text-right text-[13px] tabular-nums text-[#222] focus:border-[#5707EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

function Money({ id, value, onChange, disabled, className = 'w-full', label }: { id?: string; value: number; onChange: (n: number) => void; disabled?: boolean; className?: string; label?: string }) {
  return (
    <input
      id={id}
      aria-label={label}
      inputMode="numeric"
      disabled={disabled}
      className={`${fieldCls} disabled:opacity-40 ${className}`}
      value={KRW(value)}
      onChange={(e) => onChange(toNum(e.target.value))}
    />
  );
}

export default function PhoneFeeCalculator({ plans, plansFetchedAt, plansError }: { plans: Plan[]; plansFetchedAt: string; plansError?: string }) {
  // ── 선택 패널 ──
  const [carrier, setCarrier] = useState<Carrier>('SKT');
  const [maker, setMaker] = useState<Maker>('삼성');
  const [deviceId, setDeviceId] = useState('갤럭시 S26-256GB');
  const [price, setPrice] = useState(DEVICES.find((d) => d.id === '갤럭시 S26-256GB')?.price ?? 0);
  const [segment, setSegment] = useState<PlanSegment>('일반');

  // ── 가입 조건 ──
  const [joinType, setJoinType] = useState<JoinType>('번호이동');
  const [installMonths, setInstallMonths] = useState(24);
  const [annualRate, setAnnualRate] = useState(5.9);
  const [bulkPublic, setBulkPublic] = useState(0);
  const [perPlan, setPerPlan] = useState<Record<string, number>>({});
  const [switchSubsidy, setSwitchSubsidy] = useState(0);
  const [extraSubsidy, setExtraSubsidy] = useState(0);
  const [extraOnSelective, setExtraOnSelective] = useState(true);

  // ── 표 옵션 ──
  const [view, setView] = useState<View>('all');
  const [quitMonth, setQuitMonth] = useState(0);

  const makerDevices = DEVICES.filter((d) => d.maker === maker);
  const device = DEVICES.find((d) => d.id === deviceId);
  const carrierPlans = useMemo(() => plans.filter((p) => p.carrier === carrier), [plans, carrier]);
  const rows = useMemo(() => carrierPlans.filter((p) => p.segment === segment), [carrierPlans, segment]);

  const pickDevice = (id: string) => {
    setDeviceId(id);
    const d = DEVICES.find((x) => x.id === id);
    if (d) setPrice(d.price);
    setPerPlan({}); // 기기가 바뀌면 요금제별 공시지원금도 달라지므로 초기화
  };
  const pickMaker = (m: Maker) => {
    setMaker(m);
    const first = DEVICES.find((d) => d.maker === m);
    if (first) pickDevice(first.id);
  };
  const pickCarrier = (c: Carrier) => {
    setCarrier(c);
    setPerPlan({});
    if (!plans.some((p) => p.carrier === c && p.segment === segment)) setSegment('일반');
  };
  const reset = () => {
    setBulkPublic(0);
    setPerPlan({});
    setSwitchSubsidy(0);
    setExtraSubsidy(0);
    setQuitMonth(0);
  };

  const subsidyOf = (p: Plan) => perPlan[p.id] ?? bulkPublic;
  const setPlanSubsidy = (id: string, n: number) => setPerPlan((m) => ({ ...m, [id]: n }));

  const results = rows.map((p) => {
    const input: CalcInput = {
      price,
      publicSubsidy: subsidyOf(p),
      switchSubsidy: joinType === '번호이동' ? switchSubsidy : 0,
      extraSubsidy,
      extraOnSelective,
      installMonths,
      annualRate,
      planHigh: p.price,
      holdMonths: TERM,
      planLow: p.price,
    };
    return { plan: p, input, r: calculate(input), quit: quitMonth ? earlyTermination(input, quitMonth) : null };
  });

  const deviceLabel = device ? `${device.model} ${device.storage}` : '직접 입력';
  const cond: CondProps = {
    joinType, setJoinType, installMonths, setInstallMonths, annualRate, setAnnualRate, bulkPublic,
    switchSubsidy, setSwitchSubsidy, extraSubsidy, setExtraSubsidy, extraOnSelective, setExtraOnSelective, price, setPrice,
    onBulk: (n) => {
      setBulkPublic(n);
      setPerPlan({});
    },
  };

  return (
    <div className="space-y-4">
      {/* ───────── 선택 패널 (PC: 세티즌식 5열 / 모바일: 세로) ───────── */}
      <section aria-label="계산 조건" className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white dark:border-slate-800 dark:bg-[#111827]">
        {/* PC */}
        <div className="hidden lg:grid lg:grid-cols-[96px_104px_minmax(260px,1fr)_150px_330px] lg:divide-x lg:divide-[#E5E7EB] dark:lg:divide-slate-700">
          <div>
            <div className={colHead}>통신사</div>
            <div className="py-1">
              {CARRIERS.map((c) => (
                <button key={c.id} type="button" aria-pressed={carrier === c.id} className={listItem(carrier === c.id)} onClick={() => pickCarrier(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={colHead}>제조사</div>
            <div className="py-1">
              {MAKERS.map((m) => (
                <button key={m.id} type="button" aria-pressed={maker === m.id} className={listItem(maker === m.id)} onClick={() => pickMaker(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={`${colHead} flex justify-between`}>
              <span>제품</span>
              <span className="font-medium text-[#999]">출고가</span>
            </div>
            <div className="h-[232px] overflow-y-auto py-1" role="listbox" aria-label="제품">
              {makerDevices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="option"
                  aria-selected={deviceId === d.id}
                  className={`${listItem(deviceId === d.id)} flex justify-between gap-2`}
                  onClick={() => pickDevice(d.id)}
                >
                  <span className="truncate">
                    {d.model} <span className="text-[#999]">({d.storage})</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{KRW(d.price)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={colHead}>요금제 분류</div>
            <div className="py-1">
              {SEGMENTS.map((s) => {
                const n = carrierPlans.filter((p) => p.segment === s).length;
                return (
                  <button key={s} type="button" aria-pressed={segment === s} disabled={!n} className={`${listItem(segment === s)} flex justify-between disabled:opacity-30`} onClick={() => setSegment(s)}>
                    <span>{s}</span>
                    <span className="text-[11px] text-[#999]">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className={`${colHead} flex items-center justify-between`}>
              <span>가입 조건</span>
              <button type="button" onClick={reset} className="flex items-center gap-1 font-medium text-[#999] hover:text-[#5707EB]">
                <RotateCcw className="h-3 w-3" /> 초기화
              </button>
            </div>
            <ConditionRows {...cond} />
          </div>
        </div>

        {/* 모바일 */}
        <div className="space-y-3 p-4 lg:hidden">
          <div className="flex gap-1.5 overflow-x-auto">
            {CARRIERS.map((c) => (
              <button key={c.id} type="button" className={chip(carrier === c.id)} onClick={() => pickCarrier(c.id)}>
                {c.label}
              </button>
            ))}
            <span className="mx-1 w-px shrink-0 bg-[#E5E7EB]" />
            {MAKERS.map((m) => (
              <button key={m.id} type="button" className={chip(maker === m.id)} onClick={() => pickMaker(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <select
            aria-label="제품"
            className="w-full rounded-md border border-[#DDD] bg-white px-3 py-2 text-[14px] dark:border-slate-700 dark:bg-slate-900"
            value={deviceId}
            onChange={(e) => pickDevice(e.target.value)}
          >
            {makerDevices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.model} ({d.storage}) — {KRW(d.price)}원
              </option>
            ))}
          </select>
          <div className="flex gap-1.5 overflow-x-auto">
            {SEGMENTS.map((s) => {
              const n = carrierPlans.filter((p) => p.segment === s).length;
              return (
                <button key={s} type="button" disabled={!n} className={`${chip(segment === s)} disabled:opacity-30`} onClick={() => setSegment(s)}>
                  {s} {n}
                </button>
              );
            })}
          </div>
          <div className="rounded-md border border-[#E5E7EB] dark:border-slate-700">
            <ConditionRows {...cond} />
          </div>
          <button type="button" onClick={reset} className="flex items-center gap-1 text-[12px] font-medium text-[#999]">
            <RotateCcw className="h-3 w-3" /> 지원금 초기화
          </button>
        </div>
      </section>

      {/* ───────── 비교표 ───────── */}
      <section aria-label="요금제별 월 청구액 비교" className="rounded-lg border border-[#E5E7EB] bg-white dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3 dark:border-slate-800">
          <h2 className="text-[15px] font-extrabold text-[#111] dark:text-white">
            {CARRIERS.find((c) => c.id === carrier)?.label} · {deviceLabel} <span className={BRAND}>{KRW(price)}원</span>
            <span className="ml-2 text-[12px] font-bold text-[#999]">{segment} 요금제 {rows.length}개</span>
          </h2>
          <div className="flex items-center gap-2">
            <select
              aria-label="해지 예상금"
              className="rounded-md border border-[#DDD] bg-white px-2 py-1.5 text-[12px] dark:border-slate-700 dark:bg-slate-900"
              value={quitMonth}
              onChange={(e) => setQuitMonth(Number(e.target.value))}
            >
              <option value={0}>해지예상금</option>
              {Array.from({ length: TERM }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}개월 후 해지
                </option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-md border border-[#DDD] text-[12px] font-bold dark:border-slate-700">
              {VIEWS.map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1.5 ${view === v ? 'bg-[#5707EB] text-white dark:bg-[#A78BFA] dark:text-[#14082E]' : 'bg-white text-[#666] dark:bg-slate-900 dark:text-slate-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!rows.length && (
          <p className="px-4 py-10 text-center text-[13px] text-[#999]">
            요금제 목록을 불러오지 못했습니다{plansError ? ` (${plansError})` : ''}. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        {/* PC 표 */}
        {rows.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-right text-[12.5px] tabular-nums">
              <thead>
                <tr className="bg-[#F7F8FA] text-[11.5px] text-[#666] dark:bg-slate-800/60 dark:text-slate-300">
                  <th className="px-3 py-2 text-left font-bold">요금제</th>
                  <th className="px-2 text-center font-bold">약정 구분</th>
                  <th className="px-2 font-bold">ⓑ 공시지원금</th>
                  <th className="px-2 font-bold">ⓒ 전환지원금</th>
                  <th className="px-2 font-bold">ⓓ 추가지원금</th>
                  <th className="px-2 font-bold">
                    ⓔ 할부원금
                    <span className="block font-medium text-[#AAA]">ⓐ-ⓑ-ⓒ-ⓓ</span>
                  </th>
                  <th className="px-2 font-bold">
                    ⓕ 월 할부금
                    <span className="block font-medium text-[#AAA]">ⓔ÷{installMonths || '-'}</span>
                  </th>
                  <th className="px-2 font-bold">ⓖ 할부이자</th>
                  <th className="px-2 font-bold">ⓗ 월 기본료</th>
                  <th className="px-2 font-bold">ⓘ 요금할인</th>
                  <th className="px-3 font-bold text-[#111] dark:text-white">
                    월 청구액
                    <span className="block font-medium text-[#AAA]">ⓕ+ⓖ+ⓗ-ⓘ</span>
                  </th>
                  <th className="px-3 font-bold">24개월 총액</th>
                  {quitMonth > 0 && <th className="px-3 font-bold text-rose-500">{quitMonth}개월 해지 시</th>}
                </tr>
              </thead>
              <tbody>
                {results.map(({ plan, input, r, quit }) => {
                  const lines = ROUTES.filter((k) => view === 'all' || view === k);
                  return lines.map((k, i) => {
                    const route = k === 'public' ? r.pub : r.sel;
                    const isPub = k === 'public';
                    const win = r.winner === k;
                    const m1 = route.months[0];
                    const overridden = perPlan[plan.id] !== undefined;
                    return (
                      <tr key={`${plan.id}-${k}`} className={`${i === lines.length - 1 ? 'border-b border-[#E5E7EB] dark:border-slate-800' : ''} ${win && view === 'all' ? 'bg-[#FAF7FF] dark:bg-[#2A1366]/30' : ''}`}>
                        {i === 0 && (
                          <td rowSpan={lines.length} className="border-r border-[#F0F1F3] bg-white px-3 py-2 text-left align-top dark:border-slate-800 dark:bg-[#111827]">
                            <p className="text-[13px] font-extrabold text-[#111] dark:text-white">{plan.name}</p>
                            <p className="mt-0.5 text-[11px] text-[#5707EB] dark:text-[#A78BFA]">데이터 {plan.data}</p>
                            <p className="text-[11px] text-[#999]">{plan.voice}</p>
                          </td>
                        )}
                        <td className="px-2 py-2 text-center">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${isPub ? 'bg-[#EEF2FF] text-[#3730A3] dark:bg-indigo-950 dark:text-indigo-300' : 'bg-[#ECFDF5] text-[#047857] dark:bg-emerald-950 dark:text-emerald-300'}`}>
                            {isPub ? '공시지원금' : `선택약정 ${SELECTIVE_RATE * 100}%`}
                          </span>
                        </td>
                        <td className="px-2">
                          {isPub ? (
                            <Money
                              label={`${plan.name} 공시지원금`}
                              value={subsidyOf(plan)}
                              onChange={(n) => setPlanSubsidy(plan.id, n)}
                              className={`ml-auto w-[96px] py-1 ${overridden ? 'border-[#5707EB] font-bold text-[#5707EB]' : ''}`}
                            />
                          ) : (
                            0
                          )}
                        </td>
                        <td className="px-2">{isPub ? KRW(input.switchSubsidy) : 0}</td>
                        <td className="px-2">{isPub || extraOnSelective ? KRW(extraSubsidy) : 0}</td>
                        <td className="px-2">{KRW(route.principal)}</td>
                        <td className="px-2">{installMonths ? KRW(route.principal / installMonths) : '완납'}</td>
                        <td className="px-2">{KRW(route.monthlyInterestAvg)}</td>
                        <td className="px-2">{KRW(plan.price)}</td>
                        <td className="px-2 text-rose-500">{m1.discount ? `-${KRW(m1.discount)}` : 0}</td>
                        <td className="px-3">
                          <span className={`text-[14px] font-extrabold ${win ? BRAND : 'text-[#111] dark:text-white'}`}>{KRW(m1.bill)}</span>
                          {win && view === 'all' && (
                            <span className="ml-1 rounded bg-[#5707EB] px-1 py-0.5 text-[10px] font-bold text-white dark:bg-[#A78BFA] dark:text-[#14082E]">유리</span>
                          )}
                        </td>
                        <td className="px-3 text-[#666] dark:text-slate-400">{KRW(route.total)}</td>
                        {quit && <td className="px-3 text-rose-500">{KRW(isPub ? quit.pubRefund + quit.pubRemain : quit.selRefund + quit.selRemain)}</td>}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 모바일 카드 */}
        {rows.length > 0 && (
          <ul className="divide-y divide-[#E5E7EB] md:hidden dark:divide-slate-800">
            {results.map(({ plan, r, quit }) => (
              <li key={plan.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[14px] font-extrabold text-[#111] dark:text-white">{plan.name}</p>
                  <p className="shrink-0 text-[12px] tabular-nums text-[#666]">월 {KRW(plan.price)}원</p>
                </div>
                <p className="text-[11px] text-[#5707EB] dark:text-[#A78BFA]">데이터 {plan.data}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ROUTES.filter((k) => view === 'all' || view === k).map((k) => {
                    const route = k === 'public' ? r.pub : r.sel;
                    const win = r.winner === k;
                    return (
                      <div key={k} className={`rounded-md border p-2.5 ${win ? 'border-[#5707EB] bg-[#FAF7FF] dark:border-[#A78BFA] dark:bg-[#2A1366]/30' : 'border-[#E5E7EB] dark:border-slate-700'}`}>
                        <p className="flex items-center justify-between text-[11px] font-bold text-[#666]">
                          {k === 'public' ? '공시지원금' : '선택약정'}
                          {win && <span className="rounded bg-[#5707EB] px-1 text-[10px] text-white">유리</span>}
                        </p>
                        {k === 'public' && (
                          <Money label={`${plan.name} 공시지원금`} value={subsidyOf(plan)} onChange={(n) => setPlanSubsidy(plan.id, n)} className="mt-1 w-full py-1" />
                        )}
                        <p className={`mt-1 text-[17px] font-extrabold tabular-nums ${win ? BRAND : 'text-[#111] dark:text-white'}`}>
                          {KRW(route.months[0].bill)}
                          <span className="text-[11px] font-medium text-[#999]">원/월</span>
                        </p>
                        <p className="text-[11px] tabular-nums text-[#999]">24개월 {KRW(route.total)}원</p>
                        {quit && (
                          <p className="text-[11px] tabular-nums text-rose-500">
                            {quitMonth}개월 해지 {KRW(k === 'public' ? quit.pubRefund + quit.pubRemain : quit.selRefund + quit.selRemain)}원
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1 border-t border-[#E5E7EB] px-4 py-3 text-[11.5px] leading-relaxed text-[#888] dark:border-slate-800 dark:text-slate-400">
          <p className="flex items-start gap-1">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              VAT 포함 · 할부이자 포함(원리금균등, 월 이자는 평균) · 요금제 24개월 유지 기준. 공시지원금은 통신사·요금제·가입유형·날짜마다 달라 자동 입력하지
              않습니다. 가입 조건의 &lsquo;공시지원금&rsquo;에 넣으면 모든 요금제에, 표의 칸에 넣으면 그 요금제에만 적용됩니다.
            </span>
          </p>
          {quitMonth > 0 && (
            <p>해지 시 금액은 추정치입니다(지원금 반환금 = (공시+전환)×잔여개월/24, 할인반환금 = 6개월 이내 누적할인 전액·이후 ×잔여/18, 잔여 할부원금 포함).</p>
          )}
          <p>
            요금제 출처: 스마트초이스(한국통신사업자연합회) · {new Date(plansFetchedAt).toLocaleDateString('ko-KR')} 갱신 · 출고가 {DEVICE_PRICE_AS_OF} 기준
          </p>
        </div>
      </section>

      <Recommend
        onPick={(p) => {
          pickCarrier(p.carrier);
          setSegment(p.segment);
          setView('all');
        }}
      />
    </div>
  );
}

const ROUTES = ['public', 'selective'] as const;
const VIEWS: [View, string][] = [
  ['all', '모두비교'],
  ['public', '공시지원금'],
  ['selective', '선택약정'],
];

type CondProps = {
  joinType: JoinType;
  setJoinType: (v: JoinType) => void;
  installMonths: number;
  setInstallMonths: (v: number) => void;
  annualRate: number;
  setAnnualRate: (v: number) => void;
  bulkPublic: number;
  switchSubsidy: number;
  setSwitchSubsidy: (v: number) => void;
  extraSubsidy: number;
  setExtraSubsidy: (v: number) => void;
  extraOnSelective: boolean;
  setExtraOnSelective: (v: boolean) => void;
  price: number;
  setPrice: (v: number) => void;
  onBulk: (v: number) => void;
};

/** 가입 조건 (세티즌 '기타' 열) */
function ConditionRows(p: CondProps) {
  const row = 'grid grid-cols-[76px_1fr] items-center gap-2 px-3 py-1.5';
  const label = 'text-[12px] font-bold text-[#666] dark:text-slate-400';
  return (
    <div className="py-1">
      <div className={row}>
        <span className={label}>가입구분</span>
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[#DDD] text-[12px] font-bold dark:border-slate-700">
          {JOIN_TYPES.map((j) => (
            <button
              key={j}
              type="button"
              aria-pressed={p.joinType === j}
              onClick={() => p.setJoinType(j)}
              className={`py-1.5 ${p.joinType === j ? 'bg-[#5707EB] text-white dark:bg-[#A78BFA] dark:text-[#14082E]' : 'bg-white text-[#666] dark:bg-slate-900 dark:text-slate-300'}`}
            >
              {j.replace('가입', '')}
            </button>
          ))}
        </div>
      </div>
      <div className={row}>
        <span className={label}>할부개월</span>
        <div className="grid grid-cols-[1fr_74px] gap-1.5">
          <select
            aria-label="할부개월"
            className="rounded-md border border-[#DDD] bg-white px-2 py-1.5 text-[12px] dark:border-slate-700 dark:bg-slate-900"
            value={p.installMonths}
            onChange={(e) => p.setInstallMonths(Number(e.target.value))}
          >
            {INSTALLS.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? '자급/완납' : `${n}개월`}
              </option>
            ))}
          </select>
          <label className="relative">
            <input
              aria-label="할부 연이율"
              inputMode="decimal"
              disabled={!p.installMonths}
              className={`${fieldCls} w-full pr-6 disabled:opacity-40`}
              value={p.annualRate}
              onChange={(e) => p.setAnnualRate(Math.min(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0, 30))}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-[#999]">%</span>
          </label>
        </div>
      </div>
      <div className={row}>
        <label htmlFor="c-pub" className={label}>공시지원금</label>
        <Money id="c-pub" value={p.bulkPublic} onChange={p.onBulk} />
      </div>
      <div className={row}>
        <label htmlFor="c-sw" className={label}>전환지원금</label>
        <Money id="c-sw" value={p.joinType === '번호이동' ? p.switchSubsidy : 0} onChange={p.setSwitchSubsidy} disabled={p.joinType !== '번호이동'} />
      </div>
      <div className={row}>
        <label htmlFor="c-extra" className={label}>추가지원금</label>
        <div>
          <Money id="c-extra" value={p.extraSubsidy} onChange={p.setExtraSubsidy} />
          <label className="mt-1 flex cursor-pointer items-center gap-1 text-[11px] text-[#888]">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[#5707EB]" checked={p.extraOnSelective} onChange={(e) => p.setExtraOnSelective(e.target.checked)} />
            선택약정에도 적용 (단통법 폐지 후 중복 가능)
          </label>
        </div>
      </div>
      <div className={row}>
        <label htmlFor="c-price" className={label}>ⓐ 출고가</label>
        <Money id="c-price" value={p.price} onChange={p.setPrice} className="w-full font-bold" />
      </div>
    </div>
  );
}

/** 사용량 기반 요금제 추천 (스마트초이스 실시간) */
function Recommend({ onPick }: { onPick: (p: Recommendation) => void }) {
  const [data, setData] = useState(10000);
  const [voice, setVoice] = useState(300);
  const [age, setAge] = useState<Age>(40);
  const [type, setType] = useState<6 | 3>(6);
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ data: String(data), voice: String(voice), sms: '999999', age: String(age), type: String(type), dis: '24' });
      const res = await fetch(`/api/calculator/recommend?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '추천 실패');
      setItems(json.items);
    } catch (e) {
      setError((e as Error).message);
      setItems(null);
    } finally {
      setLoading(false);
    }
  };

  const sel = 'rounded-md border border-[#DDD] bg-white px-2 py-1.5 text-[13px] dark:border-slate-700 dark:bg-slate-900';

  return (
    <section aria-label="사용량으로 요금제 찾기" className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-[14px] font-extrabold text-[#111] dark:text-white">내 사용량으로 요금제 찾기</h2>
        <select aria-label="데이터" className={sel} value={data} onChange={(e) => setData(Number(e.target.value))}>
          {DATA_OPTS.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
        <select aria-label="통화" className={sel} value={voice} onChange={(e) => setVoice(Number(e.target.value))}>
          {VOICE_OPTS.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
        <select aria-label="연령" className={sel} value={age} onChange={(e) => setAge(Number(e.target.value) as Age)}>
          {AGE_OPTS.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
        <select aria-label="망" className={sel} value={type} onChange={(e) => setType(Number(e.target.value) as 6 | 3)}>
          <option value={6}>5G</option>
          <option value={3}>LTE</option>
        </select>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1 rounded-md bg-[#5707EB] px-3.5 py-1.5 text-[13px] font-bold text-white hover:bg-[#4E07D2] disabled:opacity-60 dark:bg-[#A78BFA] dark:text-[#14082E]"
        >
          <Search className="h-3.5 w-3.5" /> {loading ? '조회 중' : '추천 받기'}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] font-bold text-rose-500">{error}</p>}
      {items && (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {items.map((p) => (
            <li key={`${p.tier}-${p.id}`} className="flex items-center justify-between gap-2 rounded-md border border-[#E5E7EB] px-3 py-2 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#999]">
                  {p.carrier === 'LGU+' ? 'LG U+' : p.carrier} · {p.tier}
                </p>
                <p className="truncate text-[13px] font-extrabold text-[#111] dark:text-white">{p.name}</p>
                <p className="text-[11px] text-[#888]">
                  {KRW(p.price)}원 · {p.data}
                </p>
              </div>
              <button type="button" onClick={() => onPick(p)} className="shrink-0 rounded-md border border-[#DDD] px-2 py-1 text-[11px] font-bold text-[#666] hover:border-[#5707EB] hover:text-[#5707EB] dark:border-slate-700">
                표에서 보기
              </button>
            </li>
          ))}
          {!items.length && <li className="text-[13px] text-[#999]">조건에 맞는 요금제가 없습니다.</li>}
        </ul>
      )}
    </section>
  );
}

const DATA_OPTS: [number, string][] = [
  [2000, '데이터 2GB'],
  [5000, '데이터 5GB'],
  [10000, '데이터 10GB'],
  [30000, '데이터 30GB'],
  [100000, '데이터 100GB'],
  [999999, '데이터 무제한'],
];
const VOICE_OPTS: [number, string][] = [
  [100, '통화 100분'],
  [300, '통화 300분'],
  [999999, '통화 무제한'],
];
const AGE_OPTS: [number, string][] = [
  [40, '일반(35세 이상)'],
  [25, '청년(19~34세)'],
  [18, '청소년'],
  [65, '65세 이상'],
];
