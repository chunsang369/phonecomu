-- posts 테이블에 크롤링 출처(source) 및 원본 참조 ID(source_ref) 컬럼 추가
alter table public.posts add column if not exists source text;
alter table public.posts add column if not exists source_ref text;

-- (source, source_ref) 복합 UNIQUE 인덱스 생성 (중복 수집 및 race condition 방지)
create unique index if not exists uq_posts_source
  on public.posts(source, source_ref) where source_ref is not null;
