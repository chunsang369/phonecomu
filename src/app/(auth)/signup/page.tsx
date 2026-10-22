'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertCircle, Loader2, CheckCircle2, ChevronLeft, ShieldAlert, Check } from 'lucide-react'
import { TermsBody, PrivacyBody, NOTICE_HREF } from '@/components/legal/legal-docs'
import { registerAccount } from '@/lib/actions/register'

// 기본정보(2단계) 스키마 — 스크린샷의 가입 규칙 반영
const step2Schema = z
  .object({
    username: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{2,19}$/, {
      message: '아이디는 영문으로 시작하는 3~20자의 영문+숫자여야 합니다.',
    }),
    password: z
      .string()
      .min(8, { message: '비밀번호는 8~60자여야 합니다.' })
      .max(60, { message: '비밀번호는 8~60자여야 합니다.' }),
    passwordConfirm: z.string(),
    displayName: z
      .string()
      .min(2, { message: '닉네임은 2~8자 이내여야 합니다.' })
      .max(8, { message: '닉네임은 2~8자 이내여야 합니다.' }),
    email: z
      .string()
      .email({ message: '올바른 이메일 주소를 입력해주세요.' }),
    mailingOptIn: z.boolean(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })

type Step2Values = z.infer<typeof step2Schema>

function SignupFlow() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)

  // 약관 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeAge, setAgreeAge] = useState(false)
  const allAgreed = agreeTerms && agreePrivacy && agreeAge

  const toggleAll = (checked: boolean) => {
    setAgreeTerms(checked)
    setAgreePrivacy(checked)
    setAgreeAge(checked)
  }

  // 계정 정보 상태
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      username: '',
      password: '',
      passwordConfirm: '',
      displayName: '',
      email: '',
      mailingOptIn: true,
    },
  })

  const onSubmit = async (values: Step2Values) => {
    if (!allAgreed) {
      setStep(1)
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await registerAccount({
        username: values.username,
        password: values.password,
        displayName: values.displayName,
        email: values.email,
        mailingOptIn: values.mailingOptIn,
      })

      if ('error' in res && res.error) {
        if (res.field && ['username', 'displayName', 'email', 'password'].includes(res.field)) {
          setError(res.field as keyof Step2Values, { message: res.error })
        } else {
          setErrorMsg(res.error)
        }
        return
      }

      if ('success' in res && res.success) {
        // 가입과 동시에 서버에서 로그인 세션이 생성됨
        if (!res.loggedIn) {
          setDone(true)
          return
        }
        router.push('/')
        router.refresh()
      }
    } catch {
      setErrorMsg('회원가입 도중 알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const checkboxRow = (checked: boolean, onChange: (v: boolean) => void, label: React.ReactNode) => (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[#CBD5E1] text-[#7C3AED] focus:ring-[#7C3AED] dark:border-[#334155]"
      />
      <span className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">{label}</span>
    </label>
  )

  // 폼 인풋 공통 클래스
  const inputCls =
    'block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9]'
  const helpCls = 'text-[12px] leading-relaxed text-[#828B9C] dark:text-[#64748B]'

  // ── 가입 완료 화면 (자동 로그인 실패 시 폴백) ──────────
  if (done) {
    return (
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-md border border-[#E5E8EC] dark:bg-[#151E2E] dark:border-[#334155]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[#1A1D24] dark:text-white">회원가입을 환영합니다!</h2>
          <p className="text-sm text-[#5B6472] dark:text-[#94A3B8]">
            회원가입이 즉시 완료되었습니다.
            <br />
            방금 만든 아이디와 비밀번호로 바로 로그인하실 수 있습니다.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-[#7C3AED] py-3 text-sm font-bold text-white transition hover:bg-[#6D28D9]"
        >
          로그인하러 가기
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-6 rounded-2xl bg-white p-6 sm:p-8 shadow-md border border-[#E5E8EC] dark:bg-[#151E2E] dark:border-[#334155]">
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#1A1D24] dark:text-white uppercase">
          {siteName} <span className="text-[#7C3AED] text-base">JOIN</span>
        </h2>
        <p className="mt-1 text-sm text-[#5B6472] dark:text-[#94A3B8]">
          {step === 1 ? '약관에 동의하고 커뮤니티에 참여하세요' : '가입에 사용할 기본 정보를 입력하세요'}
        </p>
      </div>

      {/* 단계 인디케이터 */}
      <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
        <span className={`rounded-full px-3 py-1 ${step === 1 ? 'bg-[#7C3AED] text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
          1. 약관 동의
        </span>
        <span className="h-px w-6 bg-slate-200 dark:bg-slate-700" />
        <span className={`rounded-full px-3 py-1 ${step === 2 ? 'bg-[#7C3AED] text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
          2. 기본 정보
        </span>
      </div>

      {step === 1 ? (
        <div className="space-y-6">
          {/* 중요 공지 */}
          <div className="space-y-1.5 rounded-xl border border-red-100 bg-red-50/60 p-4 text-[13px] font-bold text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <p className="flex items-start gap-1.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              [안내] 가입 후 별도 이메일 인증 없이 아이디로 즉시 로그인할 수 있습니다.
            </p>
            <p className="flex items-start gap-1.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              [중요] 악용 및 추천/조회수 조작을 막기 위해 아이디를 2개 이상 사용할 경우 모든 아이디가 차단될 수 있습니다.
            </p>
            <p className="pl-6 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
              [공지] 커뮤니티 통합 규정은{' '}
              <Link href={NOTICE_HREF} className="font-bold text-[#7C3AED] hover:underline dark:text-[#A78BFA]">
                공지사항 게시판
              </Link>
              에서 확인할 수 있습니다.
            </p>
          </div>

          {/* 이용약관 */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">이용약관</p>
            <div className="h-48 overflow-y-auto rounded-xl border border-[#E5E8EC] bg-slate-50/50 p-4 text-xs dark:border-[#334155] dark:bg-[#0B111E]">
              <TermsBody />
            </div>
            {checkboxRow(agreeTerms, setAgreeTerms, <><span className="text-[#7C3AED]">[필수]</span> 이용약관에 동의합니다.</>)}
          </div>

          {/* 개인정보 처리방침 */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">개인정보 수집·이용 동의</p>
            <div className="h-48 overflow-y-auto rounded-xl border border-[#E5E8EC] bg-slate-50/50 p-4 text-xs dark:border-[#334155] dark:bg-[#0B111E]">
              <PrivacyBody />
            </div>
            {checkboxRow(agreePrivacy, setAgreePrivacy, <><span className="text-[#7C3AED]">[필수]</span> 개인정보 처리방침에 동의합니다.</>)}
          </div>

          {/* 연령 확인 */}
          {checkboxRow(agreeAge, setAgreeAge, <><span className="text-[#7C3AED]">[필수]</span> 만 14세 이상 본인입니다.</>)}

          {/* 전체 동의 + 다음 */}
          <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-[#1F2937]">
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={(e) => toggleAll(e.target.checked)}
                className="h-5 w-5 rounded border-[#CBD5E1] text-[#7C3AED] focus:ring-[#7C3AED] dark:border-[#334155]"
              />
              <span className="text-sm font-black text-[#1A1D24] dark:text-[#F1F5F9]">위 내용에 모두 동의합니다.</span>
            </label>

            <button
              type="button"
              disabled={!allAgreed}
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center rounded-lg bg-[#7C3AED] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              다음
            </button>
          </div>

          <p className="text-center text-xs font-semibold text-[#5B6472] dark:text-[#94A3B8]">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-bold text-[#7C3AED] hover:underline dark:text-[#A78BFA]">
              로그인
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#5B6472] hover:text-[#1A1D24] dark:text-[#94A3B8] dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> 약관 동의로 돌아가기
          </button>

          {/* 동의 완료 표시 */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            이용약관·개인정보·연령 확인에 모두 동의했습니다.
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 기본 정보 폼 */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <p className="mb-3 border-b border-slate-200 pb-2 text-center text-sm font-black text-[#1A1D24] dark:border-[#334155] dark:text-[#F1F5F9]">
              기본 정보
            </p>

            <div className="divide-y divide-slate-100 dark:divide-[#1F2937]">
              {/* 아이디 */}
              <div className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-[100px_1fr] sm:gap-4">
                <label htmlFor="username" className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">아이디</label>
                <div className="space-y-1.5">
                  <input id="username" type="text" autoComplete="username" disabled={loading} {...register('username')} className={inputCls} />
                  <p className={helpCls}>사용자 ID는 3~20자 사이의 영문+숫자로 이루어져야 하며 영문으로 시작되어야 합니다.</p>
                  <p className="text-[12px] font-bold text-[#2563EB] dark:text-[#60A5FA]">아이디 2개 이상 사용할 경우 모두 사용 중지됩니다.</p>
                  {errors.username && <p className="text-xs text-red-600 dark:text-red-400">{errors.username.message}</p>}
                </div>
              </div>

              {/* 비밀번호 */}
              <div className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-[100px_1fr] sm:gap-4">
                <label htmlFor="password" className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">비밀번호</label>
                <div className="space-y-1.5">
                  <input id="password" type="password" autoComplete="new-password" disabled={loading} {...register('password')} className={inputCls} />
                  <p className={helpCls}>비밀번호는 8~60자로 되어야 합니다.</p>
                  {errors.password && <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
                </div>
              </div>

              {/* 비밀번호 확인 */}
              <div className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-[100px_1fr] sm:gap-4">
                <label htmlFor="passwordConfirm" className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">비밀번호 확인</label>
                <div className="space-y-1.5">
                  <input id="passwordConfirm" type="password" autoComplete="new-password" disabled={loading} {...register('passwordConfirm')} className={inputCls} />
                  {errors.passwordConfirm && <p className="text-xs text-red-600 dark:text-red-400">{errors.passwordConfirm.message}</p>}
                </div>
              </div>

              {/* 닉네임 */}
              <div className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-[100px_1fr] sm:gap-4">
                <label htmlFor="displayName" className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">닉네임</label>
                <div className="space-y-1.5">
                  <input id="displayName" type="text" disabled={loading} {...register('displayName')} className={inputCls} />
                  <div className={helpCls}>
                    <p>닉네임은 2~8자 이내여야 합니다.</p>
                    <p>악성/타유저 유사 닉네임 사용할 경우 영구 차단 될 수 있습니다.</p>
                    <p>신상 정보 금지입니다.</p>
                    <p>정치 관련, 특정 사이트 언급, 반사회적, 성적, 욕설 닉네임은 금지합니다.</p>
                  </div>
                  {errors.displayName && <p className="text-xs text-red-600 dark:text-red-400">{errors.displayName.message}</p>}
                </div>
              </div>

              {/* 이메일 주소 */}
              <div className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-[100px_1fr] sm:gap-4">
                <label htmlFor="email" className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">이메일 주소</label>
                <div className="space-y-1.5">
                  <input id="email" type="email" autoComplete="email" disabled={loading} {...register('email')} className={inputCls} placeholder="your-email@example.com" />
                  <p className={helpCls}>이메일 주소는 비밀번호 찾기·계정 복구 및 알림 용도로 사용됩니다.</p>
                  {errors.email && <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
                </div>
              </div>

              {/* 메일링 가입 */}
              <div className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-[100px_1fr] sm:gap-4">
                <span className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">메일링 가입</span>
                <label className="flex cursor-pointer items-start gap-2 select-none">
                  <input type="checkbox" disabled={loading} {...register('mailingOptIn')} className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#7C3AED] focus:ring-[#7C3AED] dark:border-[#334155]" />
                  <span className={helpCls}>메일링 가입이 체크되지 않으면 단체메일 발송시 메일을 받지 않습니다.</span>
                </label>
              </div>
            </div>

            {/* 등록 / 취소 */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep(1)}
                className="rounded-lg border border-[#CBD5E1] bg-white px-6 py-2.5 text-sm font-bold text-[#5B6472] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-8 py-2.5 text-sm font-bold text-white transition hover:bg-[#6D28D9] disabled:bg-slate-400"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-4 w-4" /> 등록</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 py-10 dark:bg-[#0B111E]">
      <SignupFlow />
    </div>
  )
}
