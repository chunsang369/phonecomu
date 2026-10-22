import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모든 봇에 메타데이터를 <head>에 완성된 상태로 보낸다(스트리밍 메타데이터 끔 — 답변 엔진 크롤러가 제목·설명을 놓치지 않게)
  htmlLimitedBots: /.*/,
};

export default nextConfig;
