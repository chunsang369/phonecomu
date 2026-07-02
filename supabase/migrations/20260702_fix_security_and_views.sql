-- ====================================================================
-- 20260702_fix_security_and_views.sql
-- 목적:
--  (1) 원격 DB에만 적용되고 마이그레이션에 없던 뷰 변경(drift)을 파일로 고정
--  (2) comments 보안 구멍 봉합: base 재잠금 + public_comments 뷰에 작성자 조인
--  (3) posts/comments 공개 뷰에 작성자 표시 컬럼 내장 → 클라이언트/앱 조인 전면 제거
--  (4) search_posts RPC를 마이그레이션으로 관리
-- 원칙: 공개 읽기는 오직 public_* 뷰. base 테이블 SELECT는 소유자/스태프/관련자만.
-- ====================================================================

-- --------------------------------------------------------------
-- 1. comments base 재잠금 (완화된 공개 read 정책이 있다면 제거)
-- --------------------------------------------------------------
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where tablename = 'comments' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on comments', pol.policyname);
  end loop;
end $$;

create policy "comments owner read" on comments for select using (
  author_id = auth.uid()
  or is_staff()
  or (is_secret and auth.uid() = (select author_id from posts p where p.id = post_id))
);

-- --------------------------------------------------------------
-- 2. posts base 재잠금 (완화된 공개 read 정책이 있다면 제거)
-- --------------------------------------------------------------
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where tablename = 'posts' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on posts', pol.policyname);
  end loop;
end $$;

create policy "posts owner read" on posts for select
  using (author_id = auth.uid() or is_staff());

-- --------------------------------------------------------------
-- 3. profiles base 재잠금 (완화된 공개 read 정책이 있다면 제거)
-- --------------------------------------------------------------
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on profiles', pol.policyname);
  end loop;
end $$;

create policy "profiles self read" on profiles for select
  using (id = auth.uid() or is_staff());

-- --------------------------------------------------------------
-- 4. public_posts 재생성: profiles 내부 조인으로 작성자 표시 컬럼 내장
--    (PGRST200 조인 문제의 근본 해결 — 클라이언트 조인 불필요)
-- --------------------------------------------------------------
drop view if exists public_posts;
create view public_posts as
select
  p.id, p.board_id, p.title, p.content,
  p.region_id, p.device_id, p.reference_post_id, p.store_id,
  p.status, p.is_pinned, p.is_hot, p.view_count,
  p.upvotes, p.downvotes, p.comment_count, p.hot_score,
  p.created_at, p.updated_at, p.is_anonymous,
  case when p.is_anonymous then null else p.author_id end        as author_id,
  case when p.is_anonymous then null else pr.username end         as author_username,
  case when p.is_anonymous then null else pr.display_name end     as author_display_name,
  case when p.is_anonymous then null else pr.avatar_url end       as author_avatar_url,
  case when p.is_anonymous then null else pr.level end            as author_level,
  case when p.is_anonymous
       then '익명-' || substr(md5(p.author_id::text || p.id::text), 1, 4)
       else null end                                              as anon_tag
from posts p
left join profiles pr on pr.id = p.author_id
where p.status = 'published'
  and (select read_min_level from boards b where b.id = p.board_id) <= 0;
grant select on public_posts to anon, authenticated;

-- --------------------------------------------------------------
-- 5. public_comments 재생성: 작성자 조인 + 익명/비밀 처리
-- --------------------------------------------------------------
drop view if exists public_comments;
create view public_comments as
select
  c.id, c.post_id, c.parent_id, c.content, c.upvotes, c.status,
  c.created_at, c.is_anonymous,
  case when c.is_anonymous then null else c.author_id end        as author_id,
  case when c.is_anonymous then null else pr.username end         as author_username,
  case when c.is_anonymous then null else pr.display_name end     as author_display_name,
  case when c.is_anonymous then null else pr.avatar_url end       as author_avatar_url,
  case when c.is_anonymous then null else pr.level end            as author_level,
  case when c.is_anonymous
       then '익명-' || substr(md5(c.author_id::text || c.post_id::text), 1, 4)
       else null end                                              as anon_tag
from comments c
left join profiles pr on pr.id = c.author_id
where c.status = 'published' and c.is_secret = false;
grant select on public_comments to anon, authenticated;

-- --------------------------------------------------------------
-- 6. search_posts RPC (FTS) — 마이그레이션 관리 편입
--    security definer가 아닌 뷰 기반 조회 (공개 데이터만 검색)
-- --------------------------------------------------------------
create or replace function search_posts(query_text text)
returns setof public_posts
language sql stable
as $$
  select *
  from public_posts
  where to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))
        @@ plainto_tsquery('simple', query_text)
  order by created_at desc
  limit 50;
$$;
grant execute on function search_posts(text) to anon, authenticated;

-- --------------------------------------------------------------
-- 7. 인기글 집계 RPC (가짜 '실시간 인기검색어' 대체용 실데이터)
--    최근 7일 참여도(추천*3 + 댓글*2 + 조회*0.05) 상위 글 제목
-- --------------------------------------------------------------
create or replace function trending_posts(days int default 7, max_rows int default 10)
returns table (id uuid, title text, board_id int, score numeric)
language sql stable
as $$
  select id, title, board_id,
         (upvotes * 3 + comment_count * 2 + view_count * 0.05)::numeric as score
  from public_posts
  where created_at > now() - make_interval(days => days)
  order by score desc, created_at desc
  limit max_rows;
$$;
grant execute on function trending_posts(int, int) to anon, authenticated;
