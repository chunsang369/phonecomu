'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyProfileBasics, updateMyProfile } from '@/lib/actions/profile'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertCircle, Loader2 } from 'lucide-react'

// 온보딩용 zod 스키마 정의
const onboardingSchema = z.object({
  username: z
    .string()
    .min(3, { message: '아이디는 최소 3자 이상이어야 합니다.' })
    .max(15, { message: '아이디는 최대 15자 이하로 설정해 주세요.' })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: '아이디는 영문, 숫자, 언더스코어(_)만 사용할 수 있습니다.',
    }),
  display_name: z
    .string()
    .min(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
    .max(10, { message: '닉네임은 최대 10자 이하로 설정해 주세요.' }),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: '',
      display_name: '',
    },
  })

  useEffect(() => {
    async function checkUser() {
      const profile = await getMyProfileBasics()

      if (!profile) {
        // 미인증 유저 로그인으로 튕겨냄
        router.push('/login')
        return
      }

      setUserId(profile.id)

      if (profile) {
        // 기본 자동 생성 닉네임 등을 폼 기본값으로 바인딩
        setValue('username', profile.username || '')
        setValue('display_name', profile.display_name || '')
      }
      setChecking(false)
    }

    checkUser()
  }, [router, setValue])

  const onSubmit = async (values: OnboardingFormValues) => {
    if (!userId) return

    setLoading(true)
    setErrorMsg(null)

    try {
      // 중복 검사 + 프로필 업데이트 (서버 액션)
      const res = await updateMyProfile(values.username, values.display_name)

      if ('error' in res && res.error) {
        setErrorMsg(res.error)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setErrorMsg('프로필 설정 도중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] dark:bg-[#0B111E]">
        <Loader2 className="h-8 w-8 animate-spin text-[#16305B] dark:text-[#38BDF8]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 py-12 dark:bg-[#0B111E]">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md border border-[#E5E8EC] dark:bg-[#151E2E] dark:border-[#334155]">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-[#16305B] dark:text-[#38BDF8]">
            닉네임 및 아이디 설정
          </h2>
          <p className="mt-2 text-sm text-[#5B6472] dark:text-[#94A3B8]">
            커뮤니티 활동을 위한 기본 프로필 정보를 완성해 주세요.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9]">
                아이디 (URL 고유 주소)
              </label>
              <input
                id="username"
                type="text"
                disabled={loading}
                {...register('username')}
                className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
                placeholder="영문, 숫자, _ 만 사용 가능"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9]">
                활동 닉네임 (커뮤니티 표시용)
              </label>
              <input
                id="display_name"
                type="text"
                disabled={loading}
                {...register('display_name')}
                className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
                placeholder="2~10자 한글/영문"
              />
              {errors.display_name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.display_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-[#16305B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E4079] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:bg-gray-400 dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                '프로필 설정 완료'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
