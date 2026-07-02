-- ====================================================================
-- 1. ENUM 타입 정의
-- ====================================================================
create type user_role      as enum ('member','seller','moderator','admin');
create type user_status    as enum ('active','suspended','banned');
create type board_type     as enum ('anonymous','free','info','notice','price_table','coordinate','review','qna');
create type post_status    as enum ('published','hidden','deleted','pending');
create type activation_type as enum ('MNP','DEVICE_CHANGE','NEW');
create type vote_target    as enum ('post','comment');
create type report_status  as enum ('open','reviewing','resolved','rejected');
create type notif_type     as enum ('comment','reply','coordinate_answer','message','adopted','vote_milestone','system');

-- ====================================================================
-- 2. 테이블 스키마 정의
-- ====================================================================

-- 2.1 프로필 테이블 (auth.users 연동)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  avatar_url    text,
  role          user_role   not null default 'member',
  status        user_status not null default 'active',
  level         int         not null default 1,
  activity_points int       not null default 0,
  penalty_points  int       not null default 0,
  attendance_days int       not null default 0,
  adopted_count   int       not null default 0,
  trust_score     numeric(5,2) not null default 0.0,
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2.2 지역 테이블 (V1-2용)
create table regions (
  id serial primary key,
  name text not null,
  slug text unique not null,
  parent_id int references regions(id),
  sort int default 0
);

-- 2.3 통신사 테이블 (V1-2용)
create table carriers (
  id serial primary key,
  code text unique not null,
  name text not null,
  color text
);

-- 2.4 단말기 테이블 (V1-2용)
create table devices (
  id serial primary key,
  manufacturer text not null,
  model_name text not null,
  slug text unique not null,
  storage text,
  release_price int,
  release_date date,
  image_url text,
  is_active boolean default true
);

-- 2.5 성지(판매점) 테이블 (V1-2용)
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete set null,
  alias text not null,
  region_id int references regions(id),
  is_verified boolean default false,
  status user_status default 'active',
  memo text,
  created_at timestamptz default now()
);

-- 2.6 게시판 정의 테이블
create table boards (
  id serial primary key,
  slug text unique not null,
  name text not null,
  type board_type not null,
  allow_anonymous boolean default false,
  region_scoped boolean default false,
  read_min_level int default 0,
  write_min_level int default 1,
  writer_role user_role,
  description text,
  sort int default 0
);

-- 2.7 게시글 테이블
create table posts (
  id uuid primary key default gen_random_uuid(),
  board_id int not null references boards(id),
  author_id uuid references profiles(id) on delete set null,
  is_anonymous boolean not null default false,
  title text not null,
  content text,
  region_id int references regions(id),
  device_id int references devices(id),
  reference_post_id uuid references posts(id),
  store_id uuid references stores(id),
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

-- 2.8 댓글 테이블
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  is_anonymous boolean not null default false,
  parent_id uuid references comments(id) on delete cascade,
  content text not null,
  is_secret boolean default false,
  upvotes int default 0,
  status post_status default 'published',
  created_at timestamptz not null default now()
);

create index idx_comments_post on comments(post_id, created_at);

-- 2.9 투표 테이블
create table votes (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  target_type vote_target not null,
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz default now(),
  unique (user_id, target_type, target_id)
);

-- 2.10 쪽지 테이블
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete set null,
  receiver_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  ref_post_id uuid references posts(id),
  read_at timestamptz,
  created_at timestamptz default now()
);

create index idx_msg_receiver on messages(receiver_id, created_at desc);

-- 2.11 신고 테이블
create table reports (
  id bigserial primary key,
  reporter_id uuid references profiles(id),
  target_type vote_target not null,
  target_id uuid not null,
  reason text not null,
  status report_status default 'open',
  handled_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 2.12 알림 테이블
create table notifications (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  type notif_type not null,
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index idx_notif_user on notifications(user_id, created_at desc) where read_at is null;

-- 2.13 포인트 트랜잭션 테이블
create table point_transactions (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  kind text not null,
  ref_id uuid,
  created_at timestamptz default now()
);

create index idx_pt_user on point_transactions(user_id, created_at desc);

-- 2.14 등급 마스터 테이블
create table levels (
  level int primary key,
  name text not null,
  min_activity int not null,
  min_attendance int not null default 0,
  permissions jsonb not null default '{}'
);

-- 2.15 출석 테이블
create table attendance (
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null default current_date,
  primary key (user_id, day)
);

-- 2.16 판매자 신청 테이블
create table seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  store_name text not null,
  region_id int references regions(id),
  contact text,
  status report_status default 'open',
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ====================================================================
-- 3. RLS (Row Level Security) 설정 및 보안 정책
-- ====================================================================

-- 권한 조회용 헬퍼 함수 선언 (security definer)
create or replace function auth_role()
returns user_role language sql stable security definer as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'member'::user_role);
$$;

create or replace function is_staff()
returns boolean language sql stable security definer as $$
  select coalesce((select role in ('moderator', 'admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function my_level()
returns int language sql stable security definer as $$
  select coalesce((select level from public.profiles where id = auth.uid()), 0);
$$;

-- 3.1 profiles RLS
alter table profiles enable row level security;
create policy "profiles self read" on profiles for select using (id = auth.uid() or is_staff());
create policy "profiles self update" on profiles for update using (id = auth.uid());

-- 3.2 posts RLS
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

-- 3.3 comments RLS
alter table comments enable row level security;
create policy "comments owner read" on comments for select using (
  author_id = auth.uid()
  or is_staff()
  or (is_secret and auth.uid() = (select author_id from posts p where p.id = post_id))
);
create policy "comments insert" on comments for insert with check (author_id = auth.uid());
create policy "comments modify" on comments for update using (author_id = auth.uid() or is_staff());

-- 3.4 votes RLS
alter table votes enable row level security;
create policy "votes rw" on votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3.5 messages RLS
alter table messages enable row level security;
create policy "msg read" on messages for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "msg insert" on messages for insert with check (sender_id = auth.uid());

-- 3.6 reports RLS
alter table reports enable row level security;
create policy "report insert" on reports for insert with check (reporter_id = auth.uid());
create policy "report staff read" on reports for select using (is_staff());

-- 3.7 notifications RLS
alter table notifications enable row level security;
create policy "notif read" on notifications for select using (user_id = auth.uid());

-- 3.8 point_transactions RLS
alter table point_transactions enable row level security;
create policy "pt read" on point_transactions for select using (user_id = auth.uid());

-- 3.9 attendance RLS
alter table attendance enable row level security;
create policy "att read" on attendance for select using (user_id = auth.uid());

-- 3.10 regions, carriers, devices, boards, levels RLS (공개용 테이블)
alter table regions enable row level security;
create policy "regions public read" on regions for select using (true);

alter table carriers enable row level security;
create policy "carriers public read" on carriers for select using (true);

alter table devices enable row level security;
create policy "devices public read" on devices for select using (true);

alter table boards enable row level security;
create policy "boards public read" on boards for select using (true);

alter table levels enable row level security;
create policy "levels public read" on levels for select using (true);

-- ====================================================================
-- 4. 공개 안전 뷰 (public_* Views)
-- ====================================================================

-- 4.1 public_profiles: 민감 정보 마스킹 뷰
create view public_profiles as
  select id, username, display_name, avatar_url, role, level, adopted_count, trust_score, created_at
  from profiles
  where status = 'active';
grant select on public_profiles to anon, authenticated;

-- 4.2 public_posts: 익명글 작성자 ID NULL화 및 익명태그 생성 뷰
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

-- 4.3 public_comments: 익명댓글 작성자 ID NULL화, 비밀댓글 필터링 뷰
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

-- ====================================================================
-- 5. 트리거 및 RPC 함수 구현
-- ====================================================================

-- 5.1 auth.users 신규 가입 트리거 (프로필 자동 생성)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_username text;
  new_display  text;
begin
  new_username := 'user_' || substr(md5(new.id::text), 1, 8);
  new_display  := '새싹마케터_' || substr(md5(new.id::text), 1, 4);

  insert into public.profiles (id, username, display_name, role, status, level)
  values (
    new.id,
    new_username,
    new_display,
    'member'::user_role,
    'active'::user_status,
    1
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5.2 포인트 적립 내부 함수
create or replace function public.award_points(
  target_user_id uuid,
  point_amount int,
  points_kind text,
  points_ref_id uuid
)
returns void language plpgsql security definer as $$
begin
  insert into public.point_transactions (user_id, amount, kind, ref_id)
  values (target_user_id, point_amount, points_kind, points_ref_id);

  update public.profiles
  set activity_points = activity_points + point_amount
  where id = target_user_id;
end;
$$;

-- 5.3 레벨 및 권한 재계산 트리거 함수
create or replace function public.recalc_level_for_user()
returns trigger language plpgsql security definer as $$
declare
  target_level int;
  user_points int;
  user_attendance int;
  user_penalty int;
begin
  user_points := new.activity_points;
  user_attendance := new.attendance_days;
  user_penalty := new.penalty_points;

  -- 패널티 누적으로 인한 마이너스 레벨 등급 강등 처리
  if user_penalty >= 50 then
    new.level := -1;
    return new;
  end if;

  -- 등급 조건 스캔 ( levels 테이블 대조 )
  select coalesce((
    select l.level from public.levels l
    where user_points >= l.min_activity
      and user_attendance >= l.min_attendance
    order by l.level desc
    limit 1
  ), 1) into target_level;

  new.level := target_level;
  return new;
end;
$$;

create trigger on_profile_stats_changed
  before update of activity_points, attendance_days, penalty_points on public.profiles
  for each row execute procedure public.recalc_level_for_user();

-- 5.4 추천/다른의견 투표 RPC
create or replace function public.cast_vote(
  vote_target_type text,
  vote_target_id uuid,
  vote_value int
)
returns json language plpgsql security definer as $$
declare
  caller_id uuid;
  existing_val int;
  vote_diff int;
  author_uuid uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception '인증이 필요합니다.';
  end if;

  -- 자기 투표 방지 검사
  if vote_target_type = 'post' then
    select author_id into author_uuid from public.posts where id = vote_target_id;
  else
    select author_id into author_uuid from public.comments where id = vote_target_id;
  end if;

  if author_uuid = caller_id then
    raise exception '본인의 글이나 댓글에는 투표할 수 없습니다.';
  end if;

  -- 기존 투표 유무 조회
  select value into existing_val from public.votes
  where user_id = caller_id and target_type = vote_target_type::vote_target and target_id = vote_target_id;

  if existing_val is not null then
    if existing_val = vote_value then
      -- 투표 취소 처리
      delete from public.votes
      where user_id = caller_id and target_type = vote_target_type::vote_target and target_id = vote_target_id;
      vote_diff := -existing_val;
    else
      -- 반대 투표로 변경 처리
      update public.votes set value = vote_value
      where user_id = caller_id and target_type = vote_target_type::vote_target and target_id = vote_target_id;
      vote_diff := vote_value * 2;
    end if;
  else
    -- 최초 투표
    insert into public.votes (user_id, target_type, target_id, value)
    values (caller_id, vote_target_type::vote_target, vote_target_id, vote_value);
    vote_diff := vote_value;
  end if;

  -- 집계 반영
  if vote_target_type = 'post' then
    if vote_value = 1 then
      update public.posts set upvotes = upvotes + vote_diff where id = vote_target_id;
      if vote_diff > 0 then
        perform public.award_points(author_uuid, 3, 'upvote_received', vote_target_id);
      end if;
    else
      update public.posts set downvotes = downvotes + abs(vote_diff) where id = vote_target_id;
      if vote_diff < 0 then
        -- 다른의견 누적 시 저자 페널티 부여
        update public.profiles set penalty_points = penalty_points + 2 where id = author_uuid;
      end if;
    end if;
  else
    if vote_value = 1 then
      update public.comments set upvotes = upvotes + vote_diff where id = vote_target_id;
    end if;
  end if;

  return json_build_object('success', true, 'action_value', vote_diff);
end;
$$;

-- 5.5 일일 출석체크 RPC
create or replace function public.daily_attendance()
returns json language plpgsql security definer as $$
declare
  caller_id uuid;
  today_date date;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception '인증이 필요합니다.';
  end if;

  today_date := current_date;

  -- 중복 출석체크 방지
  if exists (select 1 from public.attendance where user_id = caller_id and day = today_date) then
    raise exception '이미 오늘 출석 체크를 하셨습니다.';
  end if;

  insert into public.attendance (user_id, day) values (caller_id, today_date);

  -- 프로필 누적일수 가산 및 출석 포인트 수여
  update public.profiles set attendance_days = attendance_days + 1 where id = caller_id;
  perform public.award_points(caller_id, 5, 'attendance', null);

  return json_build_object('success', true, 'attendance_days', (select attendance_days from public.profiles where id = caller_id));
end;
$$;

-- 5.6 질문 답변 채택 RPC
create or replace function public.adopt_answer(target_comment_id uuid)
returns json language plpgsql security definer as $$
declare
  caller_id uuid;
  post_author_id uuid;
  comment_author_id uuid;
  associated_post_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception '인증이 필요합니다.';
  end if;

  -- 해당 댓글 및 게시글 정보 조회
  select post_id, author_id into associated_post_id, comment_author_id from public.comments where id = target_comment_id;
  select author_id into post_author_id from public.posts where id = associated_post_id;

  -- 글쓴이 본인 검사
  if post_author_id != caller_id then
    raise exception '본인의 질문글 답변만 채택할 수 있습니다.';
  end if;

  if comment_author_id = caller_id then
    raise exception '자신의 답변은 채택할 수 없습니다.';
  end if;

  -- 답변 채택 횟수 증가 및 채택 리워드 포인트 부여 (+30)
  update public.profiles set adopted_count = adopted_count + 1 where id = comment_author_id;
  perform public.award_points(comment_author_id, 30, 'adopted', target_comment_id);

  -- 실시간 알림 등록
  insert into public.notifications (user_id, type, payload)
  values (
    comment_author_id,
    'adopted',
    json_build_object('post_id', associated_post_id, 'comment_id', target_comment_id)
  );

  return json_build_object('success', true);
end;
$$;

-- 5.7 핫게시글 주기적 스코어링 정산 (pg_cron 스케줄 타겟용)
create or replace function public.promote_hot()
returns void language plpgsql security definer as $$
begin
  -- 핫 스코어 계산 공식: (upvotes * 5 + comment_count * 2) / (시간 감쇠)
  update public.posts
  set hot_score = (upvotes * 5 + comment_count * 2) / (extract(epoch from (now() - created_at))/3600 + 2)^1.5
  where status = 'published';

  -- 핫 스코어가 15를 초과하는 활성글을 핫게시글로 격상
  update public.posts
  set is_hot = true
  where status = 'published' and hot_score >= 15 and is_hot = false;
end;
$$;

-- ====================================================================
-- 6. 마스터 시드 데이터 주입 (boards & levels)
-- ====================================================================

-- 6.1 등급(levels) 6단계 시드 주입
insert into public.levels (level, name, min_activity, min_attendance, permissions)
values 
  (1, '새싹', 0, 0, '{"dm": false, "write": true, "comment": true}'),
  (2, '일반', 100, 3, '{"dm": true, "write": true, "comment": true}'),
  (3, '우수', 500, 10, '{"dm": true, "write": true, "comment": true}'),
  (4, '전문가', 2000, 30, '{"dm": true, "write": true, "comment": true}'),
  (5, '스태프', 10000, 100, '{"dm": true, "write": true, "comment": true, "moderate": true}'),
  (6, '관리자', 999999, 999, '{"dm": true, "write": true, "comment": true, "moderate": true, "admin": true}')
on conflict (level) do update
set name = excluded.name,
    min_activity = excluded.min_activity,
    min_attendance = excluded.min_attendance,
    permissions = excluded.permissions;

-- 6.2 핵심 게시판(boards) 시드 주입
insert into public.boards (slug, name, type, allow_anonymous, region_scoped, read_min_level, write_min_level, writer_role, description, sort)
values
  ('anonymous', '익명게시판', 'anonymous', true, false, 0, 1, null, '통신 업계 속사정 및 솔직한 이야기를 털어놓는 공간', 10),
  ('free', '자유게시판', 'free', false, false, 0, 1, null, '마케터 및 일반 회원들의 활발한 수다 공간', 20),
  ('info', '정보게시판', 'info', false, false, 0, 1, null, '통신 꿀팁 및 유용한 정보 가이드 공유 게시판 (Answer-first 권장)', 30),
  ('notice', '공지사항', 'notice', false, false, 0, 5, null, '플랫폼 공식 공지사항 및 운영 정책 공표 스페이스', 40)
on conflict (slug) do update
set name = excluded.name,
    type = excluded.type,
    allow_anonymous = excluded.allow_anonymous,
    read_min_level = excluded.read_min_level,
    write_min_level = excluded.write_min_level,
    description = excluded.description,
    sort = excluded.sort;
