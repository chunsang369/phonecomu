import SiteHeader from '@/components/layout/site-header'

// 이 그룹의 페이지(로그인·가입·마이페이지·글쓰기 등)에도 공통 헤더(홈·메뉴)를 표시
export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
