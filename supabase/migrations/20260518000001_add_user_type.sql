-- users 테이블에 user_type 컬럼 추가
-- 기본/심화 게임 등록자: 'child', 부자의 그릇 게임 등록자: 'adult'
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'child'
    CHECK (user_type IN ('child', 'adult'));
