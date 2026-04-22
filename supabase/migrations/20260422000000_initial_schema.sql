-- =====================
-- users
-- 시민권자 마스터 테이블
-- =====================
CREATE TABLE users (
  user_id     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    varchar(5)  NOT NULL UNIQUE,
  real_name   varchar(5),
  join_date   date,
  is_citizen  boolean     DEFAULT true,
  default_efti varchar(4) DEFAULT 'FAEN',
  status      varchar(10) DEFAULT 'active'
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- =====================
-- game_individual
-- 개인 게임 결과 테이블
-- =====================
CREATE TABLE game_individual (
  id                bigserial   PRIMARY KEY,
  date              date        NOT NULL,
  nickname          varchar(5)  NOT NULL,
  real_name         varchar(5),
  total_asset       integer     DEFAULT 0,
  cash              integer     DEFAULT 0,
  stock             integer     DEFAULT 0,
  diligence_reward  integer     DEFAULT 0,
  game_id           varchar     NOT NULL,
  team_id           varchar,
  UNIQUE (game_id, nickname)
);
ALTER TABLE game_individual DISABLE ROW LEVEL SECURITY;

-- =====================
-- game_team
-- 팀 게임 결과 테이블
-- =====================
CREATE TABLE game_team (
  team_id          varchar    PRIMARY KEY,
  game_id          varchar    NOT NULL,
  date             date       NOT NULL,
  team_name        varchar(5) NOT NULL,
  team_total_asset integer    DEFAULT 0,
  members          text
);
ALTER TABLE game_team DISABLE ROW LEVEL SECURITY;

-- =====================
-- stock_price
-- 게임 세션별 주가 테이블
-- =====================
CREATE TABLE stock_price (
  game_id  varchar  PRIMARY KEY,
  sasung   integer  DEFAULT 1500,
  lgi      integer  DEFAULT 600,
  skei     integer  DEFAULT 1600,
  cacao    integer  DEFAULT 4000,
  hyunde   integer  DEFAULT 6000,
  naber    integer  DEFAULT 7000
);
ALTER TABLE stock_price DISABLE ROW LEVEL SECURITY;

-- =====================
-- stock_balance
-- 유저별 주식 보유 수량 테이블
-- =====================
CREATE TABLE stock_balance (
  id        bigserial   PRIMARY KEY,
  nickname  varchar(5)  NOT NULL,
  game_id   varchar     NOT NULL,
  sasung    integer     DEFAULT 0,
  lgi       integer     DEFAULT 0,
  skei      integer     DEFAULT 0,
  cacao     integer     DEFAULT 0,
  hyunde    integer     DEFAULT 0,
  naber     integer     DEFAULT 0,
  UNIQUE (game_id, nickname)
);
ALTER TABLE stock_balance DISABLE ROW LEVEL SECURITY;

-- =====================
-- cash_balance
-- 유저별 현금 권종별 수량 테이블
-- =====================
CREATE TABLE cash_balance (
  id          bigserial   PRIMARY KEY,
  nickname    varchar(5)  NOT NULL,
  game_id     varchar     NOT NULL,
  bill_100    integer     DEFAULT 0,
  bill_500    integer     DEFAULT 0,
  bill_1000   integer     DEFAULT 0,
  bill_5000   integer     DEFAULT 0,
  bill_10000  integer     DEFAULT 0,
  bill_50000  integer     DEFAULT 0,
  UNIQUE (game_id, nickname)
);
ALTER TABLE cash_balance DISABLE ROW LEVEL SECURITY;

-- =====================
-- traits
-- 유저별 성격 특성 테이블
-- =====================
CREATE TABLE traits (
  id         bigserial   PRIMARY KEY,
  nickname   varchar(5)  NOT NULL,
  game_id    varchar     NOT NULL,
  diligent   boolean     DEFAULT false,
  saving     boolean     DEFAULT false,
  invest     boolean     DEFAULT false,
  career     boolean     DEFAULT false,
  luck       boolean     DEFAULT false,
  adventure  boolean     DEFAULT false,
  UNIQUE (game_id, nickname)
);
ALTER TABLE traits DISABLE ROW LEVEL SECURITY;
