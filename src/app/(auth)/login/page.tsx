'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/actions/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertCircle, Loader2 } from 'lucide-react'

// zod 스키마 정의
const authSchema = z.object({
  username: z.string().min(3, { message: '아이디는 최소 3자 이상이어야 합니다.' }),
  password: z.string().min(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' }),
})

type AuthFormValues = z.infer<typeof authSchema>

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (values: AuthFormValues) => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await signIn(values.username, values.password)

      if ('error' in res && res.error) {
        setErrorMsg(res.error)
      } else {
        router.push(next)
        router.refresh()
      }
    } catch {
      setErrorMsg('인증 도중 알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md border border-[#E5E8EC] dark:bg-[#151E2E] dark:border-[#334155]">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-[#16305B] dark:text-[#38BDF8]">
          {process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'}
        </h2>
        <p className="mt-2 text-sm text-[#5B6472] dark:text-[#94A3B8]">
          로그인하여 커뮤니티에 참여하세요
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
              아이디
            </label>
            <input
              id="username"
              type="text"
              disabled={loading}
              {...register('username')}
              className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
              placeholder="아이디를 입력하세요"
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9]">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              disabled={loading}
              {...register('password')}
              className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
              placeholder="••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-lg bg-[#16305B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E4079] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:bg-gray-400 dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : '로그인'}
          </button>
        </div>
      </form>

      <div className="text-center">
        <Link
          href="/signup"
          className="text-sm font-medium text-[#2563EB] hover:underline dark:text-[#38BDF8]"
        >
          계정이 없으신가요? 회원가입하기
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 py-12 dark:bg-[#0B111E]">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#16305B] dark:text-[#38BDF8]" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
