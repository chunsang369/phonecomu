-- 휴대폰 커뮤니티 스키마 (Contabo PostgreSQL 18, DB: phonecommunity)
-- Supabase 스키마(supabase/migrations)에서 auth.users·RLS 의존을 제거하고 자체 인증 테이블을 추가한 버전.
-- 여러 번 실행해도 안전하도록 IF NOT EXISTS / ON CONFLICT 로 작성한다.  실행: npm run db:migrate

create extension if not exists pgcrypto;

-- ── 회원 ──
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  username        text not null,
  display_name    text not null,
  password_hash   text not null,
  recovery_email  text,
  mailing_opt_in  boolean not null default true,
  avatar_url      text,
  role            text not null default 'member' check (role in ('member','seller','moderator','admin')),
  status          text not null default 'active' check (status in ('active','suspended','banned')),
  level           int  not null default 1,
  activity_points int  not null default 0,
  penalty_points  int  not null default 0,
  attendance_days int  not null default 0,
  adopted_count   int  not null default 0,
  trust_score     numeric(5,2) not null default 0,
  bio             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists uq_profiles_username on profiles (lower(username));
create unique index if not exists uq_profiles_display_name on profiles (lower(display_name));

-- 로그인 세션 (쿠키에는 원문 토큰, DB에는 SHA-256 해시만 저장)
create table if not exists sessions (
  token_hash  text primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists idx_sessions_user on sessions (user_id);

create table if not exists levels (
  level          int primary key,
  name           text not null,
  min_activity   int not null,
  min_attendance int not null default 0,
  permissions    jsonb not null default '{}'
);

-- ── 게시판 ──
create table if not exists boards (
  id              serial primary key,
  slug            text unique not null,
  name            text not null,
  type            text not null,
  allow_anonymous boolean not null default false,
  read_min_level  int not null default 0,
  write_min_level int not null default 1,
  description     text,
  sort            int not null default 0
);

create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  board_id      int not null references boards(id),
  author_id     uuid references profiles(id) on delete set null,
  is_anonymous  boolean not null default false,
  title         text not null,
  content       text,
  status        text not null default 'published' check (status in ('published','hidden','deleted','pending')),
  is_pinned     boolean not null default false,
  is_hot        boolean not null default false,
  view_count    int not null default 0,
  upvotes       int not null default 0,
  downvotes     int not null default 0,
  comment_count int not null default 0,
  source        text,
  source_ref    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_posts_board_created on posts (board_id, is_pinned desc, created_at desc) where status = 'published';
create index if not exists idx_posts_author on posts (author_id, created_at desc);
create index if not exists idx_posts_created on posts (created_at desc) where status = 'published';
create unique index if not exists uq_posts_source on posts (source, source_ref) where source_ref is not null;

create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references posts(id) on delete cascade,
  author_id    uuid references profiles(id) on delete set null,
  is_anonymous boolean not null default false,
  parent_id    uuid references comments(id) on delete cascade,
  content      text not null,
  is_secret    boolean not null default false,
  upvotes      int not null default 0,
  status       text not null default 'published',
  created_at   timestamptz not null default now()
);
create index if not exists idx_comments_post on comments (post_id, created_at);
create index if not exists idx_comments_author on comments (author_id, created_at desc);

create table if not exists votes (
  user_id     uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment')),
  target_id   uuid not null,
  value       smallint not null check (value in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table if not exists notifications (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  payload    jsonb not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications (user_id, created_at desc) where read_at is null;

create table if not exists point_transactions (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  amount     int not null,
  kind       text not null,
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_pt_user on point_transactions (user_id, created_at desc);

create table if not exists attendance (
  user_id uuid not null references profiles(id) on delete cascade,
  day     date not null default (now() at time zone 'Asia/Seoul')::date,
  primary key (user_id, day)
);

-- ── 기본 데이터 ──
insert into levels (level, name, min_activity, min_attendance, permissions) values
  (1, '새싹',   0,      0,   '{"dm": false, "write": true, "comment": true}'),
  (2, '일반',   100,    3,   '{"dm": true, "write": true, "comment": true}'),
  (3, '우수',   500,    10,  '{"dm": true, "write": true, "comment": true}'),
  (4, '전문가', 2000,   30,  '{"dm": true, "write": true, "comment": true}'),
  (5, '스태프', 10000,  100, '{"dm": true, "write": true, "comment": true, "moderate": true}'),
  (6, '관리자', 999999, 999, '{"dm": true, "write": true, "comment": true, "moderate": true, "admin": true}')
on conflict (level) do nothing;

insert into boards (slug, name, type, allow_anonymous, read_min_level, write_min_level, description, sort) values
  ('anonymous',  '익명게시판',       'anonymous',  true,  0,  1, '통신 업계 속사정과 솔직한 이야기를 나누는 익명 공간', 10),
  ('free',       '자유게시판',       'free',       false, 0,  1, '휴대폰과 일상 이야기를 자유롭게 나누는 공간', 20),
  ('info',       '휴대폰정보나눔',   'info',       false, 0,  1, '공시지원금·선택약정·번호이동 정보와 꿀팁 공유', 30),
  ('coordinate', '지역별 시세표',     'coordinate', false, 0,  1, '지역별 휴대폰 시세와 조건 공유', 35),
  ('qna',        '질문/답변게시판',   'qna',        false, 0,  1, '휴대폰 개통·요금제 질문과 답변', 38),
  ('notice',     '공지사항',         'notice',     false, 0,  5, '운영 공지사항', 40),
  ('inquiry',    '문의게시판',       'inquiry',    false, 10, 1, '1:1 비밀 문의게시판입니다. 본인이 작성한 글만 보입니다.', 99)
on conflict (slug) do nothing;
