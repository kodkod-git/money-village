# 은행·퀴즈 멀티-태블릿 동기화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여러 태블릿이 동일 game_id로 접속할 때, 은행 예금 신청·라운드 전환·퀴즈 진행이 3–5초 이내에 모든 기기에 동기화된다.

**Architecture:** 폴링(3초 interval) + Supabase upsert. 상태 변경 시 즉시 DB 기록, 각 기기는 주기적으로 fetch해 로컬 `_bank`/`_quiz` 객체를 재구성한다. 신규 테이블 4개(`bank_state`, `bank_history`, `quiz_state`, `quiz_history`)가 단일 진실 출처 역할을 한다.

**Tech Stack:** Supabase JS Client (브라우저 전용 `_sb`), Vanilla JS, 테스트는 브라우저 수동 검증

---

## 파일 구조

| 파일 | 변경 내용 |
|---|---|
| Supabase 대시보드 | 테이블 4개 생성 + RLS 정책 (Task 1) |
| `js/supabase-client.js` | 동기화 전용 함수 8개 추가 (Tasks 2–3) |
| `js/bank.js` | 쓰기 훅 + 폴링 레이어 (Tasks 4–7) |
| `js/quiz.js` | 쓰기 훅 + 폴링 레이어 (Tasks 8–10) |
| `js/app.js` | `switchScreen()`에 sync 시작/중지 훅 (Task 11) |

---

## Task 1: Supabase 테이블 4개 생성 (수동)

**Files:**
- Supabase 대시보드 → SQL Editor

- [ ] **Step 1: Supabase SQL Editor에서 아래 SQL 실행**

```sql
-- bank_state: 은행 설정 + 현재 라운드
CREATE TABLE bank_state (
  game_id          TEXT PRIMARY KEY,
  current_round    INT     NOT NULL DEFAULT 1,
  long_ratio       NUMERIC NOT NULL DEFAULT 2.0,
  mid_ratio        NUMERIC NOT NULL DEFAULT 1.5,
  short_ratio      NUMERIC NOT NULL DEFAULT 1.2,
  team_long_ratio  NUMERIC NOT NULL DEFAULT 2.5,
  team_mid_ratio   NUMERIC NOT NULL DEFAULT 2.0,
  team_short_ratio NUMERIC NOT NULL DEFAULT 1.5,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- bank_history: 예금 신청 내역 (라운드당 플레이어 1행)
CREATE TABLE bank_history (
  game_id        TEXT NOT NULL,
  nickname       TEXT NOT NULL,
  round_num      INT  NOT NULL,
  deposit_type   TEXT NOT NULL,
  amount         INT  NOT NULL DEFAULT 0,
  matured_amount INT  NOT NULL DEFAULT 0,
  team_name      TEXT,
  PRIMARY KEY (game_id, nickname, round_num)
);

-- quiz_state: 퀴즈 보상 설정
CREATE TABLE quiz_state (
  game_id      TEXT PRIMARY KEY,
  indiv_reward INT NOT NULL DEFAULT 0,
  team_reward  INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- quiz_history: 퀴즈 진행 상태 (플레이어당 1행)
CREATE TABLE quiz_history (
  game_id         TEXT    NOT NULL,
  nickname        TEXT    NOT NULL,
  indiv_progress  INT     NOT NULL DEFAULT 0,
  indiv_failed_at TIMESTAMPTZ,
  team_answered   BOOLEAN NOT NULL DEFAULT FALSE,
  team_failed_at  TIMESTAMPTZ,
  PRIMARY KEY (game_id, nickname)
);
```

- [ ] **Step 2: RLS 정책 설정 (동일 SQL Editor에서 실행)**

```sql
ALTER TABLE bank_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon all" ON bank_state   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon all" ON bank_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon all" ON quiz_state   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon all" ON quiz_history FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 3: 테이블 생성 확인**

Supabase 대시보드 → Table Editor에서 `bank_state`, `bank_history`, `quiz_state`, `quiz_history` 4개 테이블이 보이면 완료.

- [ ] **Step 4: 커밋**

```bash
git commit --allow-empty -m "chore: Supabase 동기화 테이블 4개 생성 (수동)"
```

---

## Task 2: supabase-client.js — bank 동기화 함수 4개

**Files:**
- Modify: `js/supabase-client.js` (파일 끝 `sbSaveQuestReward` 아래에 추가)

- [ ] **Step 1: `js/supabase-client.js` 파일 끝에 bank 동기화 함수 추가**

`sbSaveQuestReward` 함수 다음, 파일 맨 끝에 아래 블록 추가:

```javascript
// =========================================================
// 동기화: bank_state / bank_history
// =========================================================

async function sbGetBankState(gameId) {
    const { data } = await _sb.from('bank_state').select('*')
        .eq('game_id', gameId).maybeSingle();
    return data || null;
}

async function sbUpsertBankState(gameId, fields) {
    const { error } = await _sb.from('bank_state').upsert(
        { game_id: gameId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'game_id' }
    );
    if (error) console.error('[sbUpsertBankState]', error);
}

async function sbGetBankHistory(gameId) {
    const { data } = await _sb.from('bank_history').select('*')
        .eq('game_id', gameId);
    return data || [];
}

async function sbUpsertBankHistory(gameId, nickname, roundNum, depositType, amount, maturedAmount, teamName) {
    const { error } = await _sb.from('bank_history').upsert({
        game_id:        gameId,
        nickname:       nickname,
        round_num:      roundNum,
        deposit_type:   depositType,
        amount:         amount,
        matured_amount: maturedAmount,
        team_name:      teamName || null
    }, { onConflict: 'game_id,nickname,round_num' });
    if (error) console.error('[sbUpsertBankHistory]', error);
}
```

- [ ] **Step 2: 브라우저 콘솔에서 함수 접근 확인**

`index.html`을 브라우저에서 열고 개발자 콘솔(F12)에서:
```javascript
typeof sbGetBankState   // "function"
typeof sbUpsertBankState // "function"
```

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: bank 동기화 Supabase 함수 추가 (sbGetBankState 등 4개)"
```

---

## Task 3: supabase-client.js — quiz 동기화 함수 4개

**Files:**
- Modify: `js/supabase-client.js`

- [ ] **Step 1: Task 2에서 추가한 bank 블록 바로 아래에 quiz 동기화 함수 추가**

```javascript
// =========================================================
// 동기화: quiz_state / quiz_history
// =========================================================

async function sbGetQuizState(gameId) {
    const { data } = await _sb.from('quiz_state').select('*')
        .eq('game_id', gameId).maybeSingle();
    return data || null;
}

async function sbUpsertQuizState(gameId, fields) {
    const { error } = await _sb.from('quiz_state').upsert(
        { game_id: gameId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'game_id' }
    );
    if (error) console.error('[sbUpsertQuizState]', error);
}

async function sbGetQuizHistory(gameId) {
    const { data } = await _sb.from('quiz_history').select('*')
        .eq('game_id', gameId);
    return data || [];
}

async function sbUpsertQuizHistory(gameId, nickname, fields) {
    const { error } = await _sb.from('quiz_history').upsert(
        { game_id: gameId, nickname, ...fields },
        { onConflict: 'game_id,nickname' }
    );
    if (error) console.error('[sbUpsertQuizHistory]', error);
}
```

- [ ] **Step 2: 브라우저 콘솔 확인**

```javascript
typeof sbGetQuizState    // "function"
typeof sbUpsertQuizHistory // "function"
```

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: quiz 동기화 Supabase 함수 추가 (sbGetQuizState 등 4개)"
```

---

## Task 4: bank.js — 설정 완료·배율 조정 쓰기

**Files:**
- Modify: `js/bank.js`

- [ ] **Step 1: `js/bank.js` 파일 상단 `_bank` 객체 바로 아래에 디바운스 변수 추가**

`const _BANK_TYPE = {` 바로 위에 삽입:

```javascript
let _bankRatioDebounceTimer = null;

function _bankDebounceRatioSave() {
    clearTimeout(_bankRatioDebounceTimer);
    _bankRatioDebounceTimer = setTimeout(() => {
        if (!_bank.gameId) return;
        sbUpsertBankState(_bank.gameId, {
            long_ratio:       _bank.settings.long,
            mid_ratio:        _bank.settings.mid,
            short_ratio:      _bank.settings.short,
            team_long_ratio:  _bank.teamSettings.long,
            team_mid_ratio:   _bank.teamSettings.mid,
            team_short_ratio: _bank.teamSettings.short
        });
    }, 1000);
}
```

- [ ] **Step 2: `bankAdjustRatio()` 함수 끝에 디바운스 호출 추가**

`bankAdjustRatio` 함수의 마지막 줄 `document.getElementById(...).textContent = ...` 바로 다음에:

```javascript
function bankAdjustRatio(type, delta, isTeam = false) {
    const store  = isTeam ? _bank.teamSettings : _bank.settings;
    const prefix = isTeam ? 'bankTeam' : 'bank';
    const next = Math.round((store[type] + delta) * 10) / 10;
    if (next < 1.0) return;
    store[type] = next;
    document.getElementById(prefix + _bankCap(type) + 'RatioDisplay').textContent = next.toFixed(1) + '배';
    _bankDebounceRatioSave();
}
```

- [ ] **Step 3: `bankStep1Complete()` 내 플레이어 로드 성공 직후 bank_state 초기 upsert 추가**

`bankStep1Complete` 함수에서 `_bank.currentRound = 1;` 라인 바로 다음에 추가:

```javascript
// 기존 코드
_bank.indivCompleted  = {};
_bank.teamDeposits    = {};
_bank.teamRewards     = {};
_bank.indivRewards    = {};
_bank.prevRoundsTotal = {};
_bank.playerTypeTags  = {};
_bank.teamTypeTags    = {};
_bank.currentRound    = 1;
_bank.currentPlayerIdx = null;
_bank.viewMode        = 'team';

// 추가할 코드
sbUpsertBankState(_bank.gameId, {
    current_round:    1,
    long_ratio:       _bank.settings.long,
    mid_ratio:        _bank.settings.mid,
    short_ratio:      _bank.settings.short,
    team_long_ratio:  _bank.teamSettings.long,
    team_mid_ratio:   _bank.teamSettings.mid,
    team_short_ratio: _bank.teamSettings.short
}).catch(console.error);
```

- [ ] **Step 4: 브라우저에서 수동 검증**

1. `index.html` 열기 → 은행 모달에서 게임 선택 → 배율 조정 후 설정 완료
2. Supabase 대시보드 → `bank_state` 테이블 확인: 해당 game_id 행이 생성되고 배율값이 올바른지 확인

- [ ] **Step 5: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bank 설정 완료·배율 조정 시 bank_state DB 쓰기"
```

---

## Task 5: bank.js — 예금 신청 시 bank_history 쓰기

**Files:**
- Modify: `js/bank.js`

- [ ] **Step 1: `_bankSubmitIndividual()` 에 bank_history 쓰기 추가**

`_bankSubmitIndividual` 함수의 `_bankSaveReward(p.nickname, 'indiv', maturity);` 바로 다음에:

```javascript
function _bankSubmitIndividual(p, type, amount) {
    const ratio    = _bank.settings[type];
    const maturity = Math.round(amount * ratio);
    const interest = maturity - amount;

    _bankSaveReward(p.nickname, 'indiv', maturity);
    sbUpsertBankHistory(
        _bank.gameId, p.nickname, _bank.currentRound,
        type, amount, maturity, null
    ).catch(console.error);
    _bank.indivCompleted[_bank.currentPlayerIdx] = { type, amount };
    // ... 이하 기존 코드 유지
```

- [ ] **Step 2: `_bankSubmitTeam()` 에 bank_history 쓰기 추가 (2단계)**

`_bankSubmitTeam` 함수에서 `_bank.teamDeposits[teamName].members[_bank.currentPlayerIdx] = amount;` 바로 다음에 즉시 쓰기(matured_amount=0 placeholder):

```javascript
_bank.teamDeposits[teamName].members[_bank.currentPlayerIdx] = amount;
// 즉시 기록 (팀 완료 전 placeholder, matured_amount=0)
sbUpsertBankHistory(
    _bank.gameId, p.nickname, _bank.currentRound,
    type, amount, 0, teamName
).catch(console.error);
```

그리고 `if (allDone)` 블록 내부의 `teamMembers.forEach` 루프를 다음과 같이 교체:

```javascript
if (allDone) {
    const totalInterest = totalMatured - totalPrincipal;
    perMemberReward = Math.floor(totalInterest / teamSize);
    teamMembers.forEach(pl => {
        const memberIdx = _bank.players.findIndex(x => x === pl);
        const memberPrincipal = td.members[memberIdx] || 0;
        const memberMatured   = memberPrincipal + perMemberReward;
        _bankSaveReward(pl.nickname, 'team', memberMatured);
        // 팀 완료: matured_amount 확정값으로 업데이트
        sbUpsertBankHistory(
            _bank.gameId, pl.nickname, _bank.currentRound,
            type, memberPrincipal, memberMatured, teamName
        ).catch(console.error);
    });
    // 누적 타입 태그 — 팀 헤더 (기존 코드 유지)
    if (!_bank.teamTypeTags[teamName]) _bank.teamTypeTags[teamName] = [];
    if (!_bank.teamTypeTags[teamName].includes(type)) {
        _bank.teamTypeTags[teamName].push(type);
    }
}
```

- [ ] **Step 3: 브라우저에서 수동 검증**

1. 은행 세션 진입 → 개인 플레이어 예금 신청
2. Supabase → `bank_history` 테이블: 해당 플레이어 행 확인, `amount`·`matured_amount` 정확한지 확인
3. 팀 플레이어 전원 예금 신청 후 → 각 팀원 행의 `matured_amount`가 `principal + per_member_reward`인지 확인

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "feat: 예금 신청 시 bank_history upsert (개인 즉시, 팀 완료 시 matured_amount 확정)"
```

---

## Task 6: bank.js — 라운드 전환 시 bank_state·bank_history 쓰기

**Files:**
- Modify: `js/bank.js`

- [ ] **Step 1: `bankAdvanceRound()` 의 미완료 팀 처리 루프에 bank_history 쓰기 추가**

`bankAdvanceRound` 함수 내 기존 미완료 팀 처리 루프:

```javascript
// 기존 코드 (수정 전)
for (const [memberIdxStr, amount] of Object.entries(td.members)) {
    const pl = _bank.players[parseInt(memberIdxStr)];
    if (pl) _bankSaveReward(pl.nickname, 'team', amount);
}
```

아래로 교체:

```javascript
// 수정 후
for (const [memberIdxStr, amount] of Object.entries(td.members)) {
    const pl = _bank.players[parseInt(memberIdxStr)];
    if (pl) {
        _bankSaveReward(pl.nickname, 'team', amount);
        // 미완료: 원금 반환 — matured_amount = amount (원금)
        sbUpsertBankHistory(
            _bank.gameId, pl.nickname, _bank.currentRound,
            td.type || 'long', amount, amount, pl.team_name
        ).catch(console.error);
    }
}
```

- [ ] **Step 2: `bankAdvanceRound()` 끝 `_bank.currentRound` 증가 직후 bank_state 업데이트**

`_bank.currentRound = Math.min(_bank.currentRound + 1, 4);` 바로 다음에:

```javascript
_bank.currentRound = Math.min(_bank.currentRound + 1, 4);
sbUpsertBankState(_bank.gameId, { current_round: _bank.currentRound }).catch(console.error);
```

- [ ] **Step 3: 브라우저에서 수동 검증**

1. 은행 세션에서 일부 예금 신청 후 "다음 라운드 →" 클릭
2. Supabase → `bank_state`: `current_round` 가 2로 증가했는지 확인
3. 미완료 팀원 행: `bank_history`에서 `matured_amount = amount`인지 확인

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "feat: 라운드 전환 시 bank_state current_round 업데이트 및 미완료 팀 bank_history 기록"
```

---

## Task 7: bank.js — 폴링 + 머지 레이어

**Files:**
- Modify: `js/bank.js`

- [ ] **Step 1: `js/bank.js` 파일 끝 `_bankLoad();` 바로 위에 폴링 + 머지 함수 블록 추가**

```javascript
// ── 동기화: 폴링 + 머지 ────────────────────────────────────────────
let _bankSyncTimer = null;

function _bankStartSync() {
    if (_bankSyncTimer) return;
    _bankSyncTimer = setInterval(_bankPollAndMerge, 3000);
}

function _bankStopSync() {
    clearInterval(_bankSyncTimer);
    _bankSyncTimer = null;
}

async function _bankPollAndMerge() {
    if (!_bank.gameId) return;
    try {
        const [state, history] = await Promise.all([
            sbGetBankState(_bank.gameId),
            sbGetBankHistory(_bank.gameId)
        ]);
        if (!state) return;
        _bankMergeRemoteState(state, history);
        const view2 = document.getElementById('bankView2');
        if (view2 && view2.style.display !== 'none') {
            _bankRenderPlayerList();
        }
    } catch (e) {
        console.error('[_bankPollAndMerge]', e);
    }
}

function _bankMergeRemoteState(state, history) {
    // 1. 배율 동기화
    _bank.settings.long      = state.long_ratio;
    _bank.settings.mid       = state.mid_ratio;
    _bank.settings.short     = state.short_ratio;
    _bank.teamSettings.long  = state.team_long_ratio;
    _bank.teamSettings.mid   = state.team_mid_ratio;
    _bank.teamSettings.short = state.team_short_ratio;
    _bankSyncRatioUI();

    // 2. 라운드 전환 감지
    const remoteRound = state.current_round;
    if (remoteRound > _bank.currentRound) {
        _bank.currentRound    = remoteRound;
        _bank.indivCompleted  = {};
        _bank.teamDeposits    = {};
        _bank.teamRewards     = {};
        _bank.indivRewards    = {};
    }

    // 3. 현재 라운드 예금 상태 재구성
    const currentHistory = history.filter(r => r.round_num === _bank.currentRound);
    _bank.indivCompleted = {};
    _bank.teamDeposits   = {};

    currentHistory.forEach(row => {
        const idx = _bank.players.findIndex(p => p.nickname === row.nickname);
        if (idx === -1) return;
        if (!row.team_name) {
            _bank.indivCompleted[idx] = { type: row.deposit_type, amount: row.amount };
        } else {
            if (!_bank.teamDeposits[row.team_name]) {
                _bank.teamDeposits[row.team_name] = { type: row.deposit_type, members: {} };
            }
            _bank.teamDeposits[row.team_name].type = row.deposit_type;
            _bank.teamDeposits[row.team_name].members[idx] = row.amount;
        }
    });

    // 4. prevRoundsTotal 재구성 (만기금 합산)
    _bank.prevRoundsTotal = {};
    history
        .filter(r => r.round_num < _bank.currentRound)
        .forEach(row => {
            _bank.prevRoundsTotal[row.nickname] =
                (_bank.prevRoundsTotal[row.nickname] || 0) + (row.matured_amount || 0);
        });

    // 5. 타입 태그 재구성
    _bank.playerTypeTags = {};
    _bank.teamTypeTags   = {};
    history.forEach(row => {
        if (!row.team_name) {
            if (!_bank.playerTypeTags[row.nickname]) _bank.playerTypeTags[row.nickname] = [];
            if (!_bank.playerTypeTags[row.nickname].includes(row.deposit_type)) {
                _bank.playerTypeTags[row.nickname].push(row.deposit_type);
            }
        } else {
            if (!_bank.teamTypeTags[row.team_name]) _bank.teamTypeTags[row.team_name] = [];
            if (!_bank.teamTypeTags[row.team_name].includes(row.deposit_type)) {
                _bank.teamTypeTags[row.team_name].push(row.deposit_type);
            }
        }
    });
}
```

- [ ] **Step 2: 브라우저에서 수동 검증 (두 탭으로 시뮬레이션)**

1. 브라우저에서 `index.html`을 탭 A, 탭 B 두 개 열기
2. 두 탭 모두 동일 game_id로 은행 세션 진입
3. 탭 A에서 플레이어 예금 신청
4. 3–5초 후 탭 B 화면에서 해당 플레이어 카드가 "신청 완료"로 표시되는지 확인

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bank 폴링 + 머지 레이어 (_bankStartSync, _bankPollAndMerge, _bankMergeRemoteState)"
```

---

## Task 8: quiz.js — 설정 완료·보상 조정 쓰기

**Files:**
- Modify: `js/quiz.js`

- [ ] **Step 1: `quizStep1Complete()` 내 플레이어 로드 성공 직후 quiz_state upsert 추가**

`_quiz.earnedRewards = {};` 줄 바로 다음:

```javascript
_quiz.progress      = {};
_quiz.teamProgress  = {};
_quiz.teamPlayers   = {};
_quiz.cooldowns           = {};
_quiz.teamPlayerCooldowns = {};
_quiz.teamCooldowns       = {};
_quiz.earnedRewards       = {};

// 추가
sbUpsertQuizState(_quiz.gameId, {
    indiv_reward: _quiz.reward,
    team_reward:  _quiz.teamReward
}).catch(console.error);
```

- [ ] **Step 2: 브라우저에서 수동 검증**

1. 퀴즈 모달에서 보상 설정 후 설정 완료 클릭
2. Supabase → `quiz_state` 테이블: 해당 game_id 행에 `indiv_reward`, `team_reward` 정확한지 확인

- [ ] **Step 3: 커밋**

```bash
git add js/quiz.js
git commit -m "feat: 퀴즈 설정 완료 시 quiz_state DB 쓰기"
```

---

## Task 9: quiz.js — 퀴즈 결과 시 quiz_history 쓰기

**Files:**
- Modify: `js/quiz.js`

- [ ] **Step 1: `_quizShowResult()` 내 정답 처리 — 개인탭 쓰기**

`_quizShowResult` 함수에서 개인 정답 블록을 찾아 DB 쓰기 추가:

```javascript
} else {
    // 개인 — 문제당 보상
    const prevCount = _quiz.progress[_quiz.currentPlayerIdx] || 0;
    _quiz.progress[_quiz.currentPlayerIdx] = prevCount + 1;
    _quizSaveReward(p.nickname, _quiz.reward);
    // 추가
    sbUpsertQuizHistory(_quiz.gameId, p.nickname, {
        indiv_progress: prevCount + 1
    }).catch(console.error);

    if (_quiz.progress[_quiz.currentPlayerIdx] >= 2) {
```

- [ ] **Step 2: `_quizShowResult()` 내 정답 처리 — 팀탭 쓰기**

팀탭 정답 블록 내 `_quiz.teamPlayers[p.team_name].add(...)` 바로 다음:

```javascript
if (!_quiz.teamPlayers[p.team_name]) _quiz.teamPlayers[p.team_name] = new Set();
_quiz.teamPlayers[p.team_name].add(_quiz.currentPlayerIdx);
_quiz.teamProgress[p.team_name] = (_quiz.teamProgress[p.team_name] || 0) + 1;
// 추가
sbUpsertQuizHistory(_quiz.gameId, p.nickname, {
    team_answered: true
}).catch(console.error);
```

- [ ] **Step 3: `_quizShowResult()` 내 오답 처리 — 개인탭/팀탭 쓰기**

오답 블록 수정:

```javascript
} else {
    msg.textContent        = '틀렸습니다!';
    msg.className          = 'result-msg wrong';
    btnRetry.style.display = 'block';

    const p = _quiz.players[_quiz.currentPlayerIdx];
    if (isTeamMode) {
        _quiz.teamPlayerCooldowns[_quiz.currentPlayerIdx] = Date.now();
        // 추가
        sbUpsertQuizHistory(_quiz.gameId, p.nickname, {
            team_failed_at: new Date().toISOString()
        }).catch(console.error);
    } else {
        _quiz.cooldowns[_quiz.currentPlayerIdx] = Date.now();
        // 추가
        sbUpsertQuizHistory(_quiz.gameId, p.nickname, {
            indiv_failed_at: new Date().toISOString()
        }).catch(console.error);
    }
}
```

- [ ] **Step 4: 브라우저에서 수동 검증**

1. 퀴즈 세션 진입 → 플레이어 선택 → 정답 제출
2. Supabase → `quiz_history`: 해당 플레이어 행의 `indiv_progress` 가 1로 증가했는지 확인
3. 오답 제출 → `indiv_failed_at` 타임스탬프가 기록됐는지 확인

- [ ] **Step 5: 커밋**

```bash
git add js/quiz.js
git commit -m "feat: 퀴즈 정답/오답 시 quiz_history upsert"
```

---

## Task 10: quiz.js — 폴링 + 머지 레이어

**Files:**
- Modify: `js/quiz.js`

- [ ] **Step 1: `js/quiz.js` 파일 끝에 폴링 + 머지 함수 블록 추가**

```javascript
// ── 동기화: 폴링 + 머지 ────────────────────────────────────────────
let _quizSyncTimer = null;

function _quizStartSync() {
    if (_quizSyncTimer) return;
    _quizSyncTimer = setInterval(_quizPollAndMerge, 3000);
}

function _quizStopSync() {
    clearInterval(_quizSyncTimer);
    _quizSyncTimer = null;
}

async function _quizPollAndMerge() {
    if (!_quiz.gameId) return;
    try {
        const [state, history] = await Promise.all([
            sbGetQuizState(_quiz.gameId),
            sbGetQuizHistory(_quiz.gameId)
        ]);
        if (!state) return;
        _quizMergeRemoteState(state, history);
        const gameView = document.getElementById('quizGameView');
        if (!gameView || gameView.style.display === 'none') {
            _quizRenderPlayerList();
        }
    } catch (e) {
        console.error('[_quizPollAndMerge]', e);
    }
}

function _quizMergeRemoteState(state, history) {
    // 1. 보상 동기화
    _quiz.reward     = state.indiv_reward;
    _quiz.teamReward = state.team_reward;
    _quizUpdateRewardBadge();

    // 2. 진행 상태·쿨다운 재구성
    _quiz.progress            = {};
    _quiz.cooldowns           = {};
    _quiz.teamPlayers         = {};
    _quiz.teamProgress        = {};
    _quiz.teamPlayerCooldowns = {};

    const now = Date.now();

    history.forEach(row => {
        const idx = _quiz.players.findIndex(p => p.nickname === row.nickname);
        if (idx === -1) return;

        _quiz.progress[idx] = row.indiv_progress || 0;

        if (row.indiv_failed_at) {
            const failedMs = new Date(row.indiv_failed_at).getTime();
            if (now - failedMs < 60000) _quiz.cooldowns[idx] = failedMs;
        }

        if (row.team_answered) {
            const teamName = _quiz.players[idx].team_name;
            if (teamName) {
                if (!_quiz.teamPlayers[teamName]) _quiz.teamPlayers[teamName] = new Set();
                _quiz.teamPlayers[teamName].add(idx);
                _quiz.teamProgress[teamName] = (_quiz.teamProgress[teamName] || 0) + 1;
            }
        }

        if (row.team_failed_at) {
            const failedMs = new Date(row.team_failed_at).getTime();
            if (now - failedMs < 60000) _quiz.teamPlayerCooldowns[idx] = failedMs;
        }
    });
}
```

- [ ] **Step 2: 브라우저 두 탭으로 수동 검증**

1. 탭 A, 탭 B 동일 game_id로 퀴즈 세션 진입
2. 탭 A에서 플레이어 정답 제출
3. 3–5초 후 탭 B에서 해당 플레이어 카드 `[1/2]` → `[2/2]` 로 반영되는지 확인
4. 탭 A에서 오답 제출 → 3–5초 후 탭 B에서 쿨다운 배지(⏱ N초) 표시 확인

- [ ] **Step 3: 커밋**

```bash
git add js/quiz.js
git commit -m "feat: quiz 폴링 + 머지 레이어 (_quizStartSync, _quizPollAndMerge, _quizMergeRemoteState)"
```

---

## Task 11: app.js — switchScreen() 에 sync 훅 추가

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: `switchScreen()` 함수 수정**

`js/app.js`의 `switchScreen` 함수를 다음과 같이 수정:

```javascript
function switchScreen(id){
    // 기존 화면 전환 로직
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active-screen'));
    document.getElementById(id).classList.add('active-screen');

    document.querySelectorAll('.report-paper').forEach(p => p.classList.remove('active-print'));
    if(id === 'reportScreen') document.getElementById('pdfAreaReport').classList.add('active-print');
    if(id === 'fameScreen') document.getElementById('pdfAreaFame').classList.add('active-print');

    // 동기화 시작/중지
    _bankStopSync();
    _quizStopSync();
    if (id === 'bankScreen') _bankStartSync();
    if (id === 'quizScreen') _quizStartSync();
}
```

- [ ] **Step 2: 브라우저에서 수동 검증**

1. 은행 화면 진입 → 개발자 콘솔에서 `_bankSyncTimer` 값이 null이 아닌지 확인
2. 다른 화면으로 전환 → `_bankSyncTimer` 가 null로 초기화되는지 확인
3. 퀴즈 화면 진입 → `_quizSyncTimer` 활성화 확인

- [ ] **Step 3: 커밋**

```bash
git add js/app.js
git commit -m "feat: switchScreen에 bank/quiz sync 시작·중지 훅 연결"
```

---

## Task 12: 통합 검증

**Files:**
- 없음 (수동 검증 전용)

- [ ] **Step 1: 은행 멀티-탭 전체 시나리오 검증**

브라우저 탭 2개 (A, B) 동일 game_id:

| 순서 | 탭 A 행동 | 탭 B 예상 결과 (3–5초 내) |
|---|---|---|
| 1 | 개인 플레이어 예금 신청 | 해당 플레이어 카드 "신청 완료" |
| 2 | 팀 플레이어 1명 신청 | 팀 헤더 `[1/N]` 업데이트 |
| 3 | 팀 나머지 전원 신청 | 팀 헤더 `[N/N]` + 완료 표시 |
| 4 | "다음 라운드 →" 클릭 | 화면이 2라운드로 전환, 신청 전 상태 |

- [ ] **Step 2: 퀴즈 멀티-탭 전체 시나리오 검증**

| 순서 | 탭 A 행동 | 탭 B 예상 결과 (3–5초 내) |
|---|---|---|
| 1 | 플레이어 정답 제출 `[1/2]` | 해당 플레이어 진행도 `[1/2]` |
| 2 | 오답 제출 | 해당 플레이어에 쿨다운 배지 표시 |
| 3 | 60초 후 | 쿨다운 배지 사라짐 |
| 4 | 팀 두 번째 정답 | 팀 `[2/2]` 완료 표시 |

- [ ] **Step 3: 최종 커밋 및 푸시**

```bash
git add .
git commit -m "feat: 은행·퀴즈 멀티-태블릿 동기화 완료"
git push origin feat/sync-bank-quiz
```
