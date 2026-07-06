-- =====================================================
-- 대시보드에서 직접 생성되어 마이그레이션 이력에 없던 7개 테이블을
-- 실제 라이브 스키마(information_schema 조회 결과)에 맞춰 이력으로 편입한다.
-- 이 파일 적용 시점에는 이미 프로덕션에 동일한 구조로 존재하므로
-- `supabase migration repair --status applied`로 이력만 맞춘다 (재실행하지 않음).
-- =====================================================

-- ---- estate_price ----
CREATE TABLE IF NOT EXISTS estate_price (
  game_id      text    PRIMARY KEY,
  gaongaemi    integer NOT NULL DEFAULT 100000,
  nurigoyangi  integer NOT NULL DEFAULT 100000,
  damiwonsungi integer NOT NULL DEFAULT 100000,
  marusuri     integer NOT NULL DEFAULT 100000,
  chorongbungi integer NOT NULL DEFAULT 100000,
  haniyuwoo    integer NOT NULL DEFAULT 100000
);
ALTER TABLE estate_price DISABLE ROW LEVEL SECURITY;

-- ---- estate_balance ----
CREATE TABLE IF NOT EXISTS estate_balance (
  game_id      text    NOT NULL,
  nickname     text    NOT NULL,
  gaongaemi    integer NOT NULL DEFAULT 0,
  nurigoyangi  integer NOT NULL DEFAULT 0,
  damiwonsungi integer NOT NULL DEFAULT 0,
  marusuri     integer NOT NULL DEFAULT 0,
  chorongbungi integer NOT NULL DEFAULT 0,
  haniyuwoo    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, nickname)
);
ALTER TABLE estate_balance DISABLE ROW LEVEL SECURITY;

-- ---- success_factors ----
CREATE TABLE IF NOT EXISTS success_factors (
  game_id               text    NOT NULL,
  nickname              text    NOT NULL,
  financial_management  boolean NOT NULL DEFAULT false,
  communication         boolean NOT NULL DEFAULT false,
  critical_thinking     boolean NOT NULL DEFAULT false,
  global_economy        boolean NOT NULL DEFAULT false,
  credit_trust          boolean NOT NULL DEFAULT false,
  entrepreneurship      boolean NOT NULL DEFAULT false,
  PRIMARY KEY (game_id, nickname)
);
ALTER TABLE success_factors DISABLE ROW LEVEL SECURITY;

-- ---- bank_state ----
CREATE TABLE IF NOT EXISTS bank_state (
  game_id          text                     PRIMARY KEY,
  current_round    integer                  NOT NULL DEFAULT 1,
  long_ratio       numeric                  NOT NULL DEFAULT 2.0,
  mid_ratio        numeric                  NOT NULL DEFAULT 1.5,
  short_ratio      numeric                  NOT NULL DEFAULT 1.2,
  team_long_ratio  numeric                  NOT NULL DEFAULT 2.5,
  team_mid_ratio   numeric                  NOT NULL DEFAULT 2.0,
  team_short_ratio numeric                  NOT NULL DEFAULT 1.5,
  updated_at       timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE bank_state DISABLE ROW LEVEL SECURITY;

-- ---- bank_history ----
CREATE TABLE IF NOT EXISTS bank_history (
  game_id        text    NOT NULL,
  nickname       text    NOT NULL,
  round_num      integer NOT NULL,
  deposit_type   text    NOT NULL,
  amount         integer NOT NULL DEFAULT 0,
  matured_amount integer NOT NULL DEFAULT 0,
  is_team        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (game_id, nickname, round_num, is_team)
);
ALTER TABLE bank_history DISABLE ROW LEVEL SECURITY;

-- ---- quiz_state ----
CREATE TABLE IF NOT EXISTS quiz_state (
  game_id      text                     PRIMARY KEY,
  indiv_reward integer                  NOT NULL DEFAULT 0,
  team_reward  integer                  NOT NULL DEFAULT 0,
  updated_at   timestamp with time zone NOT NULL DEFAULT now(),
  is_closed    boolean                  NOT NULL DEFAULT false
);
ALTER TABLE quiz_state DISABLE ROW LEVEL SECURITY;

-- ---- quiz_history ----
CREATE TABLE IF NOT EXISTS quiz_history (
  game_id         text                     NOT NULL,
  nickname        text                     NOT NULL,
  indiv_progress  integer                  NOT NULL DEFAULT 0,
  indiv_failed_at timestamp with time zone,
  team_answered   boolean                  NOT NULL DEFAULT false,
  team_failed_at  timestamp with time zone,
  PRIMARY KEY (game_id, nickname)
);
ALTER TABLE quiz_history DISABLE ROW LEVEL SECURITY;
