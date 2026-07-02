'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitAttendance() {
  const supabase = await createClient()

  // 1. 유저 인증 검사
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요한 서비스입니다.' }
  }

  try {
    // 2. daily_attendance RPC 호출 (중복 방지 & 출석 포인트 지급 5점 내장)
    const { data, error } = await supabase.rpc('daily_attendance')
    if (error) {
      return { error: error.message }
    }

    revalidatePath('/')
    return { success: true, attendanceDays: (data as any)?.attendance_days }
  } catch (err) {
    return { error: '출석체크 처리 중 서버 오류가 발생했습니다.' }
  }
}
