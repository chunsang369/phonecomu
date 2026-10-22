/**
 * 자체 인증 (Supabase Auth 대체)
 * - 비밀번호: scrypt(salt 16B, N=16384) → 'scrypt$<salt>$<hash>' 로 profiles.password_hash 저장
 * - 세션: 쿠키 pc_session 에 무작위 토큰, DB(sessions)에는 SHA-256 해시만 저장, 30일 만료
 * 서버 전용 모듈.
 */
import { cache } from 'react'
import { cookies } from 'next/headers'
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { one, q } from '@/lib/db'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

export const SESSION_COOKIE = 'pc_session'
const SESSION_DAYS = 30

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  role: 'member' | 'seller' | 'moderator' | 'admin'
  status: string
  level: number
  activity_points: number
  penalty_points: number
  attendance_days: number
  adopted_count: number
  trust_score: number
  bio: string | null
  created_at: string
}

export const PROFILE_COLUMNS =
  'p.id, p.username, p.display_name, p.avatar_url, p.role, p.status, p.level, p.activity_points, p.penalty_points, p.attendance_days, p.adopted_count, p.trust_score, p.bio, p.created_at'

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, saltB64, hashB64] = stored.split('$')
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length)
  return timingSafeEqual(expected, actual)
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** 세션 생성 + 쿠키 설정 (서버 액션/라우트 핸들러에서만 호출) */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000)
  await q('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [sha256(token), userId, expires])
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  })
}

/** 현재 세션 삭제 + 쿠키 제거 */
export async function destroySession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await q('delete from sessions where token_hash = $1', [sha256(token)])
  store.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
}

/** 로그인한 회원 프로필 (요청당 1회 조회). 비로그인·만료·정지 계정은 null */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    return await one<Profile>(
      `select ${PROFILE_COLUMNS}
         from sessions s join profiles p on p.id = s.user_id
        where s.token_hash = $1 and s.expires_at > now() and p.status = 'active'`,
      [sha256(token)],
    )
  } catch (e) {
    console.error('세션 조회 실패:', (e as Error).message)
    return null
  }
})
