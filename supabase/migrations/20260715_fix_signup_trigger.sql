-- ====================================================================
-- 20260715_fix_signup_trigger.sql
-- 목적: 회원가입이 전면 실패("Database error saving new user")하는 문제 해결.
--   원인: auth.users INSERT 시 실행되는 handle_new_user 트리거의 profiles INSERT 가
--          실패하여 가입 트랜잭션이 롤백됨. (이 때문에 auth.users 가 비어 있었음)
--   조치:
--     1) 트리거 함수를 회원가입 폼에서 넘어온 메타데이터(아이디/닉네임)를 사용하도록 개선
--     2) security definer 트리거의 profiles INSERT 가 RLS/권한에 막히지 않도록 보정
--     3) 어떤 이유로 프로필 생성이 실패하더라도 auth user 생성 자체는 막지 않도록 방어
-- ====================================================================

-- 1. profiles INSERT 권한/RLS 보정 -------------------------------------
-- 소유자(postgres) 가 RLS 를 우회할 수 있도록 FORCE RLS 해제 (혹시 켜져 있었다면)
alter table public.profiles no force row level security;

-- GoTrue(회원가입)·서비스 롤이 프로필을 생성할 수 있도록 INSERT 권한 부여
grant insert on public.profiles to supabase_auth_admin, service_role;

-- 회원가입 트리거 컨텍스트(로그인 세션 없음: auth.uid() IS NULL)에서의 INSERT 를 허용하는
-- 안전한 정책. 일반 로그인 사용자는 오직 본인 id 로만 삽입 가능.
drop policy if exists "profiles insert on signup" on public.profiles;
create policy "profiles insert on signup" on public.profiles
  for insert
  with check (auth.uid() is null or auth.uid() = id);

-- 2. 트리거 함수 재정의: 메타데이터 기반 + 방어적 ---------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m_username text := nullif(trim(new.raw_user_meta_data->>'preferred_username'), '');
  m_display  text := nullif(trim(new.raw_user_meta_data->>'preferred_display_name'), '');
  -- 메타데이터가 없을 때의 중립 폴백값 (고정 접두사 없이 이메일 앞부분 = 사용자가 정한 아이디)
  fallback text := split_part(new.email, '@', 1);
begin
  insert into public.profiles (id, username, display_name, role, status, level)
  values (
    new.id,
    coalesce(m_username, fallback),
    coalesce(m_display,  fallback),
    'member'::user_role,
    'active'::user_status,
    1
  )
  on conflict (id) do nothing;

  return new;
exception when others then
  -- 프로필 생성 실패가 회원가입 전체를 막지 않도록 방어 (auth user 는 정상 생성)
  raise warning 'handle_new_user 프로필 생성 실패: %', sqlerrm;
  return new;
end;
$$;

-- 트리거 재연결 (이미 존재하면 유지되지만 명시적으로 보장)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
