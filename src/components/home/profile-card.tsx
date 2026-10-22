import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth/session'
import { signOut } from '@/lib/actions/auth'
import { one } from '@/lib/db'
import AttendanceButton from '@/components/ui/attendance-button'

// 다음 레벨까지 필요한 활동 포인트 (levels 테이블과 같은 값)
const LEVEL_MIN: Record<number, number> = { 1: 0, 2: 100, 3: 500, 4: 2000, 5: 10000 }

/** 우측 상단 로그인/프로필 카드 (아이보스 우측 카드: 360폭, 로그인 버튼 42px 보라) — 홈·게시판·글상세 공용 */
export default async function ProfileCard() {
  const profile = await getCurrentProfile()
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '폰커뮤니티'

  if (!profile) {
    return (
      <section className="rounded-lg bg-white px-6 py-5 text-center dark:bg-[#111827]">
        <p className="text-[13px] text-[#999]">로그인 후 더욱 많은 기능을 이용할 수 있어요</p>
        <Link href="/login" className="mt-3 block rounded-lg bg-[#5707EB] py-2 text-[16px] font-medium leading-[26px] text-white hover:bg-[#4E07D2]">
          {siteName} 로그인
        </Link>
        <div className="mt-3 flex justify-center gap-3 text-[13px] text-[#888]">
          <Link href="/signup" className="hover:text-[#5707EB]">회원가입</Link>
          <span className="text-[#DDD]">|</span>
          <Link href="/support/contact" className="hover:text-[#5707EB]">계정 찾기</Link>
        </div>
      </section>
    )
  }

  const attended = !!(await one("select 1 from attendance where user_id = $1 and day = (now() at time zone 'Asia/Seoul')::date", [profile.id]).catch(() => null))
  const curMin = LEVEL_MIN[profile.level] ?? 0
  const nextMin = LEVEL_MIN[profile.level + 1]
  const progress = nextMin ? Math.max(0, Math.min(100, Math.round(((profile.activity_points - curMin) / (nextMin - curMin)) * 100))) : 100
  const logout = async () => {
    'use server'
    await signOut()
  }

  return (
    <section className="rounded-lg bg-white p-5 dark:bg-[#111827]">
      <div className="flex items-start gap-3.5">
        <Link
          href="/mypage"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#EDE7FE] text-[22px] font-extrabold text-[#5707EB] dark:bg-[#2A1366] dark:text-[#C4B5FD]"
        >
          {profile.display_name.slice(0, 1)}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[18px] font-extrabold text-black dark:text-white">{profile.display_name}</p>
            <form action={logout}>
              <button type="submit" className="shrink-0 rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[12px] text-[#666] hover:bg-[#E9EBEE] dark:bg-slate-800 dark:text-slate-300">
                로그아웃
              </button>
            </form>
          </div>
          <p className="text-[13px] text-[#999]">@{profile.username}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[14px] font-bold text-black dark:text-white">
        <div className="rounded-lg bg-[#F7F8FA] py-2.5 dark:bg-slate-800/60">
          {profile.activity_points.toLocaleString('ko-KR')} <span className="text-[12px] font-medium text-[#999]">리터</span>
        </div>
        <div className="rounded-lg bg-[#F7F8FA] py-2.5 dark:bg-slate-800/60">
          {profile.attendance_days} <span className="text-[12px] font-medium text-[#999]">일 출석</span>
        </div>
        <div className="rounded-lg bg-[#F7F8FA] py-2.5 dark:bg-slate-800/60">LV.{profile.level}</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEE] dark:bg-slate-800" aria-label={`다음 레벨까지 ${progress}%`}>
        <div className="h-full rounded-full bg-[#5707EB] dark:bg-[#A78BFA]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 divide-x divide-[#EEE] text-center text-[14px] text-[#666] dark:divide-slate-800 dark:text-slate-300">
        <Link href="/mypage?tab=posts" className="py-1 hover:text-[#5707EB]">내글</Link>
        <Link href="/mypage?tab=comments" className="py-1 hover:text-[#5707EB]">내댓글</Link>
        <AttendanceButton variant="text" initialDays={profile.attendance_days} hasAttendedToday={attended} />
      </div>
    </section>
  )
}
