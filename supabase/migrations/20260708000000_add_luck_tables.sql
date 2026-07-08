-- supabase/migrations/20260708000000_add_luck_tables.sql
-- 행운(가위바위보/룰렛/주사위) 게임 상태 및 기록 테이블

-- ---- luck_state ----
CREATE TABLE IF NOT EXISTS luck_state (
  game_id             text                     PRIMARY KEY,
  rps_multiplier      numeric                  NOT NULL DEFAULT 4,
  roulette_multiplier numeric                  NOT NULL DEFAULT 5,
  dice_multiplier     numeric                  NOT NULL DEFAULT 7,
  is_closed           boolean                  NOT NULL DEFAULT false,
  updated_at          timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE luck_state DISABLE ROW LEVEL SECURITY;

-- ---- luck_history ----
-- 참가 횟수 제한이 없어 플레이어당 여러 행이 쌓일 수 있으므로
-- (game_id, user_id) 같은 충돌 키 없이 매 플레이를 INSERT하는 surrogate PK를 사용한다.
CREATE TABLE IF NOT EXISTS luck_history (
  id             bigint                   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id        text                     NOT NULL,
  user_id        uuid                     NOT NULL,
  luck_type      text                     NOT NULL,
  amount         integer                  NOT NULL DEFAULT 0,
  matured_amount integer                  NOT NULL DEFAULT 0,
  is_win         boolean                  NOT NULL DEFAULT false,
  created_at     timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE luck_history DISABLE ROW LEVEL SECURITY;

-- ---- game_individual: 행운 보상 누적 컬럼 ----
ALTER TABLE game_individual
    ADD COLUMN IF NOT EXISTS luck_reward integer DEFAULT 0;
