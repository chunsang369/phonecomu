import { NextResponse } from 'next/server';
import { recommendPlans, type Age } from '@/lib/calculator/smartchoice';

const clamp = (v: string | null, allowed: number[], fallback: number) => {
  const n = Number(v);
  return allowed.includes(n) ? n : fallback;
};
const amount = (v: string | null, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 999999) : fallback;
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  try {
    const items = await recommendPlans({
      voice: amount(q.get('voice'), 300),
      data: amount(q.get('data'), 10000),
      sms: amount(q.get('sms'), 999999),
      age: clamp(q.get('age'), [40, 25, 18, 65], 40) as Age,
      type: clamp(q.get('type'), [6, 3], 6) as 6 | 3,
      dis: clamp(q.get('dis'), [0, 12, 24], 24) as 0 | 12 | 24,
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [], error: (e as Error).message }, { status: 502 });
  }
}
