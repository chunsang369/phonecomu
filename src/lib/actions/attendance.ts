'use server'

import { revalidatePath } from 'next/cache'
import { one, tx } from '@/lib/db'
import { getCurrentProfile } from '@/lib/auth/session'
import { awardPoints } from '@/lib/db/points'

// 출석체크: 하루 1회(한국 날짜 기준), 출석일 +1, 포인트 +5
export async function submitAttendance() {
  const me = await getCurrentProfile()
  if (!me) {
    return { error: '로그인이 필요한 서비스입니다.' }
  }

  try {
    const days = await tx(async (c) => {
      const inserted = await one(
        `insert into attendance (user_id, day) values ($1, (now() at time zone 'Asia/Seoul')::date)
         on conflict do nothing returning day`,
        [me.id],
        c,
      )
      if (!inserted) return null
      const row = await one<{ attendance_days: number }>(
        'update profiles set attendance_days = attendance_days + 1 where id = $1 returning attendance_days',
        [me.id],
        c,
      )
      await awardPoints(me.id, 5, 'attendance', null, c)
      return row?.attendance_days ?? null
    })

    if (days === null) return { error: '이미 오늘 출석 체크를 하셨습니다.' }

    revalidatePath('/')
    return { success: true, attendanceDays: days }
  } catch {
    return { error: '출석체크 처리 중 서버 오류가 발생했습니다.' }
  }
}
