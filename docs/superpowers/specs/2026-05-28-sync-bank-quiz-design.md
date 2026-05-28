# 은행·퀴즈 멀티-태블릿 동기화 설계

**날짜:** 2026-05-28  
**브랜치:** feat/sync-bank-quiz  
**상태:** 승인됨

---

## 배경 및 목적

여러 대의 태블릿이 동일한 분반 게임에 동시 접속해 은행 예금 신청과 퀴즈 퀘스트를 운영할 때, 현재는 각 기기가 독립적인 in-memory 상태를 유지하여 서로 다른 상태를 가진 채 Supabase에 덮어쓰기가 발생한다.

**해결 목표:**
- 한 태블릿에서 예금 신청 → 다른 태블릿에서도 3–5초 내 반영
- 한 태블릿에서 퀴즈 정답/오답 → 쿨다운 포함해 다른 태블릿에도 반영
- 한 태블릿에서 라운드 전환 → 모든 태블릿이 동일 라운드로 이동

---

## 운영 환경 전제

- 어느 태블릿에서든 어떤 학생이든 처리 가능 (담당 분리 없음)
- 어느 태블릿에서든 라운드 전환 가능, 전환 시 모든 기기 반영
- 3–5초 동기화 지연 허용

---

## 아키텍처

### 동기화 방식: 폴링 + Supabase upsert

```
[태블릿 A]              [Supabase]              [태블릿 B]
  예금 신청 ──write──→  bank_history         ←──poll(3s)── 상태 반영
  라운드 전환 ──write──→ bank_state           ←──poll(3s)── 라운드 전환
  퀴즈 정답 ──write──→  quiz_history         ←──poll(3s)── 상태 반영
  퀴즈 오답 ──write──→  quiz_history         ←──poll(3s)── 쿨다운 표시
```

- 상태 변경 시 즉시 Supabase에 기록 (upsert)
- 각 기기는 3초마다 Supabase에서 최신 상태를 fetch해 로컬 `_bank` / `_quiz` 객체를 덮어쓰고 UI 리렌더링
- 절전/복귀 후에도 다음 폴링 주기에 자동 복구

---

## 신규 테이블 4개

### `bank_state` — 은행 설정 + 현재 라운드

```sql
game_id           TEXT PRIMARY KEY
current_round     INT     DEFAULT 1       -- 1|2|3|4(종료)
long_ratio        NUMERIC DEFAULT 2.0
mid_ratio         NUMERIC DEFAULT 1.5
short_ratio       NUMERIC DEFAULT 1.2
team_long_ratio   NUMERIC DEFAULT 2.5
team_mid_ratio    NUMERIC DEFAULT 2.0
team_short_ratio  NUMERIC DEFAULT 1.5
updated_at        TIMESTAMPTZ DEFAULT NOW()
```

### `bank_history` — 예금 신청 내역

라운드당 플레이어 1행. 재신청(덮어쓰기)은 upsert로 처리.

```sql
game_id        TEXT
nickname       TEXT
round_num      INT                 -- 1|2|3
deposit_type   TEXT                -- 'long'|'mid'|'short'
amount         INT                 -- 원금
matured_amount INT                 -- 만기금 (원금 × 배율)
team_name      TEXT NULL
PRIMARY KEY (game_id, nickname, round_num)
```

`prev_total` 없이 만기금 합산으로 이전 라운드 누적 보상 계산:
```javascript
prevRoundsTotal[nick] = SUM(matured_amount WHERE round_num < current_round)
```

### `quiz_state` — 퀴즈 보상 설정

```sql
game_id      TEXT PRIMARY KEY
indiv_reward INT DEFAULT 0
team_reward  INT DEFAULT 0
updated_at   TIMESTAMPTZ DEFAULT NOW()
```

### `quiz_history` — 퀴즈 진행 상태

플레이어당 1행. 개인탭/팀탭 상태를 하나의 행에 통합.

```sql
game_id          TEXT
nickname         TEXT
indiv_progress   INT  DEFAULT 0    -- 0|1|2 개인탭 정답 수
indiv_failed_at  TIMESTAMPTZ NULL  -- 개인탭 마지막 오답 시각
team_answered    BOOL DEFAULT FALSE -- 팀탭 정답 여부
team_failed_at   TIMESTAMPTZ NULL  -- 팀탭 마지막 오답 시각
PRIMARY KEY (game_id, nickname)
```

쿨다운 계산:
```javascript
cooldown_remaining = Math.max(0, 60 - Math.floor((Date.now() - failed_at) / 1000))
```

---

## Remote → Local 상태 매핑

### 은행

| 로컬 상태 | DB 소스 |
|---|---|
| `_bank.currentRound` | `bank_state.current_round` |
| `_bank.settings.long/mid/short` | `bank_state.long/mid/short_ratio` |
| `_bank.teamSettings` | `bank_state.team_*_ratio` |
| `_bank.indivCompleted[idx]` | `bank_history` WHERE round_num = current_round, team_name IS NULL |
| `_bank.teamDeposits[team].members` | `bank_history` WHERE round_num = current_round, team_name = team |
| `_bank.prevRoundsTotal[nick]` | `SUM(matured_amount)` WHERE round_num < current_round |

> **nickname → idx 변환:** `_bank.indivCompleted`와 `_bank.teamDeposits[team].members`의 키는 `_bank.players[]` 인덱스(idx)다. DB에는 `nickname`이 저장되므로, 머지 시 `idx = _bank.players.findIndex(p => p.nickname === row.nickname)`로 변환 후 저장한다. idx가 -1이면 해당 행은 무시.
>
> **라운드 전환 머지:** 원격 `current_round > 로컬 current_round`이면 `_bank.indivCompleted`, `_bank.teamDeposits`, `_bank.teamRewards`, `_bank.indivRewards`를 즉시 리셋하고 `_bankRenderPlayerList()`를 호출한다.

### 퀴즈

| 로컬 상태 | DB 소스 |
|---|---|
| `_quiz.reward` | `quiz_state.indiv_reward` |
| `_quiz.teamReward` | `quiz_state.team_reward` |
| `_quiz.progress[idx]` | `quiz_history.indiv_progress` |
| `_quiz.cooldowns[idx]` | `indiv_failed_at` — 60초 미만이면 쿨다운 중 |
| `_quiz.teamProgress[team]` | `team_answered=true` 행 COUNT per team |
| `_quiz.teamPlayers[team]` | `team_answered=true`인 닉네임 Set per team |
| `_quiz.teamPlayerCooldowns[idx]` | `team_failed_at` — 60초 미만이면 쿨다운 중 |

---

## 쓰기 시점

### 은행

| 이벤트 | DB 쓰기 |
|---|---|
| `bankStep1Complete()` | UPSERT `bank_state` (배율 전체, current_round=1) |
| `bankAdjustRatio()` | UPDATE `bank_state` 해당 배율 컬럼 (1초 디바운스 적용 — 연속 버튼 클릭 시 과도한 DB 요청 방지) |
| `_bankSubmitIndividual()` | UPSERT `bank_history` (amount, matured_amount, team_name=null) |
| `_bankSubmitTeam()` | UPSERT `bank_history` (amount, matured_amount, team_name) |
| `bankAdvanceRound()` | UPDATE `bank_state.current_round += 1` |

### 퀴즈

| 이벤트 | DB 쓰기 |
|---|---|
| `quizStep1Complete()` | UPSERT `quiz_state` (indiv_reward, team_reward) |
| `quizAdjustReward()` | UPDATE `quiz_state` (1초 디바운스 적용) |
| 정답 (개인탭) | UPSERT `quiz_history` (indiv_progress = 로컬 현재값+1). 동일 플레이어를 두 기기가 동시에 처리하는 경우는 물리적으로 불가하므로 race condition 무시. |
| 정답 (팀탭) | UPSERT `quiz_history` (team_answered = true) |
| 오답 (개인탭) | UPSERT `quiz_history` (indiv_failed_at = NOW()) |
| 오답 (팀탭) | UPSERT `quiz_history` (team_failed_at = NOW()) |

---

## 폴링 구조

```javascript
let _bankSyncTimer = null;

function _bankStartSync() {
    _bankSyncTimer = setInterval(_bankPollAndMerge, 3000);
}
function _bankStopSync() {
    clearInterval(_bankSyncTimer);
    _bankSyncTimer = null;
}

async function _bankPollAndMerge() {
    if (!_bank.gameId) return;
    const [state, history] = await Promise.all([
        sbGetBankState(_bank.gameId),
        sbGetBankHistory(_bank.gameId)
    ]);
    if (!state) return;
    _bankMergeRemoteState(state, history);
    // 리스트 뷰(view 2)에 있을 때만 리렌더링
    if (document.getElementById('bankView2').style.display !== 'none') {
        _bankRenderPlayerList();
    }
}
```

퀴즈도 동일한 패턴으로 `_quizStartSync()` / `_quizStopSync()` / `_quizPollAndMerge()` 구현.

`switchScreen()` 호출 시 해당 화면 진입/이탈에 맞춰 sync 시작/중지.

---

## Supabase 설정

### RLS 정책 (4개 테이블 공통)

```sql
-- SELECT
CREATE POLICY "anon read" ON bank_state FOR SELECT USING (true);
-- INSERT
CREATE POLICY "anon insert" ON bank_state FOR INSERT WITH CHECK (true);
-- UPDATE
CREATE POLICY "anon update" ON bank_state FOR UPDATE USING (true);
```

`bank_history`, `quiz_state`, `quiz_history`도 동일하게 적용.

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `js/supabase-client.js` | 신규 8개 함수: `sbGetBankState`, `sbUpsertBankState`, `sbGetBankHistory`, `sbUpsertBankHistory`, `sbGetQuizState`, `sbUpsertQuizState`, `sbGetQuizHistory`, `sbUpsertQuizHistory` |
| `js/bank.js` | 쓰기 훅 삽입 + `_bankStartSync` / `_bankStopSync` / `_bankPollAndMerge` / `_bankMergeRemoteState` 추가 |
| `js/quiz.js` | 쓰기 훅 삽입 + `_quizStartSync` / `_quizStopSync` / `_quizPollAndMerge` / `_quizMergeRemoteState` 추가 |
| `js/app.js` | `switchScreen()` 에서 sync 시작/중지 훅 추가 |
| Supabase 대시보드 | 테이블 4개 생성 + RLS 정책 설정 |

---

## 미처리 범위 (Out of scope)

- 동시 라운드 전환 충돌 (두 태블릿이 동시에 전환하는 경우) — 운영 규칙으로 방지
- 오프라인 상태에서의 로컬 큐잉 — 인터넷 연결 필수 환경으로 전제
- `bankScreen` / `quizScreen` 이외 화면의 동기화
