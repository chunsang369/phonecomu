'use client'

import { useState } from 'react'
import { submitAttendance } from '@/lib/actions/attendance'
import { CalendarCheck, Loader2 } from 'lucide-react'

interface AttendanceButtonProps {
  initialDays: number
  hasAttendedToday: boolean
}

export default function AttendanceButton({ initialDays, hasAttendedToday }: AttendanceButtonProps) {
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
    } catch (err) {
      alert('출석체크 처리 도중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAttendance}
      disabled={loading || attended}
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-80 ${
        attended 
          ? 'bg-emerald-600 dark:bg-emerald-700' 
          : 'bg-[#16305B] hover:bg-[#1E4079] dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]'
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
