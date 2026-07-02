# 휴대폰 커뮤니티 플랫폼 — 기술 명세서 (DESIGN.md)

> **문서 버전:** v2.0 (로컬 우선 / 커뮤니티 코어 재편 / 보안·AEO 강화)
> **작성 목적:** AI 코딩 에이전트('안티')가 즉시 구현에 착수할 수 있도록 아키텍처·DB·기능·페이지·보안을 빠짐없이(MECE) 정의한 실행 지시서.
> **읽는 주체:** AI 코딩 에이전트. 모호한 서술 대신 **결정된 스펙**과 **실행 가능한 코드/스키마**로 기술함.
> **프로젝트 코드네임:** `phone-community` (정식 서비스명 미정 → `NEXT_PUBLIC_SITE_NAME` 주입, 하드코딩 금지)
> **실행 환경(중요):** **로컬 개발 우선.** 배포(호스팅/CDN)는 후순위이며 본 문서에서 제외한다. 배포 필요 시 §13.4의 스텁을 참조해 별도 결정한다.

---

## 0. 지시 요약 (BLUF)

**아이보스(i-boss)형 최신 UI/UX**(딥네이비 신뢰형, 고밀도지만 정돈된 피드, 평판 시각화, 모바일 가독성)를 이식하되, 뽐뿌·알고사식 구린 UI(CLS 레이아웃 시프트, 전면팝업, 오클릭 유도 광고)를 **명시적으로 금지**한다.

**최우선 목표(사용자 확정):**
1. **사용자가 스스로 참여하는 커뮤니티 환경** — 익명게시판·자유게시판·정보게시판을 **코어**로 먼저 구축한다. "사용자가 놀 수 있는 판"이 먼저다.
2. **아이보스형 최신 UI/UX.**
3. **SEO + AEO + GEO 최적화** — 축적된 UGC = 영구 유기 트래픽 + AI 답변엔진 인용 자산.

**휴대폰 특화 3단 퍼널**(시세표 → 좌표요청 → 구매후기)은 커뮤니티 코어 위에 얹는 **버티컬 기능**으로, 코어가 살아 움직인 뒤 순차 추가한다.

**전략적 포지셔닝:** 순수 커뮤니티 우선, 수익화 후순위. 초기 목표는 트래픽·SEO/AEO 자산 축적. BM(입점 수수료·광고·제휴)은 임계질량 돌파 후 Phase 3. **단, 아키텍처는 후속 BM 결합을 막지 않도록 확장 지점을 명시**한다.

**기술 스택(사용자 확정):** **Next.js 15(App Router) + Supabase(Postgres/Auth/Storage/Realtime).**

**설계 4대 원칙:**
1. **참여 우선(Participation-First)** — 익명/자유/정보 게시판이 코어. 진입 마찰 최소화(익명 글쓰기 허용), 초보 친화.
2. **AEO/GEO 우선** — 모든 공개 콘텐츠는 SSR/SSG + 답변 우선 구조 + 구조화 데이터 + AI 크롤러 허용을 기본 탑재.
3. **反다크패턴** — CLS 0 지향, 전면팝업 금지, 광고 회색 라벨 강제.
4. **보안 기본값(Secure by Default)** — **모든 공개 읽기는 base 테이블이 아니라 `public_*` 뷰로 통과.** 전 테이블 RLS 기본 차단, 인증은 Supabase Auth 위임(자체 비밀번호 저장 금지).

---

## 1. 프로젝트 개요 및 범위

### 1.1 무엇을 만드는가
휴대폰·통신 관심사를 중심으로 **사용자가 자유롭게 글을 쓰고 노는 버티컬 커뮤니티**. 그 위에 전국 '성지' 시세 그리드·비공개 좌표 교환·구매후기 검증이라는 **정보 비대칭 해소 버티컬**을 얹는다. 종합몰이 아니라 **단말기 유통 정보 비대칭 해소 + 커뮤니티 참여**에 집중한다.

### 1.2 V1 범위 (In-Scope) — 우선순위 순
| 순위 | 구분 | 포함 기능 |
| :--- | :--- | :--- |
| **1 (코어)** | **커뮤니티 게시판** | **익명게시판, 자유게시판, 정보게시판**, 공지 |
| **1 (코어)** | **참여 시스템** | 추천/다른의견, 댓글(트리·비밀댓글·베스트댓글), 신고 |
| **1 (코어)** | **회원/평판** | 카카오/이메일 가입, 프로필·평판 카드, 쪽지, 알림 |
| **1 (코어)** | **리워드** | 단순 포인트/등급, 출석, 레벨 기반 권한, 마이너스 레벨 제재 |
| **1 (코어)** | **발견성** | SEO + AEO + GEO, 통합 검색(FTS) |
| **2 (버티컬)** | **시세표 게시판** | 그리드 렌더·에디터·필터, 판매자 승인 라이트 |
| **2 (버티컬)** | **좌표요청** | 비공개 좌표 교환(쪽지/비밀댓글) + 실시간 알림 |
| **2 (버티컬)** | **구매후기/검증** | 폼·계약서 인증·검증·낚시 집계 |
| **1 (기반)** | **운영** | 관리자 모더레이션, 반응형 모바일 |

### 1.3 V1 제외 (Out-of-Scope, 후속 Phase)
- 캐시/기프티콘 환전, 리터/캐시 이원화 경제 → **V2**
- 자급제+알뜰폰 2년 총비용 시뮬레이터 → **V2**
- 시세 추이 차트 → **V2** (단, `price_snapshots` 적재는 시세표 도입 시점부터 시작)
- 성지 입점 결제·보증금 에스크로·제휴 링크 → **V3(수익화)**
- 네이티브 앱 → **V2 PWA → V3 RN/Flutter**
- **배포·호스팅·CDN·봇방어(Turnstile)·Rate Limit 인프라 → 배포 결정 시점으로 유예**(§13.4)

### 1.4 비목표 (Non-Goals)
- 위치정보(주소/전화/오픈채팅 링크)를 **공개 본문에 노출하지 않는다**. 반드시 비공개 채널(쪽지/비밀댓글)로만.
- V1에서 PG 연동 없음.

---

## 2. Technical Stack & System Architecture (Local-First)

### 2.1 확정 스택
| 레이어 | 기술 | 비고 |
| :--- | :--- | :--- |
| **프레임워크** | **Next.js 15+ (App Router, RSC, Server Actions)** | Pages Router 금지. 전면 App Router. |
| **언어** | **TypeScript (strict: true)** | `any` 금지. `zod`로 런타임 검증. |
| **DB/백엔드** | **Supabase** — Postgres 15, Auth, Storage, Realtime, Edge Functions(Deno) | 단일 BaaS. |
| **DB 접근** | **`@supabase/ssr`** (서버/클라이언트 분리 클라이언트) | 쿠키 기반 세션. `@supabase/auth-helpers`(deprecated) 금지. |
| **스타일** | **Tailwind CSS + CSS 변수 토큰** | 디자인 토큰은 CSS 변수로(§3). |
| **UI 컴포넌트** | **shadcn/ui** (Radix 기반) + 자체 컴포넌트 | 접근성·개발 속도. |
| **폼/검증** | **react-hook-form + zod** | 서버액션 입력도 zod로 재검증. |
| **데이터 페칭** | 읽기=RSC 서버 페칭 / 실시간=Supabase Realtime / 클라 캐시 필요시 **TanStack Query** | 과도한 client fetch 금지. |
| **이미지** | Next/Image + Supabase Storage(서명 URL) | 후기 계약서 사진은 **private 버킷**. |
| **폰트** | **Pretendard Variable**(self-host, `font-display: swap`) | 한글 웹표준. |
| **아이콘** | lucide-react | |
| **테스트** | Vitest(유닛) + Playwright(E2E) | |
| **로컬 DB 실행** | **Supabase Cloud 프로젝트(원격)** 또는 **`supabase start`(로컬 Docker)** | §2.4 참조 |

> **버전 주의:** 구현 시점의 **최신 stable**을 사용하되 위 패턴(App Router, `@supabase/ssr`)을 반드시 준수. 메이저 breaking change는 착수 전 릴리스노트 확인.

### 2.2 아키텍처 개요 (로컬)
```
┌──────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                                  │
│   - React Server Components (초기 HTML, SEO/AEO)          │
│   - Client Components (투표/폼/실시간 구독)               │
└───────────────┬────────────────────────────┬──────────────┘
                │ HTTP                         │ WSS(Realtime)
        ┌───────▼────────┐            ┌────────▼─────────┐
        │  Next.js (dev)  │           │ Supabase Realtime │
        │  - RSC 렌더      │           │ (알림/좌표응답/핫) │
        │  - Server Actions│          └────────┬─────────┘
        │  - Route Handlers│                   │
        │  - Middleware(세션)│                 │
        └───────┬──────────┘                   │
                │ anon/service key (RLS 적용)   │
        ┌───────▼───────────────────────────────▼─────────┐
        │            Supabase (Postgres 15)                 │
        │  - Tables + RLS(기본 차단) + public_* 뷰(공개면)  │
        │  - RPC(트랜잭션) + pg_cron(핫승격/레벨/스냅샷)    │
        │  - Auth (Kakao/Email) - Storage(공개/비공개 버킷) │
        └───────────────────────────────────────────────────┘
```
> 배포 인프라(호스팅/CDN/WAF)는 이 다이어그램에 **의도적으로 없음**. 로컬 검증 완료 후 §13.4에서 별도 결정.

### 2.3 폴더 구조 (App Router 기준, 확정)
```
/src
  /app
    /(public)                 # 비로그인 접근 가능 그룹 (SEO/AEO 표면)
      /page.tsx               # 홈(피드)
      /board/[slug]/page.tsx          # 게시판 목록(익명/자유/정보/공지)
      /board/[slug]/[id]/page.tsx     # 게시글 상세 + 댓글트리
      /price/[region]/page.tsx        # (V1-2) 시세표 지역별 목록
      /price/post/[id]/page.tsx       # (V1-2) 시세표 상세(그리드)
      /coordinate/page.tsx            # (V1-2) 좌표요청 목록
      /coordinate/[id]/page.tsx       # (V1-2) 좌표요청 상세
      /review/page.tsx                # (V1-2) 구매후기 목록
      /review/[id]/page.tsx           # (V1-2) 후기 상세
      /device/[slug]/page.tsx         # (V1-2) 단말기 SEO 허브
      /u/[username]/page.tsx          # 공개 프로필/평판 카드
      /search/page.tsx
    /(auth)
      /login/page.tsx
      /auth/callback/route.ts         # OAuth 콜백
      /onboarding/page.tsx            # 닉네임 설정
    /(app)                    # 로그인 필요 그룹
      /write/[boardType]/page.tsx     # 글쓰기(타입별 폼)
      /messages/page.tsx
      /notifications/page.tsx
      /mypage/page.tsx
      /seller/apply/page.tsx          # (V1-2)
      /seller/dashboard/page.tsx      # (V1-2)
    /(admin)
      /admin/...
    /api
      /sitemap.xml/route.ts
      /robots.txt/route.ts
      /llms.txt/route.ts              # GEO
    layout.tsx  globals.css  not-found.tsx  error.tsx
  /components                 # UI 컴포넌트(§3.4)
  /lib
    /supabase
      client.ts               # 브라우저 클라이언트
      server.ts               # 서버(RSC/액션) 클라이언트
      middleware.ts           # 세션 갱신
    /actions                  # Server Actions(도메인별)
    /queries                  # 재사용 서버 쿼리 (public_* 뷰 사용)
    /validators               # zod 스키마
    /auth                     # 권한 가드 유틸
    /seo                      # metadata/jsonld 빌더
    utils.ts  constants.ts
  /types                      # DB 타입(supabase gen types), 도메인 타입
/supabase
  /migrations                 # SQL 마이그레이션(버전관리)
  /functions                  # Edge Functions
  config.toml
middleware.ts
```

### 2.4 로컬 DB 실행 방식 (2택)
| 방식 | 설명 | 권장 상황 |
| :--- | :--- | :--- |
| **A. Supabase Cloud(원격) + 로컬 Next.js** | 대시보드에서 만든 원격 프로젝트에 로컬 앱이 접속. 스키마는 마이그레이션 push. | **기본 권장.** 서울 리전. 설정 간단. |
| **B. `supabase start`(로컬 Docker)** | Postgres·Auth·Storage를 전부 로컬 컨테이너로. 오프라인·격리 개발. | 완전 로컬 격리가 필요할 때. Docker 필요. |

> **기본은 A.** 원격 Supabase(서울)에 로컬 앱이 붙는 구조. 마이그레이션은 `/supabase/migrations`에 SQL로 작성 후 `supabase db push`.
> **커넥션 풀링:** 서버액션이 Postgres 커넥션을 남발하는 함정 방지를 위해 **Supavisor(transaction mode) 풀러 연결 문자열** 사용.

---

## 3. 디자인 시스템 (아이보스형 최신 UI/UX)

> **목표:** "포털의 가벼움이 아닌 **비즈니스 도구의 중후함 및 신뢰**". 딥네이비/블루 톤, 고밀도지만 정돈된 피드, 평판 시각화, 장문 가독성. **뽐뿌·알고사식 구린 밀도·낚시광고 배제.**

### 3.1 컬러 토큰 (`globals.css`)
```css
:root {
  /* Brand — Deep Navy 신뢰형 */
  --color-primary: #16305B;        /* 딥네이비 (헤더/주요 액션) */
  --color-primary-hover: #1E4079;
  --color-accent: #2563EB;         /* 신뢰 블루 (링크/포인트) */
  --color-accent-soft: #EFF4FF;

  /* Neutral */
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F7F8FA;
  --color-border: #E5E8EC;
  --color-text: #1A1D24;
  --color-text-sub: #5B6472;
  --color-text-mute: #9AA3B0;

  /* Semantic */
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-danger:  #DC2626;
  --color-sponsor: #6B7280;        /* 광고 라벨(회색 강제) */

  /* 가독성 */
  --font-body: 15px;
  --line-height-body: 1.6;
  --radius: 8px;
  --shadow-card: 0 1px 3px rgba(16,32,91,.06);
}
```
**다크모드:** `prefers-color-scheme` + `.dark` 토큰 별도 정의(V1 필수). 네이비 계열은 다크에서 명도만 조정.

### 3.2 타이포그래피
- **Pretendard Variable**(self-host, swap).
- 본문 **15~16px / line-height 1.6**. 모바일에서 폰트 축소 금지.
- 스케일: H1 24px / H2 20px / H3 17px / body 15px / caption 13px.
- 숫자(가격/조회수)는 **tabular-nums**.

### 3.3 레이아웃 원칙
- **홈/피드:** 상단 '핫게시판 · 최신 익명글 · 정보게시판 인기글'을 타임라인 피드로(1초 스캔). 3단 그리드(데스크톱) → 단일 열(모바일).
- **정보 밀도 듀얼뷰:** 게시판 목록 **[고밀도 텍스트 뷰] / [카드 뷰]** 토글. 선호 `localStorage`. **초기 SSR은 고밀도 텍스트 뷰 기본**(SEO·스캔 속도).
- **여백:** 알고사식 극단 고밀도는 지양하되 정보량은 유지(넉넉한 여백의 모던 그리드).
- **평판 시각화:** 작성자 옆에 **등급 배지 · 누적 채택수 · 신뢰지수** 상시 노출. **단, 익명게시판에서는 평판 노출 없이 '익명 태그'만.**

### 3.4 필수 컴포넌트 (`/components`)
| 컴포넌트 | 설명 | 핵심 요구 |
| :--- | :--- | :--- |
| `Header/GNB` | 딥네이비 상단바(로그인/알림/쪽지) | 모바일 햄버거 + 하단 탭바 |
| `BoardList` | 게시판 목록(듀얼뷰 토글) | 고밀도/카드, 페이지네이션+무한스크롤 |
| `PostView` | 게시글 본문 뷰 | 답변 우선 구조 렌더, JSON-LD 슬롯 |
| `AnonBadge` | **익명 태그** | 스레드별 `익명-XXXX`, 평판 숨김 |
| `CommentTree` | 트리 댓글 | 비밀댓글·베스트댓글 고정·대댓글·익명 지원 |
| `VoteButtons` | 추천/다른의견 | 낙관적 업데이트, 중복방지 |
| `ReputationCard` | 평판 카드 | 등급/채택수/신뢰지수 (익명글 제외) |
| `LevelBadge` | 등급 배지 | 마이너스 레벨 시각 경고 |
| `AdSlot` | 광고 슬롯 | **고정 min-height 예약(CLS 0)** · 'Sponsor' 회색 라벨 강제 |
| `Skeleton` | 스켈레톤 로더 | 레이아웃 시프트 방지 |
| `NotificationBell` `MessageDrawer` | 실시간 알림/쪽지 | Realtime 구독 |
| `SearchBox` | 통합 검색 | FTS |

### 3.5 접근성/품질
- WCAG 2.1 AA 색 대비. 키보드 내비게이션·포커스 링(shadcn/Radix). 모든 이미지 `alt`, 폼 `label` 필수.

---

## 4. 데이터베이스 스키마 (Supabase / PostgreSQL 15)

> **철칙:** ① 모든 테이블 **RLS ENABLE + 기본 차단**. ② **모든 공개 읽기는 base 테이블이 아니라 `public_*` 뷰로.** ③ 비밀번호·PII 자체 저장 금지(Auth 위임). ④ 마이그레이션은 `/supabase/migrations`에 SQL. ⑤ 타입은 `supabase gen types typescript` → `/types/database.ts`.

### 4.1 ENUM 타입
```sql
create type user_role      as enum ('member','seller','moderator','admin');
create type user_status    as enum ('active','suspended','banned');
create type board_type     as enum ('anonymous','free','info','notice','price_table','coordinate','review','qna');
create type post_status    as enum ('published','hidden','deleted','pending');
create type activation_type as enum ('MNP','DEVICE_CHANGE','NEW'); -- 번이/기변/신규 (V1-2)
create type vote_target    as enum ('post','comment');
create type report_status  as enum ('open','reviewing','resolved','rejected');
create type notif_type     as enum ('comment','reply','coordinate_answer','message','adopted','vote_milestone','system');
```

### 4.2 마스터/사용자 테이블
```sql
-- 4.2.1 프로필 (auth.users 확장) : 회원가입 트리거로 자동 생성
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  avatar_url    text,
  role          user_role   not null default 'member',
  status        user_status not null default 'active',
  level         int  not null default 1,
  activity_points int not null default 0,
  penalty_points  int not null default 0,
  attendance_days int not null default 0,
  adopted_count   int not null default 0,
  trust_score     numeric(5,2) not null default 0,
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 4.2.2 지역 (V1-2)
create table regions (
  id serial primary key, name text not null, slug text unique not null,
  parent_id int references regions(id), sort int default 0
);
-- 4.2.3 통신사 (V1-2)
create table carriers (
  id serial primary key, code text unique not null, name text not null, color text
);
-- 4.2.4 단말기 (V1-2 SEO 허브)
create table devices (
  id serial primary key, manufacturer text not null, model_name text not null,
  slug text unique not null, storage text, release_price int, release_date date,
  image_url text, is_active boolean default true
);
-- 4.2.5 성지(판매점) (V1-2 라이트)
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete set null,
  alias text not null, region_id int references regions(id),
  is_verified boolean default false, status user_status default 'active',
  memo text, created_at timestamptz default now()
);
```

### 4.3 게시판/게시글
```sql
-- 4.3.1 게시판 정의
create table boards (
  id serial primary key,
  slug text unique not null,
  name text not null,
  type board_type not null,
  allow_anonymous boolean default false,   -- 익명 글쓰기 허용 여부
  region_scoped boolean default false,     -- 시세표/좌표(V1-2)
  read_min_level int default 0,
  write_min_level int default 1,
  writer_role user_role,                   -- null이면 레벨만. 'seller'면 판매자 전용(시세표)
  description text,
  sort int default 0
);

-- 4.3.2 게시글(공통 base)
create table posts (
  id uuid primary key default gen_random_uuid(),
  board_id int not null references boards(id),
  author_id uuid references profiles(id) on delete set null,  -- 익명글도 내부적으로 보관(모더레이션/포인트)
  is_anonymous boolean not null default false,                -- 공개 시 author 은닉
  title text not null,
  content text,
  region_id int references regions(id),           -- V1-2
  device_id int references devices(id),           -- V1-2
  reference_post_id uuid references posts(id),     -- V1-2 좌표->시세표
  store_id uuid references stores(id),            -- V1-2
  status post_status not null default 'published',
  is_pinned boolean default false,
  is_hot boolean default false,
  view_count int default 0,
  upvotes int default 0,
  downvotes int default 0,
  comment_count int default 0,
  hot_score numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_posts_board_created on posts(board_id, created_at desc) where status='published';
create index idx_posts_region on posts(region_id) where status='published';
create index idx_posts_device on posts(device_id);
create index idx_posts_hot on posts(is_hot, hot_score desc);
create index idx_posts_ref on posts(reference_post_id);
```

### 4.4 상호작용 테이블
```sql
-- 4.4.1 댓글(트리 + 비밀댓글 + 익명 + 베스트)
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  is_anonymous boolean not null default false,
  parent_id uuid references comments(id) on delete cascade,
  content text not null,
  is_secret boolean default false,   -- 좌표 응답(V1-2): 글쓴이+작성자+관리자만
  upvotes int default 0,
  status post_status default 'published',
  created_at timestamptz not null default now()
);
create index idx_comments_post on comments(post_id, created_at);

-- 4.4.2 투표
create table votes (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  target_type vote_target not null,
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz default now(),
  unique (user_id, target_type, target_id)
);

-- 4.4.3 쪽지
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete set null,
  receiver_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  ref_post_id uuid references posts(id),
  read_at timestamptz, created_at timestamptz default now()
);
create index idx_msg_receiver on messages(receiver_id, created_at desc);

-- 4.4.4 신고
create table reports (
  id bigserial primary key,
  reporter_id uuid references profiles(id),
  target_type vote_target not null, target_id uuid not null,
  reason text not null, status report_status default 'open',
  handled_by uuid references profiles(id), created_at timestamptz default now()
);

-- 4.4.5 알림
create table notifications (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  type notif_type not null, payload jsonb not null,
  read_at timestamptz, created_at timestamptz default now()
);
create index idx_notif_user on notifications(user_id, created_at desc) where read_at is null;
```

### 4.5 리워드/운영 테이블
```sql
create table point_transactions (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  kind text not null,
  ref_id uuid, created_at timestamptz default now()
);
create index idx_pt_user on point_transactions(user_id, created_at desc);

create table levels (
  level int primary key, name text not null,
  min_activity int not null, min_attendance int not null default 0,
  permissions jsonb not null default '{}'
);

create table attendance (
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null default current_date,
  primary key (user_id, day)
);

-- (V1-2) 판매자 신청
create table seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  store_name text not null, region_id int references regions(id),
  contact text, status report_status default 'open',
  reviewed_by uuid references profiles(id), created_at timestamptz default now()
);
```

### 4.6 RLS + 공개 뷰 (보안 패턴)
```sql
-- 권한 헬퍼
create or replace function auth_role() returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;
create or replace function is_staff() returns boolean language sql stable security definer as $$
  select coalesce((select role in ('moderator','admin') from profiles where id = auth.uid()), false);
$$;
create or replace function my_level() returns int language sql stable security definer as $$
  select coalesce((select level from profiles where id = auth.uid()), 0);
$$;

------------------------------------------------------------------
-- profiles : base 잠금, 본인/스태프만 직접 접근
------------------------------------------------------------------
alter table profiles enable row level security;
create policy "profiles self read"   on profiles for select using (id = auth.uid() or is_staff());
create policy "profiles self update" on profiles for update using (id = auth.uid());

-- 공개 안전 뷰
create view public_profiles as
  select id, username, display_name, avatar_url, role, level, adopted_count, trust_score, created_at
  from profiles
  where status = 'active';
grant select on public_profiles to anon, authenticated;

------------------------------------------------------------------
-- posts : base 잠금(본인/스태프), 공개는 public_posts 뷰
------------------------------------------------------------------
alter table posts enable row level security;
create policy "posts owner read" on posts for select using (author_id = auth.uid() or is_staff());
create policy "posts insert" on posts for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from boards b
      where b.id = board_id
        and my_level() >= b.write_min_level
        and (b.writer_role is null or b.writer_role = auth_role())
        and (is_anonymous = false or b.allow_anonymous = true)
    )
  );
create policy "posts update own" on posts for update using (author_id = auth.uid() or is_staff());
create policy "posts delete own" on posts for delete using (author_id = auth.uid() or is_staff());

-- 공개 안전 뷰
create view public_posts as
  select
    p.id, p.board_id, p.title, p.content,
    p.region_id, p.device_id, p.reference_post_id, p.store_id,
    p.status, p.is_pinned, p.is_hot, p.view_count,
    p.upvotes, p.downvotes, p.comment_count, p.hot_score,
    p.created_at, p.updated_at, p.is_anonymous,
    case when p.is_anonymous then null else p.author_id end as author_id,
    case when p.is_anonymous
         then '익명-' || substr(md5(p.author_id::text || p.id::text), 1, 4)
         else null end as anon_tag
  from posts p
  where p.status = 'published'
    and (select read_min_level from boards b where b.id = p.board_id) <= 0;
grant select on public_posts to anon, authenticated;

------------------------------------------------------------------
-- comments : base 잠금, 공개는 public_comments 뷰
------------------------------------------------------------------
alter table comments enable row level security;
create policy "comments owner read" on comments for select using (
  author_id = auth.uid()
  or is_staff()
  or (is_secret and auth.uid() = (select author_id from posts p where p.id = post_id))
);
create policy "comments insert" on comments for insert with check (author_id = auth.uid());
create policy "comments modify" on comments for update using (author_id = auth.uid() or is_staff());

create view public_comments as
  select
    c.id, c.post_id, c.parent_id, c.content, c.upvotes, c.created_at, c.is_anonymous,
    case when c.is_anonymous then null else c.author_id end as author_id,
    case when c.is_anonymous
         then '익명-' || substr(md5(c.author_id::text || c.post_id::text), 1, 4)
         else null end as anon_tag
  from comments c
  where c.status = 'published' and c.is_secret = false;
grant select on public_comments to anon, authenticated;

------------------------------------------------------------------
-- 기타 상호작용 RLS
------------------------------------------------------------------
alter table messages enable row level security;
create policy "msg read"   on messages for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "msg insert" on messages for insert with check (sender_id = auth.uid());

alter table votes enable row level security;
create policy "votes rw" on votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table notifications enable row level security;
create policy "notif read" on notifications for select using (user_id = auth.uid());

alter table point_transactions enable row level security;
create policy "pt read" on point_transactions for select using (user_id = auth.uid());

alter table attendance enable row level security;
create policy "att read" on attendance for select using (user_id = auth.uid());

alter table reports enable row level security;
create policy "report insert" on reports for insert with check (reporter_id = auth.uid());
create policy "report staff read" on reports for select using (is_staff());
```

### 4.7 트리거 & RPC (pg_cron 명시)
- `handle_new_user()` : `auth.users` 가입 시 profiles 자동 생성 트리거
- `cast_vote()` : 추천/다른의견 처리, 자기투표 방지, 집계, 패널티 차감 RPC
- `daily_attendance()` : 1일 1회 출석체크, 포인트 부여 RPC
- `award_points()` : 포인트 트랜잭션 기록 및 profiles 가산 함수
- `recalc_level()` : 레벨(마이너스 포함) 조건 자동 계산 트리거
- `adopt_answer()` : 질답 답변 채택 처리 RPC
- `promote_hot()` : pg_cron으로 주기적(10분) 핫스코어 및 핫글 승격 계산

---

## 5. 핵심 기능 명세

### 5.1 [코어] 커뮤니티 게시판 (익명 / 자유 / 정보)

#### 5.1.1 익명게시판 (`type='anonymous'`)
- **글쓰기:** 로그인 필수, `is_anonymous=true` 기본 저장.
- **렌더링:** `public_posts` 및 `public_comments` 뷰를 사용하여 작성자의 실제 ID를 숨기고 스레드 고유 `익명-XXXX` 해시태그를 생성하여 표시. 스레드 밖에서는 동일인 추적 불가.
- **거버넌스:** 서버에서는 어뷰징 방지 및 제재(마이너스 등급화)를 위해 base 테이블에 원래 author_id를 기록.

#### 5.1.2 자유게시판 (`type='free'`)
- 실명(닉네임) 기반의 평판 축적. 
- 추천/댓글로 포인트를 획득하여 레벨업 가능.

#### 5.1.3 정보게시판 (`type='info'`) — **AEO/GEO 엔진**
- 질문형 정보 글 중심.
- **Answer-first 구조 강제:** 글 작성 시 "질문 -> 핵심 결론 요약 -> 상세 설명" 구조의 템플릿 사용 권장.
- **구조화 데이터:** JSON-LD `QAPage`/`FAQPage` 동적 삽입.

### 5.2 [V1-2 버티컬] 3단 퍼널 (시세표 → 좌표 → 후기)
- **시세표:** `seller` 역할 인증 계정 전용. 출고가 대비 리베이트 그리드 노출.
- **좌표요청:** 쪽지/비밀댓글(`is_secret=true`)로만 위치 공유 가능. 실시간 Realtime 알림 연동.
- **구매후기:** 계약서 사진 업로드(private 버킷) 및 평판지수(`trust_score`) 연동.

### 5.3 리워드 및 거버넌스
- **이원 조건 레벨업:** 활동 포인트와 누적 출석일수를 동시 충족해야 승급.
- **마이너스 레벨 패널티:** 다른의견(Downvote) 폭탄 또는 스폰서/바이럴 위반 시 레벨이 마이너스로 강등되며, 이 경우 **쓰기 기능 전면 차단(읽기만 허용)**.

---

## 6. SEO · AEO · GEO 전략

### 6.1 기술 SEO
- **전체 공개 페이지 SSR/RSC 렌더링:** 크롤러가 자바스크립트 실행 없이 완전한 HTML을 파싱하도록 제어.
- **JSON-LD 구조화 데이터:** `DiscussionForumPosting` (일반글), `QAPage` (질답/정보글).
- **robots.txt / sitemap.xml:** AI 봇(GPTBot, ClaudeBot 등) 명시적 허용 및 동적 사이트맵 제공.

### 6.2 AEO & GEO 최적화
- **헤딩 구조와 결론 중심 문단:** AI 검색엔진이 스니펫으로 인용하기 쉽도록 단락의 첫 두 줄에 요약 답변 명시.
- **llms.txt 제공:** LLM 크롤러를 위한 사이트 정보 맵 마크다운 파일 동적 제공.
