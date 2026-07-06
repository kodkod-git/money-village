# nickname → user_id PK 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `bank_history`, `cash_balance`, `estate_balance`, `game_individual`, `quiz_history`, `stock_balance`, `success_factors`, `traits` 8개 테이블의 PK를 `nickname`에서 `users.user_id`로 전환하고, `game_team.team_total_asset`/`members` 컬럼을 제거해 온더플라이 계산으로 대체한다.

**Architecture:** 단일 Supabase 마이그레이션 파일로 스키마를 전환하고(백필 포함), `js/supabase-client.js`의 관련 함수들과 호출부(`counting.js`, `report.js`, `bank.js`, `quiz.js`, `setup.js`)를 `user_id` 기준으로 일괄 수정한다. 플레이어 객체(`players[]`)에 `userId` 필드를 추가해 세션 내내 식별자로 사용한다. 배포는 게임 행사가 없는 시점에 마이그레이션+코드를 동시에 적용한다.

**Tech Stack:** Supabase (PostgreSQL, JS client), 순수 JS (프레임워크 없음), Supabase CLI

**검증 전략:** 자동 테스트 없이 로컬/스테이징 Supabase + 브라우저 수동 검증으로 진행한다 (프로젝트에 테스트 러너가 없음, 사용자 확정 사항).

**스펙 문서:** `docs/superpowers/specs/2026-07-06-nickname-to-user-id-design.md`

---

## File Structure

```
supabase/migrations/
  20260706000000_nickname_to_user_id.sql   # 신규 — PK 전환 + game_team 컬럼 제거

js/supabase-client.js   # 대폭 수정 — 8개 테이블 관련 함수 전체
js/app.js               # 수정 — loadUserBalance/saveUserBalance 래퍼 파라미터명
js/setup.js             # 수정 — startGame()이 sbInitGame 완료를 await하도록 변경
js/counting.js          # 수정 — openPlayerEditModal, applyPlayerEdits, _syncPlayerEditsToDb
js/report.js            # 수정 — saveToDrive, _loadPastGame, 보상 매핑
js/bank.js              # 수정 — 예금 신청/조회/삭제 관련 모든 호출부
js/quiz.js              # 수정 — 퀴즈 정답/조회/삭제 관련 모든 호출부
```

---

## Task 1: 로컬 마이그레이션 이력과 실제 라이브 스키마 동기화 확인

**Files:** 없음 (검증만)

`bank_history`, `bank_state`, `quiz_history`, `quiz_state`, `estate_balance`, `estate_price`, `success_factors` 테이블은 `supabase/migrations/`에 CREATE문이 없다. 새 마이그레이션을 작성하기 전에 실제 스키마가 코드에서 추정한 것과 일치하는지 확인한다.

- [ ] **Step 1: 프로젝트 연결 상태 확인**

```bash
npx supabase status
```

Expected: 링크된 프로젝트 정보 출력. 링크가 안 되어 있다면 `npx supabase link --project-ref <ref>` 먼저 실행 (기존 `docs/superpowers/plans/2026-04-22-supabase-schema-setup.md` 참고).

- [ ] **Step 2: 실제 스키마 pull**

```bash
npx supabase db pull
```

Expected output: 로컬 마이그레이션 이력과 다른 부분이 있으면 새 마이그레이션 파일(`supabase/migrations/<timestamp>_remote_schema.sql` 형태)이 생성됨. 없으면 "no changes" 메시지.

- [ ] **Step 3: 생성된 파일 검토**

`db pull`로 새 파일이 생성됐다면 내용을 열어 아래 8개 테이블의 실제 컬럼/제약을 확인하고 이번 계획의 가정과 다른 점이 있으면 이후 Task들을 그에 맞게 조정할 메모를 남긴다:
`bank_history`, `bank_state`, `quiz_history`, `quiz_state`, `estate_balance`, `estate_price`, `success_factors`

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/
git commit -m "chore: 실제 Supabase 스키마와 로컬 마이그레이션 이력 동기화"
```

새 파일이 없었다면 이 단계는 건너뛴다.

---

## Task 2: nickname → user_id + game_team 컬럼 정리 마이그레이션 SQL 작성

**Files:**
- Create: `supabase/migrations/20260706000000_nickname_to_user_id.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- =====================================================
-- nickname → user_id PK 전환 (8개 테이블)
-- game_team.team_total_asset / members 컬럼 제거
-- =====================================================

-- ---- game_individual ----
ALTER TABLE game_individual ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE game_individual gi
SET user_id = u.user_id
FROM users u
WHERE gi.nickname = u.nickname AND gi.user_id IS NULL;

ALTER TABLE game_individual DROP CONSTRAINT IF EXISTS game_individual_pkey;
ALTER TABLE game_individual DROP COLUMN nickname;
ALTER TABLE game_individual ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE game_individual ADD PRIMARY KEY (game_id, user_id);

-- ---- stock_balance ----
ALTER TABLE stock_balance ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE stock_balance sb
SET user_id = u.user_id
FROM users u
WHERE sb.nickname = u.nickname AND sb.user_id IS NULL;

ALTER TABLE stock_balance DROP CONSTRAINT IF EXISTS stock_balance_pkey;
ALTER TABLE stock_balance DROP COLUMN nickname;
ALTER TABLE stock_balance ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE stock_balance ADD PRIMARY KEY (game_id, user_id);

-- ---- cash_balance ----
ALTER TABLE cash_balance ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE cash_balance cb
SET user_id = u.user_id
FROM users u
WHERE cb.nickname = u.nickname AND cb.user_id IS NULL;

ALTER TABLE cash_balance DROP CONSTRAINT IF EXISTS cash_balance_pkey;
ALTER TABLE cash_balance DROP COLUMN nickname;
ALTER TABLE cash_balance ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE cash_balance ADD PRIMARY KEY (game_id, user_id);

-- ---- traits ----
ALTER TABLE traits ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE traits t
SET user_id = u.user_id
FROM users u
WHERE t.nickname = u.nickname AND t.user_id IS NULL;

ALTER TABLE traits DROP CONSTRAINT IF EXISTS traits_pkey;
ALTER TABLE traits DROP COLUMN nickname;
ALTER TABLE traits ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE traits ADD PRIMARY KEY (game_id, user_id);

-- ---- estate_balance ----
ALTER TABLE estate_balance ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE estate_balance eb
SET user_id = u.user_id
FROM users u
WHERE eb.nickname = u.nickname AND eb.user_id IS NULL;

ALTER TABLE estate_balance DROP CONSTRAINT IF EXISTS estate_balance_pkey;
ALTER TABLE estate_balance DROP COLUMN nickname;
ALTER TABLE estate_balance ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE estate_balance ADD PRIMARY KEY (game_id, user_id);

-- ---- success_factors ----
ALTER TABLE success_factors ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE success_factors sf
SET user_id = u.user_id
FROM users u
WHERE sf.nickname = u.nickname AND sf.user_id IS NULL;

ALTER TABLE success_factors DROP CONSTRAINT IF EXISTS success_factors_pkey;
ALTER TABLE success_factors DROP COLUMN nickname;
ALTER TABLE success_factors ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE success_factors ADD PRIMARY KEY (game_id, user_id);

-- ---- quiz_history ----
ALTER TABLE quiz_history ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE quiz_history qh
SET user_id = u.user_id
FROM users u
WHERE qh.nickname = u.nickname AND qh.user_id IS NULL;

ALTER TABLE quiz_history DROP CONSTRAINT IF EXISTS quiz_history_pkey;
ALTER TABLE quiz_history DROP COLUMN nickname;
ALTER TABLE quiz_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE quiz_history ADD PRIMARY KEY (game_id, user_id);

-- ---- bank_history ----
ALTER TABLE bank_history ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE bank_history bh
SET user_id = u.user_id
FROM users u
WHERE bh.nickname = u.nickname AND bh.user_id IS NULL;

ALTER TABLE bank_history DROP CONSTRAINT IF EXISTS bank_history_pkey;
ALTER TABLE bank_history DROP COLUMN nickname;
ALTER TABLE bank_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE bank_history ADD PRIMARY KEY (game_id, user_id, round_num, is_team);

-- ---- game_team: 요약 컬럼 제거 (온더플라이 계산으로 대체) ----
ALTER TABLE game_team DROP COLUMN IF EXISTS team_total_asset;
ALTER TABLE game_team DROP COLUMN IF EXISTS members;
```

- [ ] **Step 2: 고아 데이터 방어 쿼리 준비 (적용 전 실행할 체크 쿼리)**

마이그레이션 파일 상단에 주석으로 아래 확인 쿼리를 남겨, 적용 담당자가 백필 실패 행이 있는지 미리 확인하게 한다:

```sql
-- 적용 전 아래 쿼리로 nickname 매칭 실패 행이 있는지 확인할 것.
-- 0건이 아니면 users 테이블에 없는 nickname을 가진 게임 기록이 있다는 뜻이므로,
-- 마이그레이션을 중단하고 원인(오탈자, 삭제된 시민권자 등)을 먼저 조사한다.
--
-- SELECT 'game_individual' AS table_name, count(*) FROM game_individual gi LEFT JOIN users u ON gi.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'stock_balance', count(*) FROM stock_balance sb LEFT JOIN users u ON sb.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'cash_balance', count(*) FROM cash_balance cb LEFT JOIN users u ON cb.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'traits', count(*) FROM traits t LEFT JOIN users u ON t.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'estate_balance', count(*) FROM estate_balance eb LEFT JOIN users u ON eb.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'success_factors', count(*) FROM success_factors sf LEFT JOIN users u ON sf.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'quiz_history', count(*) FROM quiz_history qh LEFT JOIN users u ON qh.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'bank_history', count(*) FROM bank_history bh LEFT JOIN users u ON bh.nickname = u.nickname WHERE u.user_id IS NULL;
```

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260706000000_nickname_to_user_id.sql
git commit -m "feat: nickname to user_id PK 전환 마이그레이션 작성"
```

---

## Task 3: 마이그레이션 적용 및 검증 (게이트 — 실행 전 사용자 확인 필요)

**Files:** 없음 (원격/로컬 DB에만 적용)

> ⚠️ 실제 게임 기록이 쌓인 프로덕션 Supabase에 적용하는 작업이다. **로컬 Supabase(`npx supabase start`) 또는 별도 스테이징 프로젝트에서 먼저 검증**하고, 프로덕션 적용은 사용자 확인 후 실행한다.

- [ ] **Step 1: Task 2의 Step 2 고아 데이터 확인 쿼리를 프로덕션 SQL Editor에서 먼저 실행**

모든 결과가 0건인지 확인. 0건이 아니면 중단하고 원인 조사 (오탈자 닉네임, 삭제된 시민권자 등).

- [ ] **Step 2: 로컬/스테이징에 마이그레이션 적용**

```bash
npx supabase db push
```

Expected output: `Applying migration 20260706000000_nickname_to_user_id.sql... Done.`

- [ ] **Step 3: PK 및 컬럼 확인 (SQL Editor)**

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_name IN ('bank_history','cash_balance','estate_balance','game_individual','quiz_history','stock_balance','success_factors','traits')
AND column_name IN ('nickname', 'user_id')
ORDER BY table_name, column_name;
```

Expected: 8개 테이블 모두 `user_id`만 있고 `nickname`은 없어야 함.

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_name = 'game_team';
```

Expected: `team_total_asset`, `members` 컬럼 없음.

- [ ] **Step 4: 백필 정합성 확인**

```sql
SELECT count(*) FROM game_individual WHERE user_id IS NULL;
-- Expected: 0 (NOT NULL 제약이 있으므로 애초에 존재 불가능해야 함)
```

- [ ] **Step 5: 프로덕션 적용 (사용자 확인 후)**

사용자에게 "게임 행사가 없는 시점인지" 확인 받은 뒤, 프로덕션 프로젝트에 대해 동일하게 `npx supabase db push` 실행. 이 단계는 Task 4~19(코드 변경)가 모두 끝나고 배포 직전에(Task 19에서) 코드 배포와 함께 실행한다 — 지금은 로컬/스테이징 검증까지만 완료.

---

## Task 4: `sbInitGame` — user_id 해석 및 8개 테이블 초기화 전환

**Files:**
- Modify: `js/supabase-client.js:137-309` (`sbInitGame`)
- Modify: `js/setup.js:217-331` (`startGame`)

- [ ] **Step 1: `sbInitGame` 전체 교체**

`js/supabase-client.js`의 `sbInitGame` 함수(137~309행)를 아래로 교체:

```js
// 게임 시작 시 초기 레코드 삽입 (자산 = 0)
async function sbInitGame(gameId, mode, players, stockValues, gameVariant = 'basic', date = null) {
    const today = date || new Date().toISOString().slice(0, 10);
    const isAdvancedLike = gameVariant !== 'basic';

    // stock_price (기본 모드에서만)
    if (!isAdvancedLike) {
        const { error: spErr } = await _sb.from('stock_price').insert({
            game_id: gameId,
            sasung:  Number(stockValues[0] ?? 1500),
            lgi:     Number(stockValues[1] ?? 600),
            skei:    Number(stockValues[2] ?? 1600),
            cacao:   Number(stockValues[3] ?? 4000),
            hyunde:  Number(stockValues[4] ?? 6000),
            naber:   Number(stockValues[5] ?? 7000)
        });
        if (spErr) console.error('[sbInitGame] stock_price', spErr);
    }

    // game_info (section_num 자동 계산)
    const { count } = await _sb.from('game_info').select('*', { count: 'exact', head: true }).eq('date', today);
    const { error: giErr } = await _sb.from('game_info').insert({
        game_id:      gameId,
        date:         today,
        player_count: players.length,
        game_type:    mode,
        section_num:  (count || 0) + 1,
        game_variant: gameVariant
    });
    if (giErr) console.error('[sbInitGame] game_info', giErr);

    const nicks = players.map(p => ({
        nick: _nick(p.nickname || p.name || ''),
        name: _text(p.realName || p.name || ''),
        efti: String(p.efti || 'FAEN').trim(),
        p
    })).filter(r => r.nick);

    // users — 기존 유저는 join_date/is_citizen 보존, 신규 유저만 join_date·is_citizen:false 포함 insert
    const { data: existingUsers } = await _sb.from('users').select('user_id, nickname');
    const userIdByNick = new Map((existingUsers || []).map(u => [u.nickname, u.user_id]));

    const newNicks     = nicks.filter(({ nick }) => !userIdByNick.has(nick));
    const existingRows = nicks.filter(({ nick }) =>  userIdByNick.has(nick));

    if (newNicks.length > 0) {
        const insertRows = newNicks.map(({ nick, name, efti }) => {
            const row = {
                nickname:     nick,
                real_name:    name,
                default_efti: efti,
                status:       'active',
                join_date:    today,
                is_citizen:   false
            };
            if (gameVariant === 'rich_vessel') row.user_type = 'adult';
            return row;
        });
        const { data: insertedUsers, error } = await _sb.from('users').insert(insertRows).select('user_id, nickname');
        if (error) console.error('[sbInitGame] users insert', error);
        (insertedUsers || []).forEach(u => userIdByNick.set(u.nickname, u.user_id));
    }

    if (existingRows.length > 0) {
        const upsertRows = existingRows.map(({ nick, name, efti }) => {
            const row = {
                nickname:     nick,
                real_name:    name,
                default_efti: efti,
                status:       'active'
            };
            if (gameVariant === 'rich_vessel') row.user_type = 'adult';
            return row;
        });
        const { error } = await _sb.from('users').upsert(upsertRows, { onConflict: 'nickname' });
        if (error) console.error('[sbInitGame] users upsert', error);
    }

    // 각 플레이어 객체에 user_id를 채워 넣는다 (닉네임 변경 등 이후 저장 흐름의 식별자로 사용)
    nicks.forEach(({ nick, p }) => { p.userId = userIdByNick.get(nick) || null; });

    // cash_balance (전체 0 init)
    const cashRows = nicks.map(({ p }) => ({
        game_id: gameId, user_id: p.userId,
        bill_100: 0, bill_500: 0, bill_1000: 0,
        bill_5000: 0, bill_10000: 0, bill_50000: 0
    }));
    if (cashRows.length > 0) {
        const { error } = await _sb.from('cash_balance').upsert(cashRows, { onConflict: 'game_id,user_id' });
        if (error) console.error('[sbInitGame] cash_balance', error);
    }

    if (isAdvancedLike) {
        // estate_balance (심화/부자의그릇 — 0 init)
        const estateRows = nicks.map(({ p }) => ({
            game_id: gameId, user_id: p.userId,
            gaongaemi: 0, nurigoyangi: 0, damiwonsungi: 0,
            marusuri: 0, chorongbungi: 0, haniyuwoo: 0
        }));
        if (estateRows.length > 0) {
            const { error } = await _sb.from('estate_balance').upsert(estateRows, { onConflict: 'game_id,user_id' });
            if (error) console.error('[sbInitGame] estate_balance', error);
        }

        // success_factors (심화/부자의그릇 — false init)
        const sfRows = nicks.map(({ p }) => ({
            game_id: gameId, user_id: p.userId,
            financial_management: false, communication: false,
            critical_thinking: false, global_economy: false,
            credit_trust: false, entrepreneurship: false
        }));
        if (sfRows.length > 0) {
            const { error } = await _sb.from('success_factors').upsert(sfRows, { onConflict: 'game_id,user_id' });
            if (error) console.error('[sbInitGame] success_factors', error);
        }
    } else {
        // stock_balance (기본 — 0 init)
        const stockRows = nicks.map(({ p }) => ({
            game_id: gameId, user_id: p.userId,
            sasung: 0, lgi: 0, skei: 0, cacao: 0, hyunde: 0, naber: 0
        }));
        if (stockRows.length > 0) {
            const { error } = await _sb.from('stock_balance').upsert(stockRows, { onConflict: 'game_id,user_id' });
            if (error) console.error('[sbInitGame] stock_balance', error);
        }

        // traits (기본 — false init)
        const traitRows = nicks.map(({ p }) => ({
            game_id: gameId, user_id: p.userId,
            diligent: false, saving: false, invest: false,
            career: false, luck: false, adventure: false
        }));
        if (traitRows.length > 0) {
            const { error } = await _sb.from('traits').upsert(traitRows, { onConflict: 'game_id,user_id' });
            if (error) console.error('[sbInitGame] traits', error);
        }
    }

    // game_individual (자산 0)
    const indivRows = nicks.map(({ name, p }) => ({
        user_id:          p.userId,
        real_name:        name,
        total_asset:      0,
        cash:             0,
        stock:            0,
        diligence_reward: 0,
        game_id:          gameId,
        team_id:          p.teamId || null
    }));
    if (indivRows.length > 0) {
        const { error } = await _sb.from('game_individual').insert(indivRows);
        if (error) console.error('[sbInitGame] game_individual', error);
    }

    // game_team (팀전인 경우)
    if (mode === 'team') {
        const teamMap = {};
        players.forEach(p => {
            const tid = p.teamId || '';
            if (!tid) return;
            if (!teamMap[tid]) teamMap[tid] = { name: p.team || '' };
        });

        for (const [tid, t] of Object.entries(teamMap)) {
            if (!tid || !t.name) continue;
            const { error } = await _sb.from('game_team').upsert({
                team_id:   tid,
                game_id:   gameId,
                team_name: _text(t.name)
            }, { onConflict: 'team_id' });
            if (error) console.error('[sbInitGame] game_team', error);
        }
    }
}
```

- [ ] **Step 2: `js/setup.js`의 `startGame`이 `sbInitGame` 완료를 기다리도록 변경**

`sbInitGame`이 끝나야 각 플레이어 객체에 `userId`가 채워지는데, 현재 `startGame()`은 `sbInitGame(...)`을 `await` 없이 백그라운드로 던져놓고 바로 `switchScreen('countingScreen')`으로 넘어간다. 카운팅 화면에서 조작자가 빠르게 값을 입력하면 `userId`가 아직 없는 상태로 저장 함수가 호출될 위험이 있으므로, `startGame`을 `async`로 바꾸고 `sbInitGame` 완료를 기다린 뒤 화면을 전환한다.

`js/setup.js:217`:
```js
    function startGame() {
```
→
```js
    async function startGame() {
```

`js/setup.js:313-330`:
```js
        // 게임 초기 데이터 DB 삽입 (백그라운드)
        const selectedDate = document.getElementById('gameDate').value || new Date().toISOString().slice(0, 10);
        if (currentGameVariant !== 'basic') {
            const estateValues = Object.fromEntries(
                Object.entries(estateInfo).map(([k, v]) => [k, v.price])
            );
            sbInitGame(gameId, currentMode, players, [], currentGameVariant, selectedDate)
                .then(() => sbSaveEstatePrice(gameId, estateValues))
                .catch(e => console.error('[sbInitGame/sbSaveEstatePrice]', e));
        } else {
            const stockValues = Object.values(stockInfo).map(s => s.price);
            sbInitGame(gameId, currentMode, players, stockValues, currentGameVariant, selectedDate)
                .catch(e => console.error('[sbInitGame]', e));
        }

        switchScreen('countingScreen');
        renderSidebar();
        selectCountingPlayer(0);
    }
```
→
```js
        // 게임 초기 데이터 DB 삽입 — userId 배정을 기다린 뒤 카운팅 화면으로 전환
        const selectedDate = document.getElementById('gameDate').value || new Date().toISOString().slice(0, 10);
        try {
            if (currentGameVariant !== 'basic') {
                const estateValues = Object.fromEntries(
                    Object.entries(estateInfo).map(([k, v]) => [k, v.price])
                );
                await sbInitGame(gameId, currentMode, players, [], currentGameVariant, selectedDate);
                await sbSaveEstatePrice(gameId, estateValues);
            } else {
                const stockValues = Object.values(stockInfo).map(s => s.price);
                await sbInitGame(gameId, currentMode, players, stockValues, currentGameVariant, selectedDate);
            }
        } catch (e) {
            console.error('[startGame/sbInitGame]', e);
        }

        switchScreen('countingScreen');
        renderSidebar();
        selectCountingPlayer(0);
    }
```

- [ ] **Step 3: 로컬/스테이징에서 수동 검증**

스테이징 Supabase에 연결한 상태로 브라우저에서 새 게임을 생성(개인/팀 모드 각각)하고, `cash_balance`/`stock_balance`(또는 `estate_balance`/`success_factors`) 테이블에 `user_id`가 채워진 행이 생기는지 SQL Editor에서 확인:

```sql
SELECT * FROM cash_balance WHERE game_id = '<방금 생성한 game_id>';
```

Expected: `user_id` 컬럼에 uuid 값이 모두 채워져 있음 (NULL 없음).

- [ ] **Step 4: 커밋**

```bash
git add js/supabase-client.js js/setup.js
git commit -m "feat: sbInitGame과 startGame을 user_id 기준으로 전환"
```

---

## Task 5: 잔고 저장/조회 함수 전환 (주식/부동산/현금)

**Files:**
- Modify: `js/supabase-client.js:311-347` (`sbSaveUserBalance`, `sbLoadUserBalance`)
- Modify: `js/supabase-client.js:551-582` (`sbSaveEstateBalance`, `sbLoadEstateBalance`)
- Modify: `js/app.js:260-275` (`loadUserBalance`, `saveUserBalance` 래퍼)
- Modify: `js/report.js:1002, 1005, 1274, 1283` (호출부)
- Modify: `js/counting.js` — 없음 (해당 함수들을 직접 호출하지 않음, Task 14에서 확인)

- [ ] **Step 1: `sbSaveUserBalance`/`sbLoadUserBalance` 교체**

```js
async function sbSaveUserBalance(userId, gameId, assets) {
    const gid = String(gameId || '').trim();
    if (!userId || !gid) return;

    await _sb.from('stock_balance').upsert({
        user_id: userId, game_id: gid,
        sasung:  Number(assets['SASUNG']  || 0),
        lgi:     Number(assets['LGI']     || 0),
        skei:    Number(assets['SKEI']    || 0),
        cacao:   Number(assets['CACAO']   || 0),
        hyunde:  Number(assets['HYUNDE']  || 0),
        naber:   Number(assets['NABER']   || 0)
    }, { onConflict: 'game_id,user_id' });

    await _sb.from('cash_balance').upsert({
        user_id: userId, game_id: gid,
        bill_100:   Number(assets['100']   || 0),
        bill_500:   Number(assets['500']   || 0),
        bill_1000:  Number(assets['1000']  || 0),
        bill_5000:  Number(assets['5000']  || 0),
        bill_10000: Number(assets['10000'] || 0),
        bill_50000: Number(assets['50000'] || 0)
    }, { onConflict: 'game_id,user_id' });
}

async function sbLoadUserBalance(userId, gameId) {
    const { data } = await _sb
        .from('stock_balance').select('*')
        .eq('user_id', userId).eq('game_id', gameId)
        .maybeSingle();
    if (!data) return null;
    return {
        SASUNG: data.sasung, LGI: data.lgi,   SKEI:   data.skei,
        CACAO:  data.cacao,  HYUNDE: data.hyunde, NABER: data.naber
    };
}
```

- [ ] **Step 2: `sbSaveEstateBalance`/`sbLoadEstateBalance` 교체**

```js
async function sbSaveEstateBalance(userId, gameId, assets) {
    const gid = String(gameId || '').trim();
    if (!userId || !gid) return;
    const { error } = await _sb.from('estate_balance').upsert({
        user_id:   userId,
        game_id:    gid,
        gaongaemi:    Number(assets['GAONGAEMI']    || 0),
        nurigoyangi:  Number(assets['NURIGOYANGI']  || 0),
        damiwonsungi: Number(assets['DAMIWONSUNGI'] || 0),
        marusuri:     Number(assets['MARUSURI']     || 0),
        chorongbungi: Number(assets['CHORONGBUNGI'] || 0),
        haniyuwoo:    Number(assets['HANIYUWOO']    || 0),
    }, { onConflict: 'game_id,user_id' });
    if (error) console.error('[sbSaveEstateBalance]', error);
}

async function sbLoadEstateBalance(userId, gameId) {
    const { data } = await _sb
        .from('estate_balance').select('*')
        .eq('user_id', userId).eq('game_id', gameId)
        .maybeSingle();
    if (!data) return null;
    return {
        GAONGAEMI:    data.gaongaemi,
        NURIGOYANGI:  data.nurigoyangi,
        DAMIWONSUNGI: data.damiwonsungi,
        MARUSURI:     data.marusuri,
        CHORONGBUNGI: data.chorongbungi,
        HANIYUWOO:    data.haniyuwoo,
    };
}
```

- [ ] **Step 3: `js/app.js`의 래퍼 파라미터명 변경 (동작은 동일)**

`js/app.js:260-275`:
```js
    async function loadUserBalance(nickname, gameId) {
        try {
            return await sbLoadUserBalance(nickname, gameId);
        } catch (e) {
            console.error(`[loadUserBalance] ${nickname} 오류:`, e);
            return null;
        }
    }

    async function saveUserBalance(nickname, gameId, assets) {
        try {
            await sbSaveUserBalance(nickname, gameId, assets);
        } catch (e) {
            console.error('[saveUserBalance] 오류:', e);
        }
    }
```
→
```js
    async function loadUserBalance(userId, gameId) {
        try {
            return await sbLoadUserBalance(userId, gameId);
        } catch (e) {
            console.error(`[loadUserBalance] ${userId} 오류:`, e);
            return null;
        }
    }

    async function saveUserBalance(userId, gameId, assets) {
        try {
            await sbSaveUserBalance(userId, gameId, assets);
        } catch (e) {
            console.error('[saveUserBalance] 오류:', e);
        }
    }
```

- [ ] **Step 4: `js/report.js` 호출부 수정**

`js/report.js:1002`: `sbSaveEstateBalance(p.nickname, gameId, p.assets)` → `sbSaveEstateBalance(p.userId, gameId, p.assets)`

`js/report.js:1005`: `saveUserBalance(p.nickname, gameId, p.assets)` → `saveUserBalance(p.userId, gameId, p.assets)`

`js/report.js:1274`: `sbLoadEstateBalance(p.nickname, p.gameId)` → `sbLoadEstateBalance(p.userId, p.gameId)`

`js/report.js:1283`: `sbLoadUserBalance(p.nickname, p.gameId)` → `sbLoadUserBalance(p.userId, p.gameId)`

(이 호출부들은 Task 15에서 `_loadPastGame`/`saveToDrive` 전체를 다룰 때 다시 확인하므로, 지금은 이 네 줄만 우선 바꿔둔다.)

- [ ] **Step 5: 커밋**

```bash
git add js/supabase-client.js js/app.js js/report.js
git commit -m "feat: 주식/부동산/현금 잔고 함수를 user_id 기준으로 전환"
```

---

## Task 6: 특성/성공요소 저장 함수 전환

**Files:**
- Modify: `js/supabase-client.js:349-366` (`sbSaveTraits`)
- Modify: `js/supabase-client.js:600-618` (`sbSaveSuccessFactors`)

- [ ] **Step 1: `sbSaveTraits` 교체**

```js
async function sbSaveTraits(gameId, players) {
    if (!gameId) return;
    const rows = players
        .map(p => ({
            user_id:   p.userId,
            game_id:   gameId,
            diligent:  !!(p.traits && p.traits.diligent),
            saving:    !!(p.traits && p.traits.saving),
            invest:    !!(p.traits && p.traits.invest),
            career:    !!(p.traits && p.traits.career),
            luck:      !!(p.traits && p.traits.luck),
            adventure: !!(p.traits && p.traits.adventure)
        }))
        .filter(r => r.user_id);
    if (rows.length === 0) return;
    const { error } = await _sb.from('traits').upsert(rows, { onConflict: 'game_id,user_id' });
    if (error) console.error('[sbSaveTraits]', error);
}
```

- [ ] **Step 2: `sbSaveSuccessFactors` 교체**

```js
async function sbSaveSuccessFactors(gameId, players) {
    if (!gameId) return;
    const gid = String(gameId).trim();
    const rows = players
        .map(p => ({
            user_id:              p.userId,
            game_id:              gid,
            financial_management: !!(p.successFactors && p.successFactors.financial_management),
            communication:        !!(p.successFactors && p.successFactors.communication),
            critical_thinking:    !!(p.successFactors && p.successFactors.critical_thinking),
            global_economy:       !!(p.successFactors && p.successFactors.global_economy),
            credit_trust:         !!(p.successFactors && p.successFactors.credit_trust),
            entrepreneurship:     !!(p.successFactors && p.successFactors.entrepreneurship),
        }))
        .filter(r => r.user_id);
    if (rows.length === 0) return;
    const { error } = await _sb.from('success_factors').upsert(rows, { onConflict: 'game_id,user_id' });
    if (error) console.error('[sbSaveSuccessFactors]', error);
}
```

`sbLoadTraitsByGameId`/`sbLoadSuccessFactorsByGameId`는 `select('*')`로 전체 컬럼을 가져오므로 코드 수정 불필요 — 마이그레이션 이후 자동으로 `user_id` 필드를 포함해 반환한다. 이 함수들의 반환값을 사용하는 `report.js`의 `_loadPastGame`은 Task 15에서 수정한다.

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: traits/success_factors 저장 함수를 user_id 기준으로 전환"
```

---

## Task 7: `sbSaveGameResult` 전환 + `game_team` 저장 시 컬럼 제거

**Files:**
- Modify: `js/supabase-client.js:368-444` (`sbSaveGameResult`)

- [ ] **Step 1: `sbSaveGameResult` 전체 교체**

기존 함수는 `individuals` 배열의 각 항목이 `users` 테이블에 없으면 새로 만드는 방어 로직을 갖고 있었는데, 이제는 `sbInitGame`/`_syncPlayerEditsToDb`(Task 14)가 항상 먼저 실행되어 모든 플레이어가 `user_id`를 갖고 이 함수에 도달하므로 그 방어 로직은 제거한다.

```js
async function sbSaveGameResult({ mode, date, game_variant = 'basic', individuals = [], teams = [] }) {
    for (const p of individuals) {
        if (!p.user_id) { console.error('[sbSaveGameResult] user_id 없는 individual 무시', p); continue; }
        await _sb.from('game_individual').upsert({
            user_id:          p.user_id,
            real_name:        _text(p.real_name ?? ''),
            total_asset:      Number(p.total ?? 0),
            cash:             Number(p.manualCash ?? 0),
            stock:            Number(p.stockVal ?? 0),
            diligence_reward: Number(p.diligence_reward ?? 0),
            quest_reward:     Number(p.questReward ?? 0),
            deposit_reward:   Number(p.depositReward ?? 0),
            game_id:          String(p.game_id || '').trim(),
            team_id:          String(p.team_id || '').trim() || null
        }, { onConflict: 'game_id,user_id' });
    }

    if (mode === 'team') {
        for (const t of teams) {
            const teamId   = String(t.team_id || '').trim();
            const teamName = _text(t.name ?? '');
            const gameId   = String(t.game_id || '').trim();
            if (!teamId || !teamName || !gameId) continue;
            await _sb.from('game_team').upsert({
                team_id:   teamId,
                game_id:   gameId,
                team_name: teamName
            }, { onConflict: 'team_id' });
        }
    }

    // game_info upsert: 날짜 내 section_num 자동 계산
    const gameId = String((individuals[0] || teams[0] || {}).game_id || '').trim();
    if (gameId) {
        const { data: existing } = await _sb.from('game_info').select('game_id').eq('game_id', gameId).maybeSingle();
        if (!existing) {
            const { count } = await _sb.from('game_info').select('*', { count: 'exact', head: true }).eq('date', date);
            await _sb.from('game_info').insert({
                game_id:      gameId,
                date,
                player_count: individuals.length,
                game_type:    mode,
                section_num:  (count || 0) + 1,
                game_variant
            });
        } else {
            await _sb.from('game_info').update({
                player_count: individuals.length,
                game_type:    mode,
                game_variant
            }).eq('game_id', gameId);
        }
    }

    return { success: true };
}
```

- [ ] **Step 2: `js/report.js`의 `saveToDrive` 호출부 수정 (individuals/teams payload)**

`js/report.js:1002-1013` (Task 5에서 이미 `p.nickname`→`p.userId`로 바꾼 두 줄 포함):
```js
            if (currentGameVariant !== 'basic') {
                await Promise.all(players.map(p => sbSaveEstateBalance(p.userId, gameId, p.assets)));
                await sbSaveSuccessFactors(gameId, players);
            } else {
                await Promise.all(players.map(p => saveUserBalance(p.userId, gameId, p.assets)));
                await saveTraits(gameId, players);
            }
            await Promise.all(players.map(p => {
                const saves = [];
                if (p.depositReward !== undefined) saves.push(sbSaveDepositReward(gameId, p.userId, p.depositReward));
                if (p.questReward   !== undefined) saves.push(sbSaveQuestReward(gameId,   p.userId, p.questReward));
                return Promise.all(saves);
            }));
```

`js/report.js:1017-1038` — `individuals`에 `user_id` 추가, `teams`의 `members` 필드 구성 제거(더 이상 저장하지 않으므로):
```js
            const exportData = {
                action: "saveGameResult",
                mode: currentMode,
                date: dateStr,
                game_variant: currentGameVariant,
                individuals: players.map(p => ({
                    game_id: p.gameId || null,
                    user_id: p.userId || null,
                    real_name: p.realName || p.name || '',
                    efti_type: p.efti || '',
                    total: p.total,
                    manualCash: p.manualCash,
                    diligence_reward: p.diligenceReward || 0,
                    questReward: p.questReward || 0,
                    depositReward: p.depositReward || 0,
                    stockVal: calcActiveAsset(p.assets),
                    team: p.team || '-',
                    team_id: p.teamId || '',
                    traits: p.traits || initTraitsState()
                })),
                teams: []
            };

            if (currentMode === 'team') {
                const teamMap = {};
                players.forEach(p => {
                    if (!teamMap[p.team]) teamMap[p.team] = { total: 0, memberObjs: [] };
                    teamMap[p.team].total += p.total;
                    teamMap[p.team].memberObjs.push(p);
                });

                for (const tName in teamMap) {
                    const sortedMembers = teamMap[tName].memberObjs.sort((a, b) => b.total - a.total);

                    exportData.teams.push({
                        team_id: sortedMembers[0]?.teamId || '',
                        game_id: sortedMembers[0]?.gameId || '',
                        name: tName,
                        total: teamMap[tName].total
                    });
                }
            }
```

(`members` 필드와 그 계산 로직을 제거했다 — `game_team`이 더 이상 이 값을 저장하지 않으므로.)

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js js/report.js
git commit -m "feat: sbSaveGameResult를 user_id 기준으로 전환하고 game_team 요약 컬럼 저장 제거"
```

---

## Task 8: 보상 저장/조회 함수 전환 (예금/퀘스트)

**Files:**
- Modify: `js/supabase-client.js:506-525` (`sbSaveDepositReward`, `sbSaveQuestReward`, `sbGetRewardsByGameId`)
- Modify: `js/report.js:100-110` 부근 (보상 매핑)

- [ ] **Step 1: 세 함수 교체**

```js
async function sbSaveDepositReward(gameId, userId, depositReward) {
    await _sb.from('game_individual')
        .update({ deposit_reward: Number(depositReward) })
        .eq('game_id', gameId)
        .eq('user_id', userId);
}

async function sbSaveQuestReward(gameId, userId, questReward) {
    await _sb.from('game_individual')
        .update({ quest_reward: Number(questReward) })
        .eq('game_id', gameId)
        .eq('user_id', userId);
}

async function sbGetRewardsByGameId(gameId) {
    const { data } = await _sb.from('game_individual')
        .select('user_id, quest_reward, deposit_reward')
        .eq('game_id', gameId);
    return data || [];
}
```

- [ ] **Step 2: `js/report.js`의 보상 매핑 수정**

`js/report.js:105-108`:
```js
                const rewardMap = Object.fromEntries(rewards.map(r => [r.nickname, r]));
                players.forEach(p => {
                    p.questReward   = Number(rewardMap[p.nickname]?.quest_reward   || 0);
                    p.depositReward = Number(rewardMap[p.nickname]?.deposit_reward || 0);
                });
```
→
```js
                const rewardMap = Object.fromEntries(rewards.map(r => [r.user_id, r]));
                players.forEach(p => {
                    p.questReward   = Number(rewardMap[p.userId]?.quest_reward   || 0);
                    p.depositReward = Number(rewardMap[p.userId]?.deposit_reward || 0);
                });
```

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js js/report.js
git commit -m "feat: 예금/퀘스트 보상 함수를 user_id 기준으로 전환"
```

---

## Task 9: `bank_history` 관련 함수 전환

**Files:**
- Modify: `js/supabase-client.js:683-700` (`sbGetBankHistory`, `sbUpsertBankHistory`)
- Modify: `js/supabase-client.js:746-756` (`sbDeleteBankHistoryEntries`)

`sbDeleteBankHistory(gameId)` (738-744행)는 `game_id`만 사용하므로 수정 불필요.

- [ ] **Step 1: `sbUpsertBankHistory` 교체**

```js
async function sbGetBankHistory(gameId) {
    const { data } = await _sb.from('bank_history').select('*')
        .eq('game_id', gameId);
    return data || [];
}

async function sbUpsertBankHistory(gameId, userId, roundNum, depositType, amount, maturedAmount, isTeam) {
    const { error } = await _sb.from('bank_history').upsert({
        game_id:        gameId,
        user_id:        userId,
        round_num:      roundNum,
        deposit_type:   depositType,
        amount:         amount,
        matured_amount: maturedAmount,
        is_team:        !!isTeam
    }, { onConflict: 'game_id,user_id,round_num,is_team' });
    if (error) console.error('[sbUpsertBankHistory]', error);
}
```

- [ ] **Step 2: `sbDeleteBankHistoryEntries` 교체**

```js
async function sbDeleteBankHistoryEntries(gameId, userIds, roundNum, isTeam) {
    const gid = String(gameId || '').trim();
    if (!gid || !userIds.length) return { success: false };
    const { error } = await _sb.from('bank_history').delete()
        .eq('game_id', gid)
        .in('user_id', userIds)
        .eq('round_num', roundNum)
        .eq('is_team', !!isTeam);
    if (error) { console.error('[sbDeleteBankHistoryEntries]', error); return { success: false }; }
    return { success: true };
}
```

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: bank_history 함수를 user_id 기준으로 전환"
```

---

## Task 10: `quiz_history` 관련 함수 전환

**Files:**
- Modify: `js/supabase-client.js:706-732` (`sbGetQuizHistory`, `sbUpsertQuizHistory`)
- Modify: `js/supabase-client.js:766-774` (`sbDeleteQuizHistoryEntries`)

`sbDeleteQuizHistory(gameId)` (758-764행)는 `game_id`만 사용하므로 수정 불필요.

- [ ] **Step 1: `sbUpsertQuizHistory` 교체**

```js
async function sbGetQuizHistory(gameId) {
    const { data } = await _sb.from('quiz_history').select('*')
        .eq('game_id', gameId);
    return data || [];
}

async function sbUpsertQuizHistory(gameId, userId, fields) {
    const { error } = await _sb.from('quiz_history').upsert(
        { game_id: gameId, user_id: userId, ...fields },
        { onConflict: 'game_id,user_id' }
    );
    if (error) console.error('[sbUpsertQuizHistory]', error);
}
```

- [ ] **Step 2: `sbDeleteQuizHistoryEntries` 교체**

```js
async function sbDeleteQuizHistoryEntries(gameId, userIds) {
    const gid = String(gameId || '').trim();
    if (!gid || !userIds.length) return { success: false };
    const { error } = await _sb.from('quiz_history').delete()
        .eq('game_id', gid)
        .in('user_id', userIds);
    if (error) { console.error('[sbDeleteQuizHistoryEntries]', error); return { success: false }; }
    return { success: true };
}
```

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: quiz_history 함수를 user_id 기준으로 전환"
```

---

## Task 11: `sbDeleteCitizen` 전환 + 누락 테이블 보강

**Files:**
- Modify: `js/supabase-client.js:62-79` (`sbDeleteCitizen`)

기존 삭제 대상 테이블 목록에 `bank_history`/`quiz_history`가 빠져 있었다 (기존 버그). `user_id` 기준으로 통일하면서 함께 바로잡는다.

- [ ] **Step 1: `sbDeleteCitizen` 교체**

```js
async function sbDeleteCitizen(nickname) {
    const nick = _nick(nickname);
    if (!nick) return { success: false, code: 'EMPTY_NICKNAME' };

    const { data: user } = await _sb.from('users').select('user_id, nickname').eq('nickname', nick).maybeSingle();
    if (!user) return { success: false, code: 'USER_NOT_FOUND' };

    const tables = [
        'cash_balance', 'game_individual', 'estate_balance',
        'success_factors', 'stock_balance', 'traits',
        'bank_history', 'quiz_history'
    ];
    for (const table of tables) {
        const { error } = await _sb.from(table).delete().eq('user_id', user.user_id);
        if (error) return { success: false, code: 'DELETE_FAILED', table, message: error.message };
    }

    const { error: e5 } = await _sb.from('users').delete().eq('user_id', user.user_id);
    if (e5) return { success: false, code: 'DELETE_FAILED', message: e5.message };

    return { success: true, nickname: nick };
}
```

- [ ] **Step 2: 수동 검증**

스테이징에서 시민권자 DB 탭 → 임의의 테스트 시민권자 삭제 → 해당 `user_id`로 8개 테이블 전부에 잔여 행이 없는지 SQL Editor로 확인:

```sql
SELECT
  (SELECT count(*) FROM bank_history WHERE user_id = '<삭제한 user_id>') AS bank_history,
  (SELECT count(*) FROM quiz_history WHERE user_id = '<삭제한 user_id>') AS quiz_history;
```

Expected: 둘 다 0.

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "fix: sbDeleteCitizen을 user_id 기준으로 전환하고 bank_history/quiz_history 삭제 누락 보강"
```

---

## Task 12: 과거 게임 로드 함수 전환 (`users` 조인)

**Files:**
- Modify: `js/supabase-client.js:472-504` (`sbLoadAssetsByGameId`, `sbGetPlayersByGameId`)

`sbLoadAssetsByDate`(446-451행)는 코드베이스 어디에서도 호출되지 않는 죽은 코드이므로 이번 범위에서 손대지 않는다.

- [ ] **Step 1: `sbLoadAssetsByGameId` 교체 — `game_individual`에서 사라진 `nickname`을 `users` 조인으로 복원**

```js
// game_id 기반 플레이어 전체 로드
async function sbLoadAssetsByGameId(gameId) {
    const { data: rows } = await _sb.from('game_individual').select('*')
        .eq('game_id', gameId).order('total_asset', { ascending: false });
    if (!rows || rows.length === 0) return { success: true, history: [] };

    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: users } = await _sb.from('users')
        .select('user_id, nickname').in('user_id', userIds);
    const nickByUserId = Object.fromEntries((users || []).map(u => [u.user_id, u.nickname]));

    const history = rows.map(r => ({ ...r, nickname: nickByUserId[r.user_id] || '' }));
    return { success: true, history };
}
```

- [ ] **Step 2: `sbGetPlayersByGameId` 교체**

```js
// game_id 참가자 목록 (user_id, nickname, real_name, default_efti)
async function sbGetPlayersByGameId(gameId) {
    const { data: rows } = await _sb.from('game_individual')
        .select('user_id, real_name, team_id').eq('game_id', gameId);
    if (!rows || rows.length === 0) return [];

    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: users } = await _sb.from('users')
        .select('user_id, nickname, real_name, default_efti').in('user_id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.user_id, u]));

    const teamIds = [...new Set(rows.map(r => r.team_id).filter(Boolean))];
    let teamMap = {};
    if (teamIds.length > 0) {
        const { data: teams } = await _sb.from('game_team')
            .select('team_id, team_name').in('team_id', teamIds);
        teamMap = Object.fromEntries((teams || []).map(t => [t.team_id, t.team_name]));
    }

    return rows.map(r => ({
        user_id:      r.user_id,
        nickname:     userMap[r.user_id]?.nickname || '',
        real_name:    userMap[r.user_id]?.real_name || r.real_name || '',
        default_efti: userMap[r.user_id]?.default_efti || 'FAEN',
        team_name:    r.team_id ? (teamMap[r.team_id] || '') : ''
    }));
}
```

`sbGetPlayersByGameId`의 반환 객체에 `user_id`가 추가됐다 — 이 함수를 호출하는 `js/bank.js:240`(`_bank.players = await sbGetPlayersByGameId(...)`)과 `js/quiz.js:248`(`_quiz.players = ...`)은 자동으로 `.user_id` 필드를 갖게 되며, Task 16/17에서 이 필드를 사용한다.

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: sbLoadAssetsByGameId/sbGetPlayersByGameId가 user_id로 users를 조인하도록 전환"
```

---

## Task 13: `sbLoadHallOfFame` 온더플라이 팀 집계로 전환

**Files:**
- Modify: `js/supabase-client.js:629-641` (`sbLoadHallOfFame`)

- [ ] **Step 1: 함수 교체**

기존에는 `game_team.team_total_asset`/`members` 컬럼을 그대로 읽었지만, 이제 `game_individual`을 `team_id`로 집계해서 만든다. 개인 랭킹(상위 200명)과 별개로, 팀 총자산은 전체 개인 데이터를 다시 조회해 정확히 합산한다 (상위 200명만으로 집계하면 순위 밖 팀원의 자산이 누락될 수 있으므로).

```js
async function sbLoadHallOfFame() {
    const [{ data: gameInfoList }, { data: indiv }, { data: team }, { data: users }, { data: allIndiv }] = await Promise.all([
        _sb.from('game_info').select('game_id, game_variant'),
        _sb.from('game_individual').select('*').order('total_asset', { ascending: false }).limit(200),
        _sb.from('game_team').select('*'),
        _sb.from('users').select('user_id, nickname'),
        _sb.from('game_individual').select('user_id, team_id, total_asset, game_id')
    ]);

    const variantMap = Object.fromEntries(
        (gameInfoList || []).map(r => [r.game_id, r.game_variant || 'basic'])
    );
    const nickByUserId = Object.fromEntries((users || []).map(u => [u.user_id, u.nickname]));

    const indivWithVariant = (indiv || []).map(r => ({
        ...r,
        nickname:     nickByUserId[r.user_id] || '',
        game_variant: variantMap[r.game_id] || 'basic'
    }));

    // team_id별 총자산/멤버 닉네임 온더플라이 집계
    const teamAgg = {};
    (allIndiv || []).forEach(r => {
        if (!r.team_id) return;
        if (!teamAgg[r.team_id]) teamAgg[r.team_id] = { total: 0, members: [] };
        teamAgg[r.team_id].total += Number(r.total_asset) || 0;
        teamAgg[r.team_id].members.push(nickByUserId[r.user_id] || '');
    });

    const teamWithVariant = (team || [])
        .map(t => ({
            ...t,
            team_total_asset: teamAgg[t.team_id]?.total || 0,
            members:          (teamAgg[t.team_id]?.members || []).filter(Boolean).join(', '),
            game_variant:     variantMap[t.game_id] || 'basic'
        }))
        .sort((a, b) => b.team_total_asset - a.team_total_asset)
        .slice(0, 200);

    return { indiv: indivWithVariant, team: teamWithVariant };
}
```

`js/fame.js`는 `d.team_total_asset`/`item.members`를 그대로 읽으므로 (fame.js:56, fame.js:127) 수정이 필요 없다 — 함수가 동일한 필드명으로 계산된 값을 반환한다.

- [ ] **Step 2: 수동 검증**

스테이징에서 팀 모드로 게임 하나를 생성/저장한 뒤 명예의 전당 화면을 열어, 팀 총자산이 해당 팀 멤버들의 `total_asset` 합과 일치하는지, 멤버 목록에 닉네임이 콤마로 나열되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: sbLoadHallOfFame이 team_total_asset/members를 온더플라이로 계산하도록 전환"
```

---

## Task 14: `js/counting.js` — 플레이어 편집/닉네임 변경 로직을 user_id 식별 기반으로 재작성

**Files:**
- Modify: `js/counting.js:224-276` (`openPlayerEditModal`)
- Modify: `js/counting.js:328-408` (`applyPlayerEdits`)
- Modify: `js/counting.js:410-531` (`_syncPlayerEditsToDb`)

이 Task가 이번 리팩토링의 핵심 목표다: 지금은 편집 모달의 각 행이 "닉네임 텍스트"로만 기존 플레이어와 매칭되기 때문에, 닉네임을 바꾸면 기존 플레이어를 못 찾아 "삭제된 플레이어 + 신규 플레이어"로 취급되어 자산이 초기화된다. 각 행에 `user_id`를 데이터 속성으로 심어서 식별자로 쓰면 이 문제가 근본적으로 사라진다.

- [ ] **Step 1: `openPlayerEditModal`에 `data-user-id` 심기**

`js/counting.js:230-237`:
```js
        if (currentMode === 'individual') {
            document.getElementById('indivEditBar').style.display = 'flex';
            document.getElementById('teamEditAddBar').style.display = 'none';
            players.forEach((p, i) => {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = makeInp(`참가자 ${i + 1}`, p.realName || p.name || '', p.nickname || '');
                area.appendChild(wrapper.firstElementChild);
            });
        } else {
```
→
```js
        if (currentMode === 'individual') {
            document.getElementById('indivEditBar').style.display = 'flex';
            document.getElementById('teamEditAddBar').style.display = 'none';
            players.forEach((p, i) => {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = makeInp(`참가자 ${i + 1}`, p.realName || p.name || '', p.nickname || '');
                const row = wrapper.firstElementChild;
                row.dataset.userId = p.userId || '';
                area.appendChild(row);
            });
        } else {
```

`js/counting.js:265-269`:
```js
                members.forEach((p, j) => {
                    const rowWrapper = document.createElement('div');
                    rowWrapper.innerHTML = makeInp(`참가자 ${j + 1}`, p.realName || p.name || '', p.nickname || '');
                    membersEl.appendChild(rowWrapper.firstElementChild);
                });
```
→
```js
                members.forEach((p, j) => {
                    const rowWrapper = document.createElement('div');
                    rowWrapper.innerHTML = makeInp(`참가자 ${j + 1}`, p.realName || p.name || '', p.nickname || '');
                    const row = rowWrapper.firstElementChild;
                    row.dataset.userId = p.userId || '';
                    membersEl.appendChild(row);
                });
```

- [ ] **Step 2: `applyPlayerEdits`를 `data-user-id` 기반 매칭으로 재작성**

`js/counting.js:328-408` 전체를 아래로 교체:

```js
    async function applyPlayerEdits() {
        const area = document.getElementById('playerEditArea');
        const gameId = players[0]?.gameId;
        const existingByUserId = {};
        players.forEach(p => { if (p.userId) existingByUserId[p.userId] = p; });

        const newPlayers = [];

        if (currentMode === 'individual') {
            const rows = Array.from(area.querySelectorAll('.citizen-row'));
            const nicknames = rows.map((row, i) => {
                const rn = row.querySelector('.realname-input')?.value?.trim() || `참가자${i + 1}`;
                return row.querySelector('.nickname-input')?.value?.trim() || rn;
            });
            const dups = nicknames.filter((n, i) => nicknames.indexOf(n) !== i);
            if (dups.length > 0) {
                alert(`중복된 닉네임이 있습니다: ${[...new Set(dups)].join(', ')}\n닉네임을 다시 설정해주세요.`);
                return;
            }
            rows.forEach((row, i) => {
                const realName = row.querySelector('.realname-input')?.value?.trim() || `참가자${i + 1}`;
                const nickname = row.querySelector('.nickname-input')?.value?.trim() || realName;
                const efti = row.dataset.efti || '-';
                const rowUserId = row.dataset.userId || '';
                const existing = rowUserId ? existingByUserId[rowUserId] : null;
                if (existing) {
                    existing.realName = realName; existing.name = realName; existing.id = i;
                    existing.nickname = nickname;
                    if (efti !== '-') existing.efti = efti;
                    newPlayers.push(existing);
                } else {
                    newPlayers.push({
                        id: i, gameId, nickname, realName, name: realName,
                        efti: efti || '-', team: '-', userId: null,
                        assets: initAssets(), total: 0,
                        rankIndiv: 0, rankTeam: 0, teamTotal: 0,
                        manualCash: 0, diligenceReward: 0,
                        traits: initTraitsState(), successFactors: initSuccessFactorsState()
                    });
                }
            });
        } else {
            let idx = 0;
            area.querySelectorAll('.team-section').forEach(teamSec => {
                const teamName = (teamSec.querySelector('.team-name-input')?.value || '').trim() || '팀';
                const existingTeamPlayer = players.find(p => p.team === teamName);
                const teamId = existingTeamPlayer?.teamId || ('T' + Math.random().toString(36).substr(2, 8).toUpperCase());
                teamSec.querySelectorAll('.citizen-row').forEach(row => {
                    const realName = row.querySelector('.realname-input')?.value?.trim() || `참가자${idx + 1}`;
                    const nickname = row.querySelector('.nickname-input')?.value?.trim() || realName;
                    const efti = row.dataset.efti || '-';
                    const rowUserId = row.dataset.userId || '';
                    const existing = rowUserId ? existingByUserId[rowUserId] : null;
                    if (existing) {
                        existing.realName = realName; existing.name = realName;
                        existing.team = teamName; existing.teamId = teamId; existing.id = idx;
                        if (efti !== '-') existing.efti = efti;
                        newPlayers.push(existing);
                    } else {
                        newPlayers.push({
                            id: idx, gameId, nickname, realName, name: realName,
                            efti: efti || '-', team: teamName, teamId, userId: null,
                            assets: initAssets(), total: 0,
                            rankIndiv: 0, rankTeam: 0, teamTotal: 0,
                            manualCash: 0, diligenceReward: 0,
                            traits: initTraitsState(), successFactors: initSuccessFactorsState()
                        });
                    }
                    idx++;
                });
            });
        }

        if (newPlayers.length === 0) { alert("명단을 입력하세요."); return; }

        const oldPlayers = players.slice();
        players = newPlayers;
        recalculateAllRankings();
        if (activeCountingIndex >= players.length) activeCountingIndex = 0;
        renderSidebar();
        selectCountingPlayer(activeCountingIndex);
        closePlayerEditModal(true);
        _syncPlayerEditsToDb(oldPlayers, newPlayers).catch(e => console.error('[syncPlayerEdits]', e));
    }
```

- [ ] **Step 3: `_syncPlayerEditsToDb`를 user_id 식별 기반으로 재작성**

`js/counting.js:410-531` 전체를 아래로 교체:

```js
    async function _syncPlayerEditsToDb(oldPlayers, newPlayers) {
        if (isSampleMode) return;
        const gameId = (newPlayers[0] || oldPlayers[0])?.gameId;
        if (!gameId) return;

        const isAdvancedLike = currentGameVariant !== 'basic';
        const oldUserIdSet = new Set(oldPlayers.map(p => p.userId).filter(Boolean));
        const newUserIdSet = new Set(newPlayers.map(p => p.userId).filter(Boolean));

        // 삭제된 플레이어: 이전에 있던 user_id가 새 명단에 없는 경우 (users는 시민권자이므로 유지)
        const removedUserIds = [...oldUserIdSet].filter(id => !newUserIdSet.has(id));
        const removeTables = isAdvancedLike
            ? ['cash_balance', 'estate_balance', 'success_factors', 'game_individual']
            : ['cash_balance', 'stock_balance', 'traits', 'game_individual'];
        for (const userId of removedUserIds) {
            for (const table of removeTables) {
                await _sb.from(table).delete().eq('game_id', gameId).eq('user_id', userId);
            }
        }

        // 추가된 플레이어: user_id가 아직 없는 행 — 닉네임으로 users 조회/생성 후 게임 테이블에 초기 레코드 삽입
        const addedPlayers = newPlayers.filter(p => !p.userId);
        if (addedPlayers.length > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const addedNicks = addedPlayers.map(p => _nick(p.nickname));

            const { data: existingUsers } = await _sb.from('users').select('user_id, nickname').in('nickname', addedNicks);
            const userIdByNick = new Map((existingUsers || []).map(u => [u.nickname, u.user_id]));

            const brandNewRows = addedPlayers
                .filter(p => !userIdByNick.has(_nick(p.nickname)))
                .map(p => ({
                    nickname:     _nick(p.nickname),
                    real_name:    p.realName || p.name || '',
                    join_date:    today,
                    is_citizen:   false,
                    default_efti: p.efti || 'FAEN',
                    status:       'active'
                }));
            if (brandNewRows.length > 0) {
                const { data: insertedUsers, error } = await _sb.from('users').insert(brandNewRows).select('user_id, nickname');
                if (error) console.error('[syncPlayerEdits] users insert', error);
                (insertedUsers || []).forEach(u => userIdByNick.set(u.nickname, u.user_id));
            }

            for (const p of addedPlayers) {
                p.userId = userIdByNick.get(_nick(p.nickname)) || null;
            }

            const cashRows = addedPlayers.map(p => ({
                game_id: gameId, user_id: p.userId,
                bill_100: 0, bill_500: 0, bill_1000: 0,
                bill_5000: 0, bill_10000: 0, bill_50000: 0
            }));
            await _sb.from('cash_balance').upsert(cashRows, { onConflict: 'game_id,user_id' });

            if (isAdvancedLike) {
                const estateRows = addedPlayers.map(p => ({
                    game_id: gameId, user_id: p.userId,
                    gaongaemi: 0, nurigoyangi: 0, damiwonsungi: 0,
                    marusuri: 0, chorongbungi: 0, haniyuwoo: 0
                }));
                await _sb.from('estate_balance').upsert(estateRows, { onConflict: 'game_id,user_id' });
                await sbSaveSuccessFactors(gameId, addedPlayers);
            } else {
                const stockRows = addedPlayers.map(p => ({
                    game_id: gameId, user_id: p.userId,
                    sasung: 0, lgi: 0, skei: 0, cacao: 0, hyunde: 0, naber: 0
                }));
                await _sb.from('stock_balance').upsert(stockRows, { onConflict: 'game_id,user_id' });
                await sbSaveTraits(gameId, addedPlayers);
            }

            const indivRows = addedPlayers.map(p => ({
                user_id:          p.userId,
                real_name:        p.realName || p.name || '',
                total_asset:      0,
                cash:             0,
                stock:            0,
                diligence_reward: 0,
                game_id:          gameId,
                team_id:          p.teamId || null
            }));
            await _sb.from('game_individual').upsert(indivRows, { onConflict: 'game_id,user_id' });
        }

        // 유지된 플레이어: 닉네임/이름/팀 변경 반영 — user_id가 그대로이므로 자산 테이블은 손댈 필요 없음
        const keptPlayers = newPlayers.filter(p => p.userId && oldUserIdSet.has(p.userId));
        for (const p of keptPlayers) {
            const old = oldPlayers.find(op => op.userId === p.userId);
            if (!old) continue;
            const nicknameChanged = _nick(old.nickname) !== _nick(p.nickname);
            const realNameChanged = (old.realName || old.name) !== (p.realName || p.name);
            const teamChanged     = old.teamId !== p.teamId;

            if (realNameChanged || teamChanged) {
                await _sb.from('game_individual')
                    .update({ real_name: p.realName || p.name || '', team_id: p.teamId || null })
                    .eq('game_id', gameId).eq('user_id', p.userId);
            }
            if (nicknameChanged || realNameChanged) {
                await _sb.from('users')
                    .update({
                        ...(nicknameChanged ? { nickname: _nick(p.nickname) } : {}),
                        ...(realNameChanged ? { real_name: p.realName || p.name || '' } : {})
                    })
                    .eq('user_id', p.userId);
            }
        }

        // game_info 인원수 업데이트
        await _sb.from('game_info')
            .update({ player_count: newPlayers.length })
            .eq('game_id', gameId);

        // 팀 모드: game_team upsert + 삭제된 팀 제거
        if (currentMode === 'team') {
            const oldTeamIds = new Set(oldPlayers.map(p => p.teamId).filter(Boolean));
            const newTeamMap = {};
            newPlayers.forEach(p => {
                if (!p.teamId) return;
                if (!newTeamMap[p.teamId]) newTeamMap[p.teamId] = { name: p.team || '' };
            });
            for (const [tid, t] of Object.entries(newTeamMap)) {
                await _sb.from('game_team').upsert({
                    team_id:   tid,
                    game_id:   gameId,
                    team_name: t.name
                }, { onConflict: 'team_id' });
            }
            const removedTeamIds = [...oldTeamIds].filter(tid => !newTeamMap[tid]);
            for (const tid of removedTeamIds) {
                await _sb.from('game_team').delete().eq('team_id', tid).eq('game_id', gameId);
            }
        }
    }
```

- [ ] **Step 4: 수동 검증 (이번 리팩토링의 핵심 회귀 시나리오)**

스테이징에서: 개인 모드 게임 생성 → 임의 플레이어 자산 입력 → 참가자 편집 모달에서 그 플레이어의 닉네임만 변경 후 저장 → `cash_balance`/`stock_balance`에서 해당 `user_id` 행의 자산 값이 변경 전과 동일하게 유지되는지, `users.nickname`만 바뀌었는지 SQL Editor로 확인:

```sql
SELECT u.nickname, cb.* FROM cash_balance cb JOIN users u ON u.user_id = cb.user_id WHERE cb.game_id = '<game_id>';
```

Expected: 닉네임은 바뀌었지만 `bill_*` 값들은 변경 전 그대로.

- [ ] **Step 5: 커밋**

```bash
git add js/counting.js
git commit -m "fix: 참가자 편집을 user_id 식별 기반으로 재작성해 닉네임 변경 시 자산 초기화 문제 해결"
```

---

## Task 15: `js/report.js` — `_loadPastGame` 재편집 로드 전환

**Files:**
- Modify: `js/report.js:1216-1330` 부근 (`_loadPastGame`)

- [ ] **Step 1: player 객체 재구성 시 `userId` 포함**

`js/report.js:1226-1248`:
```js
            players = data.history.map((p, index) => {
                const nameValue = p.real_name || 'Unknown';
                return {
                    id: index,
                    gameId: p.game_id || null,
                    nickname: p.nickname || '',
                    realName: nameValue,
                    name: nameValue,
                    efti: p.efti || '-',
                    team: p.team || '-',
                    teamId: p.team_id || null,
                    assets: p.assets || (typeof initAssets === 'function' ? initAssets() : {}),
                    total: Number(p.total_asset) || 0,
                    manualCash: Number(p.cash) || 0,
                    diligenceReward: Number(p.diligence_reward) || 0,
                    questReward:     Number(p.quest_reward)     || 0,
                    depositReward:   Number(p.deposit_reward)   || 0,
                    rankIndiv: 0,
                    rankTeam: 0,
                    teamTotal: 0,
                    traits: p.traits || (typeof initTraitsState === 'function' ? initTraitsState() : {})
                };
            });
```
→
```js
            players = data.history.map((p, index) => {
                const nameValue = p.real_name || 'Unknown';
                return {
                    id: index,
                    gameId: p.game_id || null,
                    userId: p.user_id || null,
                    nickname: p.nickname || '',
                    realName: nameValue,
                    name: nameValue,
                    efti: p.efti || '-',
                    team: p.team || '-',
                    teamId: p.team_id || null,
                    assets: p.assets || (typeof initAssets === 'function' ? initAssets() : {}),
                    total: Number(p.total_asset) || 0,
                    manualCash: Number(p.cash) || 0,
                    diligenceReward: Number(p.diligence_reward) || 0,
                    questReward:     Number(p.quest_reward)     || 0,
                    depositReward:   Number(p.deposit_reward)   || 0,
                    rankIndiv: 0,
                    rankTeam: 0,
                    teamTotal: 0,
                    traits: p.traits || (typeof initTraitsState === 'function' ? initTraitsState() : {})
                };
            });
```

- [ ] **Step 2: 잔고/특성/성공요소 로드를 `userId` 기준으로 수정**

`js/report.js:1271-1291`:
```js
            await Promise.all(players.map(async p => {
                if (!p.gameId) { console.warn(`  no gameId: ${p.nickname}`); return; }
                if (gameVariant !== 'basic') {
                    const estates = await sbLoadEstateBalance(p.nickname, p.gameId);
                    if (estates) {
                        Object.assign(p.assets, estates);
                        const base = (p.manualCash || 0) + calcEstate(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
                        p.total = base * calcSuccessMultiplier(p.successFactors || {});
                    } else {
                        console.warn(`  no estate balance: ${p.nickname}`);
                    }
                } else {
                    const stocks = await sbLoadUserBalance(p.nickname, p.gameId);
                    if (stocks) {
                        Object.assign(p.assets, stocks);
                        p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
                    } else {
                        console.warn(`  no stock balance: ${p.nickname}`);
                    }
                }
            }));
```
→
```js
            await Promise.all(players.map(async p => {
                if (!p.gameId) { console.warn(`  no gameId: ${p.nickname}`); return; }
                if (gameVariant !== 'basic') {
                    const estates = await sbLoadEstateBalance(p.userId, p.gameId);
                    if (estates) {
                        Object.assign(p.assets, estates);
                        const base = (p.manualCash || 0) + calcEstate(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
                        p.total = base * calcSuccessMultiplier(p.successFactors || {});
                    } else {
                        console.warn(`  no estate balance: ${p.nickname}`);
                    }
                } else {
                    const stocks = await sbLoadUserBalance(p.userId, p.gameId);
                    if (stocks) {
                        Object.assign(p.assets, stocks);
                        p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
                    } else {
                        console.warn(`  no stock balance: ${p.nickname}`);
                    }
                }
            }));
```

`js/report.js:1294-1324`:
```js
            try {
                if (gameVariant !== 'basic') {
                    const sfData = await sbLoadSuccessFactorsByGameId(gameId);
                    if (sfData.success && Array.isArray(sfData.factors)) {
                        const sfMap = {};
                        sfData.factors.forEach(f => { sfMap[f.nickname] = f; });
                        players.forEach(p => {
                            const f = sfMap[p.nickname];
                            if (f) p.successFactors = {
                                financial_management: !!f.financial_management,
                                communication:        !!f.communication,
                                critical_thinking:    !!f.critical_thinking,
                                global_economy:       !!f.global_economy,
                                credit_trust:         !!f.credit_trust,
                                entrepreneurship:     !!f.entrepreneurship,
                            };
                        });
                    }
                } else {
                    const traitsData = await sbLoadTraitsByGameId(gameId);
                    if (traitsData.success && Array.isArray(traitsData.traits)) {
                        const traitsMap = {};
                        traitsData.traits.forEach(t => { traitsMap[t.nickname] = t; });
                        players.forEach(p => {
                            const t = traitsMap[p.nickname];
                            if (t) p.traits = { diligent: !!t.diligent, saving: !!t.saving, invest: !!t.invest, career: !!t.career, luck: !!t.luck, adventure: !!t.adventure };
                        });
                    }
                }
            } catch(e) { console.warn("[loadTraitsOrFactors] 실패:", e); }
```
→
```js
            try {
                if (gameVariant !== 'basic') {
                    const sfData = await sbLoadSuccessFactorsByGameId(gameId);
                    if (sfData.success && Array.isArray(sfData.factors)) {
                        const sfMap = {};
                        sfData.factors.forEach(f => { sfMap[f.user_id] = f; });
                        players.forEach(p => {
                            const f = sfMap[p.userId];
                            if (f) p.successFactors = {
                                financial_management: !!f.financial_management,
                                communication:        !!f.communication,
                                critical_thinking:    !!f.critical_thinking,
                                global_economy:       !!f.global_economy,
                                credit_trust:         !!f.credit_trust,
                                entrepreneurship:     !!f.entrepreneurship,
                            };
                        });
                    }
                } else {
                    const traitsData = await sbLoadTraitsByGameId(gameId);
                    if (traitsData.success && Array.isArray(traitsData.traits)) {
                        const traitsMap = {};
                        traitsData.traits.forEach(t => { traitsMap[t.user_id] = t; });
                        players.forEach(p => {
                            const t = traitsMap[p.userId];
                            if (t) p.traits = { diligent: !!t.diligent, saving: !!t.saving, invest: !!t.invest, career: !!t.career, luck: !!t.luck, adventure: !!t.adventure };
                        });
                    }
                }
            } catch(e) { console.warn("[loadTraitsOrFactors] 실패:", e); }
```

- [ ] **Step 2: 수동 검증**

스테이징에서 저장된 과거 게임을 "과거 데이터 불러오기"로 재편집 모드에 로드 → 자산/특성(또는 성공요소)이 정상적으로 표시되는지, 이후 참가자 편집(Task 14)으로 닉네임을 바꿔도 문제없는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add js/report.js
git commit -m "feat: 과거 게임 재편집 로드를 user_id 기준으로 전환"
```

---

## Task 16: `js/bank.js` 호출부 전환

**Files:**
- Modify: `js/bank.js:517-523` (`_bankSaveReward`)
- Modify: `js/bank.js:526-552` (`_bankSubmitIndividual`)
- Modify: `js/bank.js:554-600`대 (`_bankSubmitTeam`)
- Modify: `js/bank.js:638-667` (`bankAdvanceRound` 미완료 팀 처리 부분)
- Modify: `js/bank.js:721-749` (`bankResetEntry`)
- Modify: `js/bank.js:787-943` (`_bankMergeRemoteState`)

- [ ] **Step 1: `_bankSaveReward`에 `userId` 파라미터 추가**

```js
function _bankSaveReward(nickname, userId, source, amount) {
    if (source === 'team') _bank.teamRewards[nickname] = amount;
    else                   _bank.indivRewards[nickname] = amount;
    const total = (_bank.prevRoundsTotal[nickname] || 0)
                + (_bank.teamRewards[nickname]   || 0)
                + (_bank.indivRewards[nickname]  || 0);
    sbSaveDepositReward(_bank.gameId, userId, total).catch(console.error);
}
```

- [ ] **Step 2: `_bankSubmitIndividual`의 호출부 수정**

`js/bank.js:531, 533`:
```js
    _bankSaveReward(p.nickname, 'indiv', maturity);
    _bank.indivCompleted[_bank.currentPlayerIdx] = { type, amount };
    sbUpsertBankHistory(_bank.gameId, p.nickname, _bank.currentRound, type, amount, maturity, false);
```
→
```js
    _bankSaveReward(p.nickname, p.user_id, 'indiv', maturity);
    _bank.indivCompleted[_bank.currentPlayerIdx] = { type, amount };
    sbUpsertBankHistory(_bank.gameId, p.user_id, _bank.currentRound, type, amount, maturity, false);
```

- [ ] **Step 3: `_bankSubmitTeam`의 호출부 수정**

`js/bank.js:561`:
```js
    sbUpsertBankHistory(_bank.gameId, p.nickname, _bank.currentRound, type, amount, 0, true);
```
→
```js
    sbUpsertBankHistory(_bank.gameId, p.user_id, _bank.currentRound, type, amount, 0, true);
```

`js/bank.js:576-586`:
```js
        teamMembers.forEach(pl => {
            const memberIdx = _bank.players.findIndex(x => x === pl);
            const memberPrincipal = td.members[memberIdx] || 0;
            _bankSaveReward(pl.nickname, 'team', memberPrincipal + perMemberReward);
        });
        teamMembers.forEach(pl => {
            const memberIdx = _bank.players.findIndex(x => x === pl);
            const memberPrincipal = td.members[memberIdx] || 0;
            const memberMatured = memberPrincipal + perMemberReward;
            sbUpsertBankHistory(_bank.gameId, pl.nickname, _bank.currentRound, type, memberPrincipal, memberMatured, true);
        });
```
→
```js
        teamMembers.forEach(pl => {
            const memberIdx = _bank.players.findIndex(x => x === pl);
            const memberPrincipal = td.members[memberIdx] || 0;
            _bankSaveReward(pl.nickname, pl.user_id, 'team', memberPrincipal + perMemberReward);
        });
        teamMembers.forEach(pl => {
            const memberIdx = _bank.players.findIndex(x => x === pl);
            const memberPrincipal = td.members[memberIdx] || 0;
            const memberMatured = memberPrincipal + perMemberReward;
            sbUpsertBankHistory(_bank.gameId, pl.user_id, _bank.currentRound, type, memberPrincipal, memberMatured, true);
        });
```

- [ ] **Step 4: `bankAdvanceRound`의 미완료 팀 원금 반환 부분 수정**

`js/bank.js:659-665`:
```js
            for (const [memberIdxStr, amount] of Object.entries(td.members)) {
                const pl = _bank.players[parseInt(memberIdxStr)];
                if (pl) {
                    _bankSaveReward(pl.nickname, 'team', amount);
                    sbUpsertBankHistory(_bank.gameId, pl.nickname, _bank.currentRound, td.type, amount, amount, true);
                }
            }
```
→
```js
            for (const [memberIdxStr, amount] of Object.entries(td.members)) {
                const pl = _bank.players[parseInt(memberIdxStr)];
                if (pl) {
                    _bankSaveReward(pl.nickname, pl.user_id, 'team', amount);
                    sbUpsertBankHistory(_bank.gameId, pl.user_id, _bank.currentRound, td.type, amount, amount, true);
                }
            }
```

- [ ] **Step 5: `bankResetEntry` 재작성**

`js/bank.js:721-749` 전체를 아래로 교체:

```js
async function bankResetEntry(playerIdx) {
    const p = _bank.players[playerIdx];
    if (!p || !_bank.gameId) return;
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    if (!confirm('이 항목의 예금 신청 내역을 삭제하시겠습니까?')) return;

    let members, isTeam;
    if (isTeamTab) {
        members = _bank.players.filter(pl => pl.team_name === p.team_name);
        isTeam = true;
    } else {
        members = [p];
        isTeam = false;
    }

    const userIds = members.map(pl => pl.user_id);
    const result = await sbDeleteBankHistoryEntries(_bank.gameId, userIds, _bank.currentRound, isTeam);
    if (!result.success) { alert('초기화에 실패했습니다.'); return; }

    await _bankPollAndMerge();

    for (const pl of members) {
        const total = (_bank.prevRoundsTotal[pl.nickname] || 0)
                    + (_bank.teamRewards[pl.nickname]   || 0)
                    + (_bank.indivRewards[pl.nickname]  || 0);
        sbSaveDepositReward(_bank.gameId, pl.user_id, total).catch(console.error);
    }
}
```

- [ ] **Step 6: `_bankMergeRemoteState` 재작성 — DB 행 매칭을 `user_id` 기준으로**

`js/bank.js:787-946` 전체를 아래로 교체 (in-memory 딕셔너리 키는 기존과 동일하게 `nickname`을 계속 사용하되, DB 행과의 매칭만 `user_id`로 먼저 플레이어를 찾은 뒤 그 플레이어의 `nickname`을 키로 쓴다):

```js
function _bankMergeRemoteState(state, history) {
    // 배율 동기화
    _bank.settings.long  = state.long_ratio;
    _bank.settings.mid   = state.mid_ratio;
    _bank.settings.short = state.short_ratio;
    _bank.teamSettings.long  = state.team_long_ratio;
    _bank.teamSettings.mid   = state.team_mid_ratio;
    _bank.teamSettings.short = state.team_short_ratio;

    const remoteRound = state.current_round ?? 1;

    // 라운드 전환 감지: 원격과 로컬이 다르면 동기화 (전진 및 후퇴 모두 처리)
    if (remoteRound !== _bank.currentRound) {
        _bank.currentRound   = remoteRound;
        _bank.indivCompleted = {};
        _bank.teamDeposits   = {};
        _bank.teamRewards    = {};
        _bank.indivRewards   = {};
    }

    const findPlayer = (userId) => _bank.players.find(p => p.user_id === userId);

    // prevRoundsTotal: 현재 라운드 미만 행의 matured_amount 합산
    const prevTotals = {};
    history.filter(r => r.round_num < _bank.currentRound).forEach(r => {
        const pl = findPlayer(r.user_id);
        if (!pl) return;
        prevTotals[pl.nickname] = (prevTotals[pl.nickname] || 0) + (r.matured_amount || 0);
    });
    _bank.prevRoundsTotal = prevTotals;

    // 현재 라운드 행으로 indivCompleted / teamDeposits 재구성
    _bank.indivCompleted = {};
    _bank.teamDeposits   = {};
    _bank.playerTypeTags = {};
    _bank.teamTypeTags   = {};

    // 팀 완료 라운드 사전 계산 (팀 전원 신청한 경우만 뱃지 부여)
    const _teamRoundCounts = {};
    history.filter(h => h.is_team).forEach(h => {
        const pl = findPlayer(h.user_id);
        if (!pl || !pl.team_name) return;
        const key = `${pl.team_name}|${h.round_num}`;
        _teamRoundCounts[key] = (_teamRoundCounts[key] || 0) + 1;
    });
    const _completedTeamRounds = new Set(
        Object.entries(_teamRoundCounts)
            .filter(([key, cnt]) => cnt >= _bank.players.filter(p => p.team_name === key.split('|')[0]).length)
            .map(([key]) => key)
    );

    // 타입 태그는 전체 라운드에서 누적 (팀은 전원 완료된 라운드만)
    history.forEach(r => {
        const player = findPlayer(r.user_id);
        if (!player) return;
        if (!r.is_team) {
            if (!_bank.playerTypeTags[player.nickname]) _bank.playerTypeTags[player.nickname] = [];
            if (!_bank.playerTypeTags[player.nickname].includes(r.deposit_type)) {
                _bank.playerTypeTags[player.nickname].push(r.deposit_type);
            }
        } else {
            const teamName = player.team_name;
            if (!teamName || !_completedTeamRounds.has(`${teamName}|${r.round_num}`)) return;
            if (!_bank.teamTypeTags[teamName]) _bank.teamTypeTags[teamName] = [];
            if (!_bank.teamTypeTags[teamName].includes(r.deposit_type)) {
                _bank.teamTypeTags[teamName].push(r.deposit_type);
            }
        }
    });

    const currentRows = history.filter(r => r.round_num === _bank.currentRound);
    currentRows.forEach(r => {
        const idx = _bank.players.findIndex(p => p.user_id === r.user_id);
        if (idx === -1) return;

        if (!r.is_team) {
            _bank.indivCompleted[idx] = { type: r.deposit_type, amount: r.amount };
        } else {
            const teamName = _bank.players[idx].team_name;
            if (!teamName) return;
            if (!_bank.teamDeposits[teamName]) {
                _bank.teamDeposits[teamName] = { type: r.deposit_type, members: {} };
            }
            _bank.teamDeposits[teamName].members[idx] = r.amount;
        }
    });

    // 현재 라운드 matured_amount에서 indivRewards / teamRewards 재구성
    _bank.indivRewards = {};
    _bank.teamRewards  = {};
    currentRows.forEach(r => {
        if (!r.matured_amount) return;
        const pl = findPlayer(r.user_id);
        if (!pl) return;
        if (!r.is_team) {
            _bank.indivRewards[pl.nickname] = r.matured_amount;
        } else {
            _bank.teamRewards[pl.nickname] = r.matured_amount;
        }
    });

    // roundSnapshots 재구성: history 기반으로 각 완료 라운드의 스냅샷 복원
    _bank.roundSnapshots = [];
    for (let rNum = 1; rNum < _bank.currentRound; rNum++) {
        const roundRows = history.filter(h => h.round_num === rNum);
        const snap = {
            round:          rNum,
            indivCompleted: {},
            teamDeposits:   {},
            indivRewards:   {},
            teamRewards:    {},
            prevRoundsTotal:{},
            playerTypeTags: {},
            teamTypeTags:   {},
        };
        history.filter(h => h.round_num < rNum).forEach(h => {
            const pl = findPlayer(h.user_id);
            if (!pl) return;
            snap.prevRoundsTotal[pl.nickname] = (snap.prevRoundsTotal[pl.nickname] || 0) + (h.matured_amount || 0);
        });
        roundRows.forEach(h => {
            const idx = _bank.players.findIndex(p => p.user_id === h.user_id);
            if (idx === -1) return;
            const pl = _bank.players[idx];
            if (!h.is_team) {
                snap.indivCompleted[idx] = { type: h.deposit_type, amount: h.amount };
                if (h.matured_amount) snap.indivRewards[pl.nickname] = h.matured_amount;
            } else {
                const teamName = pl.team_name;
                if (!teamName) return;
                if (!snap.teamDeposits[teamName]) snap.teamDeposits[teamName] = { type: h.deposit_type, members: {} };
                snap.teamDeposits[teamName].members[idx] = h.amount;
                if (h.matured_amount) snap.teamRewards[pl.nickname] = h.matured_amount;
            }
        });
        const snapTeamRoundCounts = {};
        history.filter(h => h.is_team && h.round_num <= rNum).forEach(h => {
            const pl = findPlayer(h.user_id);
            if (!pl || !pl.team_name) return;
            const key = `${pl.team_name}|${h.round_num}`;
            snapTeamRoundCounts[key] = (snapTeamRoundCounts[key] || 0) + 1;
        });
        const snapCompletedTeamRounds = new Set(
            Object.entries(snapTeamRoundCounts)
                .filter(([key, cnt]) => cnt >= _bank.players.filter(p => p.team_name === key.split('|')[0]).length)
                .map(([key]) => key)
        );

        history.filter(h => h.round_num <= rNum).forEach(h => {
            const player = findPlayer(h.user_id);
            if (!player) return;
            if (!h.is_team) {
                if (!snap.playerTypeTags[player.nickname]) snap.playerTypeTags[player.nickname] = [];
                if (!snap.playerTypeTags[player.nickname].includes(h.deposit_type)) snap.playerTypeTags[player.nickname].push(h.deposit_type);
            } else {
                const teamName = player.team_name;
                if (!teamName || !snapCompletedTeamRounds.has(`${teamName}|${h.round_num}`)) return;
                if (!snap.teamTypeTags[teamName]) snap.teamTypeTags[teamName] = [];
                if (!snap.teamTypeTags[teamName].includes(h.deposit_type)) snap.teamTypeTags[teamName].push(h.deposit_type);
            }
        });
        _bank.roundSnapshots.push(snap);
    }

    // 배율 UI 반영 (View 1 모달이 열려 있을 때)
    _bankSyncRatioUI();
}
```

- [ ] **Step 7: 수동 검증**

스테이징에서 은행 화면 진입 → 개인/팀 각각 예금 신청 → 새로고침(폴링 재조회) 후 신청 내역/보상/타입 뱃지가 그대로 복원되는지 확인. 개별 초기화 버튼도 눌러 정상 삭제되는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bank.js 호출부를 user_id 기준으로 전환"
```

---

## Task 17: `js/quiz.js` 호출부 전환

**Files:**
- Modify: `js/quiz.js:219-222` (`_quizSaveReward`)
- Modify: `js/quiz.js:636-696` (정답/오답 처리부)
- Modify: `js/quiz.js:741-764` (`quizResetEntry`)
- Modify: `js/quiz.js:799-875` (`_quizMergeRemoteState`)

- [ ] **Step 1: `_quizSaveReward`에 `userId` 파라미터 추가**

```js
function _quizSaveReward(nickname, userId, amount) {
    _quiz.earnedRewards[nickname] = (_quiz.earnedRewards[nickname] || 0) + amount;
    sbSaveQuestReward(_quiz.gameId, userId, _quiz.earnedRewards[nickname]).catch(console.error);
}
```

- [ ] **Step 2: 정답/오답 처리부 수정**

`js/quiz.js:647`:
```js
            sbUpsertQuizHistory(_quiz.gameId, p.nickname, { team_answered: true });
```
→
```js
            sbUpsertQuizHistory(_quiz.gameId, p.user_id, { team_answered: true });
```

`js/quiz.js:651-654`:
```js
                for (const pidx of _quiz.teamPlayers[p.team_name]) {
                    const nick = _quiz.players[pidx].nickname;
                    _quizSaveReward(nick, _quiz.teamReward);
                }
```
→
```js
                for (const pidx of _quiz.teamPlayers[p.team_name]) {
                    const teammate = _quiz.players[pidx];
                    _quizSaveReward(teammate.nickname, teammate.user_id, _quiz.teamReward);
                }
```

`js/quiz.js:664-665`:
```js
            sbUpsertQuizHistory(_quiz.gameId, p.nickname, { indiv_progress: _quiz.progress[_quiz.currentPlayerIdx], indiv_failed_at: null });
            _quizSaveReward(p.nickname, _quiz.reward);
```
→
```js
            sbUpsertQuizHistory(_quiz.gameId, p.user_id, { indiv_progress: _quiz.progress[_quiz.currentPlayerIdx], indiv_failed_at: null });
            _quizSaveReward(p.nickname, p.user_id, _quiz.reward);
```

`js/quiz.js:689`:
```js
                    sbUpsertQuizHistory(_quiz.gameId, pl.nickname, { team_failed_at: failIso });
```
→
```js
                    sbUpsertQuizHistory(_quiz.gameId, pl.user_id, { team_failed_at: failIso });
```

`js/quiz.js:694`:
```js
            sbUpsertQuizHistory(_quiz.gameId, p.nickname, { indiv_failed_at: new Date().toISOString() });
```
→
```js
            sbUpsertQuizHistory(_quiz.gameId, p.user_id, { indiv_failed_at: new Date().toISOString() });
```

- [ ] **Step 3: `quizResetEntry` 재작성**

`js/quiz.js:741-764` 전체를 아래로 교체:

```js
async function quizResetEntry(playerIdx) {
    const p = _quiz.players[playerIdx];
    if (!p || !_quiz.gameId) return;
    const isTeamTab = _quiz.gameType === 'team' && _quiz.viewMode === 'team' && !!p.team_name;

    if (!confirm('이 항목의 퀴즈 내역을 삭제하시겠습니까?')) return;

    let members;
    if (isTeamTab) {
        members = _quiz.players.filter(pl => pl.team_name === p.team_name);
    } else {
        members = [p];
    }

    const userIds = members.map(pl => pl.user_id);
    const result = await sbDeleteQuizHistoryEntries(_quiz.gameId, userIds);
    if (!result.success) { alert('초기화에 실패했습니다.'); return; }

    await _quizPollAndMerge();

    for (const pl of members) {
        sbSaveQuestReward(_quiz.gameId, pl.user_id, _quiz.earnedRewards[pl.nickname] || 0).catch(console.error);
    }
}
```

- [ ] **Step 4: `_quizMergeRemoteState` 재작성**

`js/quiz.js:799-875` 전체를 아래로 교체:

```js
function _quizMergeRemoteState(state, history) {
    // 보상 동기화
    _quiz.reward     = state.indiv_reward  ?? 0;
    _quiz.teamReward = state.team_reward   ?? 0;
    _quiz.isClosed   = !!(state.is_closed);

    // 상태 재구성
    _quiz.progress         = {};
    _quiz.cooldowns        = {};
    _quiz.teamProgress     = {};
    _quiz.teamPlayers      = {};
    _quiz.teamPlayerCooldowns = {};
    _quiz.earnedRewards    = {};

    const now = Date.now();

    history.forEach(r => {
        const idx = _quiz.players.findIndex(p => p.user_id === r.user_id);
        if (idx === -1) return;
        const player = _quiz.players[idx];

        // 개인탭 진행도
        if (r.indiv_progress) {
            _quiz.progress[idx] = r.indiv_progress;
        }

        // 개인탭 쿨다운
        if (r.indiv_failed_at) {
            const ts = new Date(r.indiv_failed_at).getTime();
            if (now - ts < _QUIZ_COOLDOWN_MS) {
                _quiz.cooldowns[idx] = ts;
            }
        }

        // 팀탭 정답
        if (r.team_answered) {
            const team = player.team_name;
            if (team) {
                if (!_quiz.teamPlayers[team]) _quiz.teamPlayers[team] = new Set();
                _quiz.teamPlayers[team].add(idx);
                _quiz.teamProgress[team] = (_quiz.teamProgress[team] || 0) + 1;
            }
        }

        // 팀탭 쿨다운
        if (r.team_failed_at) {
            const ts = new Date(r.team_failed_at).getTime();
            if (now - ts < _QUIZ_COOLDOWN_MS) {
                _quiz.teamPlayerCooldowns[idx] = ts;
            }
        }
    });

    // 팀 완료 여부를 모두 집계한 뒤 보상 역산 (팀원 전체 정답 시에만 팀 보상 반영)
    history.forEach(r => {
        const idx = _quiz.players.findIndex(p => p.user_id === r.user_id);
        if (idx === -1) return;
        const player = _quiz.players[idx];

        const earnedIndiv = (r.indiv_progress || 0) * _quiz.reward;
        let earnedTeam = 0;
        if (r.team_answered) {
            const team = player.team_name;
            if (team) {
                if ((_quiz.teamProgress[team] || 0) >= 2) {
                    earnedTeam = _quiz.teamReward;
                }
            }
        }
        if (earnedIndiv + earnedTeam > 0) {
            _quiz.earnedRewards[player.nickname] = earnedIndiv + earnedTeam;
        }
    });

    // 보상 뱃지 UI 반영
    _quizUpdateRewardBadge();
}
```

- [ ] **Step 5: 수동 검증**

스테이징에서 퀴즈 화면 진입 → 개인/팀 각각 정답·오답 처리 → 새로고침 후 진행도/쿨다운/보상이 정상 복원되는지, 개별 초기화가 정상 동작하는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add js/quiz.js
git commit -m "feat: quiz.js 호출부를 user_id 기준으로 전환"
```

---

## Task 18: 전체 수동 회귀 테스트 (스테이징)

**Files:** 없음

- [ ] **Step 1: 개인 모드 전체 플로우**

스테이징 환경에서: 게임 생성(개인 모드, basic) → 자산 입력 → 은행 예금 1~3라운드 진행 → 퀴즈 진행 → 참가자 편집에서 닉네임 변경 → 보고서 화면에서 순위/자산 확인 → 저장(`saveToDrive`) → 명예의 전당에서 정상 표시되는지 확인.

- [ ] **Step 2: 팀 모드 전체 플로우**

동일 플로우를 팀 모드로 반복. 특히 참가자 편집에서 팀원 닉네임 변경 후 팀 합계가 유지되는지, 명예의 전당 팀 순위/멤버 목록이 정상인지 확인.

- [ ] **Step 3: advanced/rich_vessel 변형 확인**

`advanced` 또는 `rich_vessel` 변형으로 위 플로우를 한 번 더 반복 (부동산/성공요소 경로).

- [ ] **Step 4: 시민권자 삭제 확인**

시민권자 DB에서 게임에 참여했던 시민권자를 삭제 → 관련 8개 테이블에 잔여 데이터가 없는지 확인 (Task 11 Step 2 쿼리 재사용).

- [ ] **Step 5: 과거 게임 재편집 확인**

이전에 저장된 게임을 "과거 데이터 불러오기"로 열어 자산/특성/보상이 정상 표시되는지, 재편집 후 다시 저장했을 때 값이 유지되는지 확인.

이 Task는 커밋할 코드 변경이 없다 — 문제 발견 시 해당 Task로 돌아가 수정하고 새 커밋을 추가한다.

---

## Task 19: 배포 (마이그레이션 프로덕션 적용 + 코드 푸시) — 게이트

**Files:** 없음

> ⚠️ 이 Task는 실제 게임 행사가 없는 시점에, 사용자 확인 후 진행한다.

- [ ] **Step 1: 사용자에게 배포 시점 확인**

"지금 프로덕션에 마이그레이션 + 코드를 배포해도 되는지" 확인을 받는다.

- [ ] **Step 2: 프로덕션 마이그레이션 적용**

Task 3 Step 1의 고아 데이터 확인 쿼리를 프로덕션에서 다시 실행해 0건임을 재확인한 뒤:

```bash
npx supabase db push
```

- [ ] **Step 3: 코드 푸시**

```bash
git push origin refactor/db-schema-redesign
```

이후 CLAUDE.md의 배포 규칙에 따라 main으로 병합/푸시.

- [ ] **Step 4: 프로덕션 스모크 테스트**

실제 프로덕션 URL에서 새 게임 하나를 생성해 자산 입력이 정상 저장되는지 빠르게 확인.
