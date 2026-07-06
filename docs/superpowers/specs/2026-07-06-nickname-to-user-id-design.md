# DB 구조 전면 수정: nickname → user_id 전환 및 game_team 컬럼 정리

**날짜:** 2026-07-06
**범위:** Supabase 스키마 변경 + 관련 애플리케이션 코드 전체 수정 (`proposal/20260706_redesign.md` 기반)
**브랜치:** `refactor/db-schema-redesign`

## 배경

현재 `bank_history`, `cash_balance`, `estate_balance`, `game_individual`, `quiz_history`, `stock_balance`, `success_factors`, `traits` 8개 테이블은 `nickname`을 (복합) PK의 일부로 사용한다. 이 때문에 참가자 닉네임을 수정할 때마다 8개 테이블을 순회하며 `UPDATE ... WHERE nickname = oldNick`을 반복해야 하고(`js/counting.js`의 `applyPlayerEdits`), 실제로 이 방식 때문에 "닉네임 변경 시 자산이 초기화되는 버그"가 발생해 최근 커밋(`5c20cfe`, `0e9b957`, `3bbc11a`)에서 임시 땜질로 고쳤다. 근본 원인은 자연키(닉네임)를 PK로 쓴 것이므로, `users.user_id`(이미 uuid PK로 존재)를 FK 성격의 식별자로 승격시켜 문제를 근본적으로 제거한다.

또한 `game_team.team_total_asset`/`game_team.members`는 저장 시점의 스냅샷을 컬럼으로 들고 있는 중복 데이터로, `team_id`로 `game_individual`을 집계하면 대체 가능하다.

## 설계 결정

### 1. PK 전환 대상 및 신규 PK

`users.user_id`(uuid)를 FK 성격의 식별자로 사용해 아래 8개 테이블의 PK를 교체한다. `nickname` 컬럼은 이 8개 테이블에서 **완전히 제거**하고, 표시가 필요할 때는 `users` 테이블을 `user_id`로 조인한다. (`users.nickname`은 UNIQUE 제약을 유지 — 동시간대 닉네임 중복 방지 역할은 그대로 유지)

| 테이블 | 기존 PK | 신규 PK |
|---|---|---|
| game_individual | (game_id, nickname) | (game_id, user_id) |
| stock_balance | (game_id, nickname) | (game_id, user_id) |
| cash_balance | (game_id, nickname) | (game_id, user_id) |
| traits | (game_id, nickname) | (game_id, user_id) |
| estate_balance | (game_id, nickname) | (game_id, user_id) |
| success_factors | (game_id, nickname) | (game_id, user_id) |
| quiz_history | (game_id, nickname) | (game_id, user_id) |
| bank_history | (game_id, nickname, round_num, is_team) | (game_id, user_id, round_num, is_team) |

### 2. 실제 라이브 스키마와 마이그레이션 이력 간 불일치 해소

`bank_history`, `bank_state`, `quiz_history`, `quiz_state`, `estate_balance`, `estate_price`, `success_factors` 테이블은 `supabase/migrations/`에 CREATE문이 없어(대시보드에서 직접 생성된 것으로 추정) 로컬 마이그레이션 이력이 실제 스키마를 완전히 반영하지 못한다. 이번 마이그레이션 작성 전에 `supabase db pull`로 실제 스키마를 먼저 로컬에 동기화해 어긋남을 없앤다.

### 3. game_team 컬럼 제거 및 온더플라이 계산

`team_total_asset`, `members` 컬럼을 DROP한다. 이 값을 실제로 읽는 곳은 `sbLoadHallOfFame()` 하나뿐이며(화면 내 팀 요약은 이미 메모리 `players[]`로 별도 계산), 이 프로젝트는 FK/서버사이드 집계 없이 브라우저에서 직접 쿼리하는 구조이므로 Postgres 뷰/RPC 대신 기존 스타일대로 JS에서 계산한다:

- 이미 `sbLoadHallOfFame()`이 함께 로드하는 `game_individual`(user_id, team_id, total_asset)을 `team_id`로 그룹핑해 `team_total_asset = sum(total_asset)` 계산
- `users`(user_id → nickname)를 조인해 `members`(콤마 구분 닉네임 목록) 계산
- `sbSaveGameResult()`의 `game_team` upsert에서 `team_total_asset`/`members` 필드 제거 (더 이상 쓰지 않음)

### 4. userId 전파

플레이어 객체(`players[]`)는 화면 입력(닉네임 텍스트)으로만 구성되고, DB의 `user_id`를 알 수 있는 시점은 `sbInitGame`이 닉네임으로 `users`를 매칭하는 순간뿐이다. 따라서:

- player 객체에 `userId` 필드를 추가 (`nickname` 옆에 나란히)
- `sbInitGame`: `users` insert/upsert 결과를 `.select('user_id, nickname')`으로 받아 각 player에 `userId`를 채움. 이후 `cash_balance`/`stock_balance`/`traits`/`estate_balance`/`success_factors`/`game_individual`/`game_team` 초기화는 `user_id` 기준으로 작성
- 게임 중 저장 함수들(`sbSaveUserBalance`, `sbSaveTraits`, `sbSaveEstateBalance`, `sbSaveSuccessFactors`, `sbSaveDepositReward`, `sbSaveQuestReward`, `sbUpsertBankHistory`, `sbUpsertQuizHistory` 등)의 인자를 `nickname` → `userId`로 교체. 호출부(`counting.js`, `report.js`, `bank.js`, `quiz.js`)도 `p.nickname` 대신 `p.userId`를 넘기도록 수정
- 과거 게임 재편집(`sbLoadAssetsByGameId`, `sbGetPlayersByGameId`): `game_individual`에서 `nickname` 컬럼이 사라지므로 `user_id`로 `users`를 조인해 표시용 `nickname`/`real_name`을 붙이고, 재구성된 player 객체에도 `userId`를 채워야 재편집 후 저장이 정상 동작
- 닉네임 변경(`js/counting.js`의 `applyPlayerEdits`): 8개 테이블 순회 UPDATE 로직을 제거하고 `UPDATE users SET nickname WHERE user_id = ...` 한 줄로 대체. 나머지 8개 테이블은 `user_id`가 불변이므로 손댈 필요 없음
- `sbDeleteCitizen`: 현재 삭제 대상 테이블 목록(`cash_balance`, `game_individual`, `estate_balance`, `success_factors`, `stock_balance`, `traits`)에 `bank_history`/`quiz_history`가 빠져 있던 기존 누락을, `user_id` 기준으로 통일하면서 함께 바로잡음

### 5. 배포 전략: 단일 마이그레이션 + 동시 배포

이 앱은 실제 게임 행사 진행 중에는 스키마/코드 변경이 일어나지 않는 구조이므로, expand-contract 같은 단계적 전환 대신 단일 마이그레이션 파일 + 코드 변경을 행사가 없는 시점에 한 번에 배포한다.

## 마이그레이션 절차

1. `supabase db pull`로 실제 라이브 스키마 동기화 확인
2. 새 마이그레이션 파일 작성 (`supabase/migrations/20260706..._nickname_to_user_id.sql`):
   - 8개 테이블에 `user_id uuid` 컬럼 추가
   - `UPDATE <table> SET user_id = users.user_id FROM users WHERE <table>.nickname = users.nickname`으로 백필
   - 백필 후 `user_id IS NULL` 잔여 행 존재 여부 확인 (고아 데이터 방어)
   - 기존 PK 제약 DROP, `nickname` 컬럼 DROP, `user_id` 기준 신규 PK 추가
   - `game_team.team_total_asset`, `game_team.members` 컬럼 DROP
3. `js/supabase-client.js` 및 호출부(`counting.js`, `report.js`, `bank.js`, `quiz.js`, `setup.js`) 코드 변경
4. 로컬 Supabase 또는 스테이징에서 마이그레이션 + 코드 변경을 함께 검증 (신규 게임 생성 → 자산 입력 → 닉네임 변경 → 재편집 → 명예의 전당까지 전체 플로우)
5. 행사가 없는 시점에 `supabase db push`와 `git push`를 함께 배포

## 테스트 계획

이 브랜치에는 자동 테스트 러너가 없고(`package.json`의 `test` 스크립트 미설정), `supabase-client.js`의 함수들은 실제 Supabase 클라이언트와 브라우저 전역 상태에 직접 의존해 순수 유닛 테스트로 감싸기 어렵다. 자동 테스트를 새로 구축하지 않고 스테이징 Supabase + 브라우저 수동 검증으로 대체한다:

- 닉네임 변경 후 자산/특성/은행/퀴즈 기록이 유지되는지 수동 확인
- 명예의 전당 팀 순위(`team_total_asset`, `members`)가 온더플라이 계산 후에도 기존과 동일한 값을 내는지 수동 확인
- 시민권자 삭제 시 8개 테이블 전체에서 정상 삭제되는지 수동 확인 (SQL Editor)

## 범위 밖

- FK 제약 추가 (기존 설계 결정대로 계속 미적용)
- RLS 활성화
- GAS ↔ Supabase 직접 연동
- `users` 테이블의 `real_name`/`nickname` 길이 제약(varchar(5)) 등 기존 스키마의 다른 제약 변경
- 신규 확장 테이블(활동사진, 활동일지 등)
