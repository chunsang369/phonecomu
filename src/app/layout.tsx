import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site-url";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/schema";
import { baseOpenGraph } from "@/lib/seo/metadata";
import NavigationProgress from "@/components/ui/navigation-progress";
import Link from 'next/link';

export const metadata: Metadata = {
  ...(process.env.PHONE_DEMO === '1' ? {robots:{index:false,follow:false}} : {}),
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — 휴대폰 성지 평가·실구매가 비교 커뮤니티`,
    template: `%s`,
  },
  description: SITE_DESCRIPTION,
  // canonical·og:url은 각 페이지에서 지정 (루트에 두면 모든 페이지가 홈을 가리킴)
  openGraph: { ...baseOpenGraph, type: "website" },
  twitter: {
    card: "summary_large_image",
    images: ["/phone-community-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 아이보스와 같은 Pretendard 서체 (가변·동적 서브셋) */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col"><NavigationProgress />{children}<footer className="mt-auto border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500"><Link href="/demo/admin" className="hover:text-[#5707EB]">관리자</Link></footer></body>
    </html>
  );
}
