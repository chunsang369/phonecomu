import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site-url";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/schema";
import { baseOpenGraph } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — 휴대폰 성지 평가·실구매가 비교 커뮤니티`,
    template: `%s`,
  },
  description: SITE_DESCRIPTION,
  // canonical·og:url은 각 페이지에서 지정 (루트에 두면 모든 페이지가 홈을 가리킴)
  openGraph: { ...baseOpenGraph, type: "website" },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
