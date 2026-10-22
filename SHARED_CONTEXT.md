# 에이전트 공통 인수인계

프로젝트: phone community
원본 경로: C:\Users\user\.gemini\antigravity\scratch\phone community
연결일: 2026-09-10

## 사용자 작업 방식
토큰 한도에 따라 Antigravity, Claude Code, Codex를 번갈아 사용한다. 같은 원본 폴더와 이 문서를 기준으로 이어간다.

## 현재 상태
공유 연결만 설정됨. 기능 완료 여부와 다음 개발 작업은 아직 확인하지 않음.
작업 시작 시 실제 파일과 git status를 확인하고 기존 변경을 보존한다.

## 먼저 확인할 기존 문서
- [AGENTS.md](AGENTS.md)
- [CLAUDE.md](CLAUDE.md)
- [README.md](README.md)
- [task.md](task.md)
- [DESIGN.md](DESIGN.md)

## Antigravity 기존 기록
아래는 프로젝트 이름이 포함된 기록 후보이며, 현재 상태로 확정된 내용이 아니다. 날짜와 실제 코드를 대조하고 필요한 기록만 읽는다.
- 2026-07-15 19:32 [097a98b8-d134-4724-a580-ac6628bb7393/walkthrough.md](<C:\Users\user\.gemini\antigravity\brain\097a98b8-d134-4724-a580-ac6628bb7393\walkthrough.md>)
- 2026-07-15 19:32 [097a98b8-d134-4724-a580-ac6628bb7393/implementation_plan.md](<C:\Users\user\.gemini\antigravity\brain\097a98b8-d134-4724-a580-ac6628bb7393\implementation_plan.md>)

## 마지막 작업
- 담당 에이전트: Claude Code (2026-10-22)
- 요청: 세티즌 요금계산기 대비 계산기 전면 개편(스마트초이스 API), 아이보스(i-boss) UI 적용
- 변경 파일:
  - 신규: src/lib/calculator/{smartchoice,engine,devices}.ts, src/components/calculator/phone-fee-calculator.tsx, src/app/api/calculator/recommend/route.ts, src/components/layout/site-header.tsx
  - 수정: src/app/(public)/calculator/page.tsx(신규 계산기·FAQ 갱신), src/app/layout.tsx(lang=ko, 메타데이터, Pretendard), src/app/globals.css(폰트·배경 토큰), 홈/게시판목록/글상세 헤더를 SiteHeader로 교체, 보라 #7C3AED→#5707EB 등 색·카드 토큰 일괄 치환(page.tsx, board 페이지, main-tabbed-feed, footer, write-button, comment-section, vote-buttons, mypage)
  - 기존 src/components/calculator/subsidy-calculator.tsx는 삭제하지 않고 미사용 상태로 둠
- 결정/사실:
  - 스마트초이스 Open API: https://www.smartchoice.or.kr/api/openAPI.xml, 키는 .env.local의 SMARTCHOICE_API_KEY(git 제외). age는 실제 나이로 해석됨(20=청년 요금제) → 40/25/18/65 사용. 3사 요금제 약 116개 수집, 하루 캐시.
  - 단통법 폐지(2025-07-22): 추가지원금 상한 없음, 선택약정+추가지원금 중복 가능 → 계산기 반영.
  - 공시지원금은 API에 없음(스마트초이스 단말기 지원금 페이지는 CAPTCHA) → 사용자 입력.
  - 사용자 지시: 뽐뿌 이전 임포터는 만들지 않음. 가짜 계정 대량 생성·회원 위장 AI 글은 Claude Code가 거절함.
- 검증: tsc 통과, 신규 파일 eslint 통과, /calculator 브라우저에서 입력·통신사 전환·추천 API·모바일 375px 가로 넘침 없음 확인. 할부 계산 125.4만/24개월/5.9% → 월 55,522원 확인.
- (해결) Supabase 도메인 소실 → Contabo PostgreSQL로 전환 완료
- (해결) bypass_auth 우회 로그인 제거됨
- dev 서버: 포트 3000은 다른 프로젝트(remotion)가 점유 → 3002로 뜸. node_modules가 없어 npm ci로 설치함.

## DB·인증 전환 (Claude Code, 2026-10-22, 사용자 지시)
- Supabase 완전 제거 → Contabo PostgreSQL 18 (DB phonecommunity / 계정 phonecommunity_app, PgBouncer vmi3221360.contaboserver.net:6432, TLS 검증). 접속 문자열: .env.local DATABASE_URL.
- 스키마 db/schema.sql (멱등), 적용: npm run db:migrate. 접근 모듈 src/lib/db/index.ts (q/one/tx), 포인트·레벨 src/lib/db/points.ts.
- 자체 인증 src/lib/auth/session.ts (scrypt, 쿠키 pc_session, DB엔 토큰 해시만). 로그인/로그아웃 src/lib/actions/auth.ts, 가입 register.ts, 온보딩 profile.ts.
- 전환한 파일: lib/queries/*(board, post, comment, mypage, profile, search), lib/actions/*(post, comment, vote, anon-vote, attendance, view, register), 홈·게시판·글상세·마이페이지·고객지원·로그인·가입·온보딩 페이지, site-header, trending-keywords, sitemap.xml, llms.txt, middleware.ts(쿠키 존재만 확인). auth/callback은 /login 리다이렉트, api/create-test-user는 404로 비활성화.
- 제거된 동작: bypass_auth 쿠키 우회 로그인, 하드코딩 계정(client.ts), 문의글 제목 [by:...] 꼬리표.
- [2026-10-22 사용자 지시로 삭제] src/lib/supabase/ 폴더(admin·client·server·middleware.ts)와 @supabase/ssr·@supabase/supabase-js 의존성 제거. 남은 Supabase 대상: scripts/run-phone-crawler.js·커뮤크롤러.py(Supabase 대상, 미변경).
- 검증: tsc 통과, 브라우저로 가입→글쓰기→댓글→로그아웃→오답 로그인 거부→로그인→/mypage 리다이렉트·표시, 검색·게시판 목록·llms.txt 확인, Contabo DB에 profiles1/posts1/comments1/points 저장 확인. 서버 에러 로그 없음.
- 테스트 데이터: 계정 qatester01(비밀번호는 .env.local TEST_ACCOUNT_*), [테스트] 글 1·댓글 1이 Contabo DB에 있음.

## 다음 작업
- 게시판·글상세 i-boss 스타일 세부 다듬기(DB 연결됨)
- 공시지원금 데이터 소스(통신사 공식 공시 페이지) 수집 방식 결정
- AI 콘텐츠 파이프라인(운영 계정 발행 구조) 설계·구현은 미착수

## 전환 시 갱신할 내용
- 마지막 담당 / 시각
- 요청과 확정 결정
- 수정한 파일 / 미완료 변경
- 실행한 검증과 결과
- 다음 행동 / 막힌 점
- 비밀번호, API 키, 토큰은 기록하지 않는다.


## 광고 슬롯 준비 (Aside, 2026-10-22 18:50, 사용자 요청 "휴대폰성지 커뮤니티에 광고 붙이기")
- 신규: src/components/ads/ad-config.ts, src/components/ads/ad-slot.tsx(`<AdSlot placement="home-sidebar|post-bottom|board-list" />`, 클라이언트 컴포넌트), src/app/ads.txt/route.ts
- 수정: src/app/(public)/support/[tab]/terms-viewer.tsx(개인정보 처리방침 8조 "행태정보의 수집·이용 및 거부"(맞춤형 광고) 추가, 기존 8조→9조), src/components/legal/legal-docs.tsx(가입 화면 방침에 5조 맞춤형 광고 추가, 보호책임자 6조)
- 동작: NEXT_PUBLIC_AD_PROVIDER(adsense|adfit|coupang) 하나만 사용(애드핏 정책상 네트워크 동시 게재 금지). ID 미설정 시 NEXT_PUBLIC_HOUSE_AD_URL/TITLE/DESC 자사 광고, 그것도 없으면 렌더링 안 함. /ads.txt는 NEXT_PUBLIC_ADSENSE_CLIENT 있을 때만 응답(현재 404 확인).
- 미완료: page.tsx·board 페이지에 <AdSlot> 삽입은 다른 에이전트가 18:42에 같은 파일을 수정 중이라 하지 않음. 삽입 위치 제안: 홈 우측 사이드바 계산기 배너 아래(home-sidebar), 글상세 본문·댓글 사이(post-bottom), 게시판 목록 10번째 글 뒤(board-list).
- 검증: tsc 통과, 신규·수정 파일 eslint 통과, /support/terms 개인정보 탭에 8·9조 렌더링 확인. 방침 시행일자는 광고 실제 게재 시점에 갱신 필요. 도메인 phonecomu.com은 현재 DNS 미해결(미배포) → 애드센스·애드핏 심사는 배포 후 가능.

## 광고 슬롯 충돌 기록 (Claude Code, 2026-10-22 18:55)
- Aside가 18:50에 만든 src/components/ads/ad-slot.tsx를 Claude Code가 18:51에 같은 이름으로 덮어써 원본이 유실됨(미커밋 신규 파일이라 복구 불가).
- 조치: Aside의 ad-config.ts·ads.txt·약관 수정은 그대로 두고, ad-slot.tsx를 같은 설계(네트워크 1개만 사용 → 자사 광고)로 다시 작성. 차이: 광고가 없으면 "광고 영역" 자리표시를 보여줌(NEXT_PUBLIC_HIDE_AD_PLACEHOLDER=1이면 숨김). 호출은 <AdSlot slot="home-top|home-side|board-top|board-side|post-bottom|post-side|calc-bottom" /> 또는 기존 방식 <AdSlot placement="..." /> 둘 다 지원.
- 슬롯 크기·연결 placement: src/lib/ads/index.ts. 쿠팡 위젯 container 옵션은 실제 연동 시 확인 필요.
- 이 폴더를 여러 에이전트가 동시에 수정 중이었음 → 같은 파일 동시 수정 주의.

## 세티즌식 계산기·i-boss UI·광고 슬롯·배포·성지 평가 (Claude Code, 2026-10-22 저녁)
- 계산기 재작성(세티즌식 한 화면): 통신사·제조사·제품·요금제분류·가입조건 패널 + 요금제별 [공시/선약] 2줄 월청구액 표, 요금제별 공시지원금 입력, 유리 표시, 해지예상금. src/components/calculator/phone-fee-calculator.tsx
- 홈 i-boss 3단(820/180/360): 상단 광고 → 요금계산기 바로가기 칸(계산기 직접 삽입 아님, 사용자 지시) → 피드 / 바로가기 카드 / 프로필·광고·새글새댓글. 공통 ProfileCard·PopularList(src/components/home/). 게시판 목록·글상세 2단(본문+360). 헤더 i-boss 치수(80+52px, #663399 강조 메뉴, 광고 문의).
- 퀴즈·자리채움 이벤트 배너 삭제(사용자 지시). (auth)·(app) 그룹 layout과 search·u·support에 헤더 연결(홈 이동).
- 광고: AdSlot slot=home-top|home-side|board-top|board-side|post-bottom|post-side|calc-bottom 배치 완료. 광고 API는 사용자가 나중에 연결.
- 성지 평가: db/schema.sql에 stores·store_reviews·review 게시판 추가(migrate 적용됨). /seongji, /seongji/[id], /seongji/write. 실구매가 환산 = 기기 실부담(할부 5.9%) + 요금제 유지 차액 + 부가서비스(src/lib/seongji/cost.ts). 매장은 별칭+지역만, 연락처·링크 차단, 같은 매장 30일 1회.
- 배포: Vercel oraelintl 팀 프로젝트 phonecomu → https://phonecomu.vercel.app (리전 hnd1, 환경변수 DATABASE_URL·SMARTCHOICE_API_KEY(Sensitive)·NEXT_PUBLIC_SITE_NAME·NEXT_PUBLIC_KAKAO_MAP_KEY). 커밋 979e5c4까지 CLI 운영 배포됨. 0cc2142(성지 평가)는 로컬 커밋만, 미배포.
- GitHub: oraelintl/phonecomu 저장소 미생성(내장 브라우저 GitHub 미로그인, gh는 chunsang369만). 생성 후 git remote add orael git@github-oraelintl:oraelintl/phonecomu.git → push master:main → vercel git connect.
- 커밋 제외 유지: scratch/, scripts/(크롤러), .github/(4시간 크롤러 워크플로), .claude/, README_PPOMPPU.md. 커밋 작성자는 oraelintl(Vercel 배포 차단 방지).
- 제약: /api/upload가 public/uploads에 저장 → Vercel에서는 이미지 업로드 불가(읽기 전용 파일시스템). Contabo 저장소나 Vercel Blob으로 이전 필요.
- 테스트 데이터(Contabo DB): 계정 qatester01, [테스트] 글·댓글, [테스트] 강남역 2층 매장·후기 1건.
