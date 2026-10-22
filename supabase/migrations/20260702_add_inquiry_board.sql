-- 20260702_add_inquiry_board.sql
-- 목적: 1:1 비밀 문의게시판(inquiry) 생성
-- read_min_level을 10으로 설정하여 public_posts 뷰에서 일반 노출 차단 (보안 격리)
-- write_min_level을 1로 설정하여 로그인된 사용자만 문의 작성 가능

INSERT INTO boards (slug, name, type, description, read_min_level, write_min_level, allow_anonymous, sort)
VALUES (
  'inquiry',
  '문의게시판',
  'inquiry',
  '1:1 비밀 문의게시판입니다. 본인이 작성한 글만 보입니다.',
  10,
  1,
  false,
  99
)
ON CONFLICT (slug) DO UPDATE
SET read_min_level = 10,
    write_min_level = 1,
    type = 'inquiry';
