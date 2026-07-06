-- game_individual/game_team의 date 컬럼은 실제 라이브 스키마에는 존재하지 않는다
-- (20260422000000_initial_schema.sql에 NOT NULL로 기록돼 있었지만, 실제로는 이력에 없는
-- 시점에 드롭된 것으로 추정 — information_schema 조회로 확인). 코드에서도 game_individual/
-- game_team에 date를 쓰는 곳이 없어 안전하게 제거한다.
ALTER TABLE game_individual DROP COLUMN IF EXISTS date;
ALTER TABLE game_team DROP COLUMN IF EXISTS date;
