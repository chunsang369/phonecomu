'use client'

import { useState } from 'react'
import { submitAttendance } from '@/lib/actions/attendance'
import { CalendarCheck, Loader2 } from 'lucide-react'

interface AttendanceButtonProps {
  initialDays: number
  hasAttendedToday: boolean
  variant?: 'block' | 'text' // text: 홈 프로필 카드 하단 링크줄용
}

export default function AttendanceButton({ initialDays, hasAttendedToday, variant = 'block' }: AttendanceButtonProps) {
  const [days, setDays] = useState(initialDays)
  const [attended, setAttended] = useState(hasAttendedToday)
  const [loading, setLoading] = useState(false)

  const handleAttendance = async () => {
    if (attended) {
      alert('오늘 이미 출석체크를 완료하셨습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await submitAttendance()
      if (res && res.error) {
        alert(res.error)
      } else if (res && res.success && res.attendanceDays !== undefined) {
        setDays(res.attendanceDays)
        setAttended(true)
        alert('출석체크 성공! 5포인트가 적립되었습니다.')
      }
    } catch {
      alert('출석체크 처리 도중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'text') {
    return (
      <button type="button" onClick={handleAttendance} disabled={loading} className={`py-1 ${attended ? 'text-[#5707EB] dark:text-[#A78BFA]' : 'hover:text-[#5707EB]'}`}>
        {loading ? '처리 중' : attended ? '출석완료' : '출석체크'}
      </button>
    )
  }

  return (
    <button
      onClick={handleAttendance}
      disabled={loading || attended}
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-80 ${
        attended 
          ? 'bg-emerald-600 dark:bg-emerald-700' 
          : 'bg-[#5707EB] hover:bg-[#4E07D2] dark:bg-[#A78BFA] dark:text-[#14082E]'
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CalendarCheck className="h-4 w-4" />
      )}
      <span>{attended ? `출석완료 (${days}일째)` : '오늘의 출석체크'}</span>
    </button>
  )
}
