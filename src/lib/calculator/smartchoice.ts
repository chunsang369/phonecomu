/**
 * 서버 전용(API 키 사용). 클라이언트 컴포넌트에서 import 금지.
 *
 * 스마트초이스(KTOA) 이동전화 요금제 추천 Open API
 * 문서: https://m.smartchoice.or.kr/smc/openapi/openapiguide_02.do
 * - age는 실제 나이로 해석됨(문서의 성인:20을 넣으면 청년 요금제가 나옴) → 40/25/18/65로 구간 대표값 사용.
 * - 키 1개당 하루 10,000회. 사용량 프로필 하나당 추천 요금제 일부만 돌려주므로
 *   여러 프로필로 호출해 합친 뒤 하루 단위로 캐시한다.
 */

import { demoPlans } from '@/lib/demo/catalog.mjs';
const demoCatalog = () => demoPlans.map(p=>({...p,carrier:p.carrier.replace(' ','') as Carrier,segment:'일반' as const,networks:['5G' as const]}));
const ENDPOINT = 'https://www.smartchoice.or.kr/api/openAPI.xml';
const DAY = 60 * 60 * 24;

export type Carrier = 'SKT' | 'KT' | 'LGU+';
export type PlanSegment = '일반' | '청년' | '청소년' | '시니어';

export type Plan = {
  id: string;
  carrier: Carrier;
  name: string;
  price: number; // 월 기본료(부가세 포함)
  voice: string;
  data: string;
  sms: string;
  segment: PlanSegment;
  networks: ('5G' | 'LTE')[];
};

export type Recommendation = Plan & { tier: '최적' | '실속' | '넉넉' };

export type Age = 40 | 25 | 18 | 65;
type Usage = { voice: number; data: number; sms: number; age: Age; type: 6 | 3; dis: 0 | 12 | 24 };

const TIER: Record<string, Recommendation['tier']> = { '1': '최적', '2': '실속', '3': '넉넉' };

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function segmentOf(name: string): PlanSegment {
  if (/65\+|시니어|실버/.test(name)) return '시니어';
  if (/청소년|스쿨|팅/.test(name)) return '청소년';
  if (/청년|Y덤|유쓰|0청년/.test(name)) return '청년';
  return '일반';
}

function parse(xml: string, network: '5G' | 'LTE') {
  const code = tag(xml, 'result_code');
  if (code !== '100') throw new Error(`smartchoice result_code=${code || 'none'}`);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const carrier = tag(it, 'v_tel') as Carrier;
    const name = tag(it, 'v_plan_name');
    return {
      plan: {
        id: `${carrier}:${name}`,
        carrier,
        name,
        price: Number(tag(it, 'v_plan_price')) || 0,
        voice: tag(it, 'v_plan_display_voice'),
        data: tag(it, 'v_plan_display_data') || tag(it, 'v_display_data'),
        sms: tag(it, 'v_plan_display_sms'),
        segment: segmentOf(name),
        networks: [network],
      } satisfies Plan,
      tier: TIER[tag(it, 'rn')] ?? '최적',
    };
  });
}

async function call(u: Usage, revalidate = DAY) {
  const key = process.env.SMARTCHOICE_API_KEY;
  if (!key) throw new Error('SMARTCHOICE_API_KEY 미설정');
  const qs = new URLSearchParams({
    authkey: key,
    voice: String(u.voice),
    data: String(u.data),
    sms: String(u.sms),
    age: String(u.age),
    type: String(u.type),
    dis: String(u.dis),
  });
  const res = await fetch(`${ENDPOINT}?${qs}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`smartchoice HTTP ${res.status}`);
  return parse(await res.text(), u.type === 6 ? '5G' : 'LTE');
}

const DATA_STEPS = [999999, 150000, 100000, 50000, 30000, 15000, 10000, 5000, 2000, 500];

type Catalog = { plans: Plan[]; fetchedAt: string; error?: string };
let memo: { at: number; data: Promise<Catalog> } | null = null;

/** 통신 3사 요금제 카탈로그(스마트초이스 추천 결과 합집합). 서버 메모리 + fetch 캐시로 하루 유지. */
export function getPlanCatalog(): Promise<Catalog> {
  if(process.env.PHONE_DEMO==='1')return Promise.resolve({plans:demoCatalog(),fetchedAt:new Date().toISOString()});
  if (memo && Date.now() - memo.at < DAY * 1000) return memo.data;
  const data = loadCatalog().then((c) => {
    if (c.error || !c.plans.length) memo = null; // 실패 결과는 캐시하지 않음
    return c;
  }).catch((e) => {
    memo = null;
    throw e;
  });
  memo = { at: Date.now(), data };
  return data;
}

async function loadCatalog(): Promise<Catalog> {
  const profiles: Usage[] = [];
  for (const type of [6, 3] as const)
    for (const age of [40, 25, 18, 65] as const)
      for (const data of DATA_STEPS) profiles.push({ voice: 999999, data, sms: 999999, age, type, dis: 24 });

  const map = new Map<string, Plan>();
  let failed = 0;
  // 동시 호출 수를 6개로 제한
  for (let i = 0; i < profiles.length; i += 6) {
    const batch = await Promise.allSettled(profiles.slice(i, i + 6).map((p) => call(p)));
    for (const r of batch) {
      if (r.status === 'rejected') { failed++; continue; }
      for (const { plan } of r.value) {
        const prev = map.get(plan.id);
        if (!prev) map.set(plan.id, plan);
        else if (!prev.networks.includes(plan.networks[0])) prev.networks.push(plan.networks[0]);
      }
    }
  }
  const plans = [...map.values()].sort((a, b) => a.carrier.localeCompare(b.carrier) || a.price - b.price);
  return {
    plans,
    fetchedAt: new Date().toISOString(),
    error: failed === profiles.length ? '스마트초이스 응답 실패' : undefined,
  };
}

/** 사용량 기반 요금제 추천(실시간, 10분 캐시) */
export async function recommendPlans(u: Usage): Promise<Recommendation[]> {
  if(process.env.PHONE_DEMO==='1')return demoCatalog().map(p=>({...p,tier:'최적' as const}));
  const rows = await call(u, 600);
  return rows.map(({ plan, tier }) => ({ ...plan, tier }));
}
