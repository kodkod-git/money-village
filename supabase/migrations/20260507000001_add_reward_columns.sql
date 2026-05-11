-- game_individual 테이블에 보상 컬럼 추가
ALTER TABLE game_individual
    ADD COLUMN IF NOT EXISTS deposit_reward integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quest_reward   integer DEFAULT 0;
