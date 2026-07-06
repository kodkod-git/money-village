-- game_info 테이블에 대시보드에서 직접 추가되어 마이그레이션 이력에 없던 컬럼을 편입한다.
-- (game_variant: basic/advanced/rich_vessel 구분, is_test: 테스트 더미 게임 여부 — 현재 코드에서는 미사용)
ALTER TABLE game_info
    ADD COLUMN IF NOT EXISTS game_variant text NOT NULL DEFAULT 'basic',
    ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
