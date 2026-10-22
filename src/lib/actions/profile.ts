'use server'

import { revalidatePath } from 'next/cache'
import { one } from '@/lib/db'
import { getCurrentProfile } from '@/lib/auth/session'

/** 온보딩 폼 초기값 */
export async function getMyProfileBasics() {
  const me = await getCurrentProfile()
  if (!me) return null
  return { id: me.id, username: me.username, display_name: me.display_name }
}

/** 아이디·닉네임 변경 (중복 검사 포함) */
export async function updateMyProfile(username: string, displayName: string) {
  const me = await getCurrentProfile()
  if (!me) return { error: '로그인이 필요합니다.' }

  const dup = await one(
    'select 1 from profiles where id <> $1 and (lower(username) = lower($2) or lower(display_name) = lower($3))',
    [me.id, username, displayName],
  )
  if (dup) return { error: '이미 사용 중인 아이디 또는 닉네임입니다.' }

  try {
    await one('update profiles set username = $2, display_name = $3, updated_at = now() where id = $1 returning id', [me.id, username, displayName])
  } catch {
    return { error: '프로필 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/', 'layout')
  return { success: true }
}
