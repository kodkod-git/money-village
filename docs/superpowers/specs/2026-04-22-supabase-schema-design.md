# Supabase 스키마 설계

**날짜:** 2026-04-22  
**범위:** 현재 Google Sheets + GAS 백엔드의 Supabase 1:1 마이그레이션 (스키마만, 데이터 이전 없음)  
**방법:** Supabase CLI + 마이그레이션 파일 (`supabase/migrations/`)

## 배경

현재 Money Village는 Google Sheets를 DB로, GAS를 백엔드로 사용한다. 향후 방과후 홈페이지로 확장 예정이므로 Supabase로 백엔드를 이전한다. 이번 단계에서는 현재 GAS 운영을 유지하면서 Supabase DB 구조만 구축한다.

## 설계 결정

### FK 제약 없음
GAS는 테이블을 독립적으로 씀 (쓰기 순서 미보장). Supabase `service_role` 키로 접근하며 RLS 비활성화. 향후 GAS를 제거하고 직접 쓰기로 전환할 때 FK 제약 추가 예정.

### `key` 컬럼 제거
기존 GAS의 `key` 컬럼 (예: `game_id|nickname`)은 Sheets에 UNIQUE 제약이 없어 upsert용으로 만든 우회책이다. PostgreSQL에서는 복합 UNIQUE 제약으로 대체한다.

### RLS 비활성화
모든 테이블에 `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`. 서버사이드(GAS, 향후 Next.js API route)에서 `service_role` 키로만 접근.

## 테이블 정의

### users
Google Sheets `Users` 시트 대응. 시민권자 마스터.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| user_id | uuid | PK, default gen_random_uuid() |
| nickname | varchar(5) | NOT NULL, UNIQUE |
| real_name | varchar(5) | |
| join_date | date | |
| is_citizen | boolean | default true |
| default_efti | varchar(4) | default 'FAEN' |
| status | varchar(10) | default 'active' |

### game_individual
Google Sheets `Individual` 시트 대응. 개인 게임 결과.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigserial | PK |
| date | date | NOT NULL |
| nickname | varchar(5) | NOT NULL |
| real_name | varchar(5) | |
| total_asset | integer | default 0 |
| cash | integer | default 0 |
| stock | integer | default 0 |
| diligence_reward | integer | default 0 |
| game_id | varchar | NOT NULL |
| team_id | varchar | |

UNIQUE (date, nickname)

### game_team
Google Sheets `Team` 시트 대응. 팀 게임 결과.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| team_id | varchar | PK |
| date | date | NOT NULL |
| team_name | varchar(5) | |
| team_total_asset | integer | default 0 |
| members | text | (콤마 구분 닉네임 목록) |

### stock_price
Google Sheets `Stock_Price` 시트 대응. 게임 세션별 주가.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| game_id | varchar | PK |
| sasung | integer | default 1500 |
| lgi | integer | default 600 |
| skei | integer | default 1600 |
| cacao | integer | default 4000 |
| hyunde | integer | default 6000 |
| naber | integer | default 7000 |

### stock_balance
Google Sheets `Stock` 시트 대응. 유저별 주식 보유 수량.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigserial | PK |
| nickname | varchar(5) | NOT NULL |
| game_id | varchar | NOT NULL |
| sasung | integer | default 0 |
| lgi | integer | default 0 |
| skei | integer | default 0 |
| cacao | integer | default 0 |
| hyunde | integer | default 0 |
| naber | integer | default 0 |

UNIQUE (game_id, nickname)

### cash_balance
Google Sheets `Balance` 시트 대응. 유저별 현금 권종별 수량.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigserial | PK |
| nickname | varchar(5) | NOT NULL |
| game_id | varchar | NOT NULL |
| bill_100 | integer | default 0 |
| bill_500 | integer | default 0 |
| bill_1000 | integer | default 0 |
| bill_5000 | integer | default 0 |
| bill_10000 | integer | default 0 |
| bill_50000 | integer | default 0 |

UNIQUE (game_id, nickname)

### traits
Google Sheets `Traits` 시트 대응. 유저별 성격 특성 6종.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigserial | PK |
| nickname | varchar(5) | NOT NULL |
| game_id | varchar | NOT NULL |
| diligent | boolean | default false |
| saving | boolean | default false |
| invest | boolean | default false |
| career | boolean | default false |
| luck | boolean | default false |
| adventure | boolean | default false |

UNIQUE (game_id, nickname)

## 논리적 관계 (FK 제약 없음)

```
users.nickname
  → game_individual.nickname (1:N)
  → stock_balance.nickname (1:N)
  → cash_balance.nickname (1:N)
  → traits.nickname (1:N)

stock_price.game_id
  → game_individual.game_id (1:N)
  → stock_balance.game_id (1:N)
  → cash_balance.game_id (1:N)
  → traits.game_id (1:N)

game_team.team_id
  → game_individual.team_id (1:N)
```

## 구현 방법

Supabase CLI를 사용해 단일 마이그레이션 파일로 생성:

```
supabase/
  migrations/
    20260422000000_initial_schema.sql
```

프로젝트 루트에서:
```bash
supabase init
supabase link --project-ref <project-ref>
# 마이그레이션 파일 작성 후
supabase db push
```

## 범위 밖

- 데이터 마이그레이션 (기존 Sheets 데이터 이전)
- GAS → Supabase 직접 연결
- RLS 정책 설정
- FK 제약 추가
- 향후 확장 테이블 (활동사진, 활동일지 등)
