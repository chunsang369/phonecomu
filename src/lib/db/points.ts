/**
 * 포인트·레벨 (Supabase의 award_points RPC + recalc_level 트리거 대체)
 */
import type { PoolClient } from 'pg'
import { q } from '@/lib/db'

type Queryable = Pick<PoolClient, 'query'>

/** 레벨 재계산: 벌점 50 이상이면 -1, 아니면 활동점수·출석일 기준 최고 레벨 (관리자 등급은 건드리지 않음) */
export async function recalcLevel(userId: string, c?: Queryable) {
  await q(
    `update profiles p set level = case
        when p.penalty_points >= 50 then -1
        when p.role in ('admin','moderator') then p.level
        else coalesce((select max(l.level) from levels l
                        where l.level <= 4 and p.activity_points >= l.min_activity and p.attendance_days >= l.min_attendance), 1)
      end, updated_at = now()
      where p.id = $1`,
    [userId],
    c,
  )
}

export async function awardPoints(userId: string, amount: number, kind: string, refId: string | null, c?: Queryable) {
  await q('insert into point_transactions (user_id, amount, kind, ref_id) values ($1, $2, $3, $4)', [userId, amount, kind, refId], c)
  await q('update profiles set activity_points = activity_points + $2 where id = $1', [userId, amount], c)
  await recalcLevel(userId, c)
}
