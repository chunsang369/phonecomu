import type { Metadata } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "폰커뮤니티";

export const metadata: Metadata = {
  title: {
    default: `${SITE} — 휴대폰 성지 시세·공시지원금·요금 계산기`,
    template: `%s`,
  },
  description:
    "휴대폰 성지 시세, 공시지원금과 선택약정 비교, 번호이동·기기변경 조건을 나누는 휴대폰 커뮤니티. SKT·KT·LG U+ 요금제로 24개월 총비용을 계산할 수 있습니다.",
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
