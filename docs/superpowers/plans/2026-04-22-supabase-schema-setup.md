# Supabase 스키마 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase CLI로 7개 테이블 스키마를 마이그레이션 파일로 작성하고 Supabase 프로젝트에 적용한다.

**Architecture:** `supabase/migrations/` 디렉토리에 단일 SQL 마이그레이션 파일을 작성하고 `supabase db push`로 원격 Supabase 프로젝트에 적용. RLS 비활성화, FK 제약 없음, 복합 UNIQUE 제약으로 구성.

**Tech Stack:** Supabase CLI (npm), PostgreSQL DDL

---

## 사전 준비 (코드 작업 전 수동)

다음 두 가지는 브라우저에서 직접 수행해야 한다:

1. **Supabase 계정 생성:** `https://supabase.com` → Sign up
2. **새 프로젝트 생성:**
   - 대시보드 → New project
   - Project name: `money-village` (또는 원하는 이름)
   - Database password: 안전한 비밀번호 설정 후 기록해둘 것
   - Region: Northeast Asia (Tokyo) 권장
   - 생성 완료 후 `Settings > General > Reference ID` 값을 복사해둘 것 (예: `abcdefghijklmnop`)

---

## File Structure

```
money-village/
├── package.json                          # 신규 생성 (npm init)
├── .gitignore                            # 수정: .env 추가
├── .env                                  # 신규 생성 (Supabase 키, git 제외)
└── supabase/
    ├── config.toml                       # 신규 생성 (supabase init)
    └── migrations/
        └── 20260422000000_initial_schema.sql  # 신규 생성 (전체 DDL)
```

---

## Task 1: npm 초기화 및 Supabase CLI 설치

**Files:**
- Create: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: npm 초기화**

```bash
cd "c:/Users/USER/OneDrive/Desktop/Project/money-village"
npm init -y
```

Expected output: `package.json` 파일 생성됨

- [ ] **Step 2: Supabase CLI 설치**

```bash
npm install supabase --save-dev
```

Expected output: `node_modules/` 생성, `package.json`에 `"supabase"` devDependency 추가됨

- [ ] **Step 3: .gitignore에 node_modules 및 .env 추가**

`.gitignore` 파일에 아래 항목이 없으면 추가:

```
node_modules/
.env
.env.local
```

- [ ] **Step 4: 설치 확인**

```bash
npx supabase --version
```

Expected output: `1.x.x` 형태의 버전 문자열

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: Supabase CLI 설치"
```

---

## Task 2: Supabase 프로젝트 초기화 및 연결

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Supabase 로컬 초기화**

```bash
npx supabase init
```

Expected output: `supabase/` 디렉토리와 `config.toml` 생성됨

- [ ] **Step 2: Supabase 프로젝트 연결**

사전 준비에서 복사해둔 Reference ID 사용:

```bash
npx supabase link --project-ref <your-reference-id>
```

비밀번호 입력 프롬프트가 뜨면 프로젝트 생성 시 설정한 DB 비밀번호 입력.

Expected output: `Finished supabase link.`

- [ ] **Step 3: 연결 확인**

```bash
npx supabase status
```

Expected output: 프로젝트 정보 (API URL, anon key 등) 출력

- [ ] **Step 4: .env 파일 생성**

Supabase 대시보드 → `Settings > API`에서 값 확인 후 프로젝트 루트에 `.env` 생성:

```
SUPABASE_URL=https://<your-reference-id>.supabase.co
SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> service_role 키는 서버에서만 사용. 클라이언트 코드에 절대 노출 금지.

- [ ] **Step 5: 커밋**

```bash
git add supabase/config.toml
git commit -m "chore: Supabase 프로젝트 초기화 및 연결"
```

`.env`는 `.gitignore`에 등록돼 있으므로 커밋되지 않음.

---

## Task 3: 마이그레이션 파일 작성

**Files:**
- Create: `supabase/migrations/20260422000000_initial_schema.sql`

- [ ] **Step 1: migrations 디렉토리 생성 및 파일 작성**

`supabase/migrations/20260422000000_initial_schema.sql` 파일을 아래 내용으로 생성:

```sql
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
  UNIQUE (date, nickname)
);
ALTER TABLE game_individual DISABLE ROW LEVEL SECURITY;

-- =====================
-- game_team
-- 팀 게임 결과 테이블
-- =====================
CREATE TABLE game_team (
  team_id          varchar    PRIMARY KEY,
  date             date       NOT NULL,
  team_name        varchar(5),
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
```

- [ ] **Step 2: SQL 문법 검토**

파일을 열어 아래 항목을 육안으로 확인:
- 7개 테이블 모두 포함됐는지 (users, game_individual, game_team, stock_price, stock_balance, cash_balance, traits)
- 각 테이블 끝에 `DISABLE ROW LEVEL SECURITY` 있는지
- `game_individual`: `UNIQUE (date, nickname)` 있는지
- `stock_balance`, `cash_balance`, `traits`: `UNIQUE (game_id, nickname)` 있는지

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260422000000_initial_schema.sql
git commit -m "feat: Supabase 초기 스키마 마이그레이션 파일 추가"
```

---

## Task 4: Supabase에 스키마 적용 및 검증

**Files:** 없음 (원격 DB에만 적용)

- [ ] **Step 1: 마이그레이션 적용**

```bash
npx supabase db push
```

Expected output:
```
Applying migration 20260422000000_initial_schema.sql...
Done.
```

오류 발생 시: 출력된 에러 메시지에서 문제가 되는 SQL 구문을 확인하고 마이그레이션 파일 수정 후 재실행.

- [ ] **Step 2: 테이블 존재 확인 (대시보드)**

Supabase 대시보드 → `Table Editor` 또는 `Database > Tables` 에서 아래 7개 테이블이 모두 보이는지 확인:
- `users`
- `game_individual`
- `game_team`
- `stock_price`
- `stock_balance`
- `cash_balance`
- `traits`

- [ ] **Step 3: UNIQUE 제약 확인 (대시보드)**

대시보드 → `Database > Tables` → 각 테이블 클릭 → `Indexes` 탭에서:

| 테이블 | 확인할 UNIQUE 인덱스 |
|---|---|
| users | nickname |
| game_individual | date, nickname |
| stock_balance | game_id, nickname |
| cash_balance | game_id, nickname |
| traits | game_id, nickname |

- [ ] **Step 4: SQL Editor로 삽입/조회 테스트**

대시보드 → `SQL Editor`에서 아래 쿼리 실행:

```sql
-- users 삽입 테스트
INSERT INTO users (nickname, real_name, default_efti)
VALUES ('테스트', '홍길', 'FAEN');

-- 조회 확인
SELECT * FROM users WHERE nickname = '테스트';

-- UNIQUE 제약 테스트 (동일 nickname 재삽입 → 에러여야 정상)
INSERT INTO users (nickname, real_name)
VALUES ('테스트', '김철');
-- Expected: ERROR: duplicate key value violates unique constraint "users_nickname_key"

-- 테스트 데이터 정리
DELETE FROM users WHERE nickname = '테스트';
```

- [ ] **Step 5: 최종 커밋 (필요 시)**

마이그레이션 적용 과정에서 파일 수정이 있었다면:

```bash
git add supabase/migrations/20260422000000_initial_schema.sql
git commit -m "fix: 스키마 마이그레이션 오류 수정"
```

수정 없이 정상 적용됐다면 커밋 불필요.
