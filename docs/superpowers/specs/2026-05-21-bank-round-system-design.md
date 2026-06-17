# 은행 예금 라운드 시스템 설계

**날짜:** 2026-05-21  
**파일:** `js/bank.js`, `index.html`  
**범위:** 플레이어가 예금 종류를 직접 선택하던 구조 → 진행자가 라운드를 전환하는 구조로 변경

---

## 1. 변경 개요

| 항목 | 기존 | 변경 후 |
|---|---|---|
| 예금 종류 선택 | 플레이어가 장기/중기/단기 직접 선택 | 진행자가 라운드 버튼으로 결정 |
| 라운드 제목 | 없음 | "1라운드 장기 예금 신청" 등 |
| EFTI 태그 | 플레이어 카드에 표시 | 제거 |
| 타입 태그 | 플레이어/팀 헤더에 현재 종류 | 누적 표시 (라운드마다 추가) |
| DB 누적 | 단일 라운드 가정 | 라운드 간 누적 보장 |

---

## 2. 상태 변경 (`_bank` 객체)

### 추가

```js
currentRound: 1,        // 1=장기, 2=중기, 3=단기, 4=종료
playerTypeTags: {},     // { [nickname]: ['long', 'mid', ...] } — 라운드 리셋 무관
teamTypeTags: {},       // { [teamName]: ['long', 'mid', ...] } — 라운드 리셋 무관
prevRoundsTotal: {},    // { [nickname]: 이전 라운드들의 누적 보상 합계 } — 라운드 리셋 무관
```

### 제거

```js
deposit.type   // 예금 종류는 currentRound에서 자동 결정
```

### 라운드 → 타입 매핑

```js
const _ROUND_TYPE = { 1: 'long', 2: 'mid', 3: 'short' };
```

### 라운드 전환 시 리셋 대상 vs 유지 대상

| 상태 | 라운드 전환 시 |
|---|---|
| `indivCompleted` | 리셋 |
| `teamDeposits` | 리셋 |
| `teamRewards` | 리셋 (prevRoundsTotal에 스냅샷 후) |
| `indivRewards` | 리셋 (prevRoundsTotal에 스냅샷 후) |
| `prevRoundsTotal` | 유지 (누적) |
| `playerTypeTags` | 유지 (누적) |
| `teamTypeTags` | 유지 (누적) |

---

## 3. 라운드 전환 로직 (`bankAdvanceRound`)

```
1. 미완료 팀 → 무효 (teamDeposits에서 drop, DB 미기록이므로 안전)
2. 현재 라운드 보상 스냅샷:
   allNicknames(teamRewards ∪ indivRewards).forEach(nick => {
       prevRoundsTotal[nick] += teamRewards[nick] + indivRewards[nick];
   })
3. teamRewards = {}, indivRewards = {} 리셋
4. indivCompleted = {}, teamDeposits = {} 리셋
5. currentRound++
6. 플레이어 리스트 재렌더 + 라운드 제목 업데이트
```

`currentRound === 4`일 때:
- "다음 라운드" 버튼 비활성화
- 플레이어 카드 클릭 차단 (예금 신청 종료)

---

## 4. DB 누적 보장 (`_bankSaveReward`)

기존:
```js
_bank.indivRewards[nickname] = amount;  // 덮어씀
const total = teamRewards[n] + indivRewards[n];
```

변경:
```js
_bank.indivRewards[nickname] = amount;  // 동일 (라운드 내 재제출은 덮어쓰기 허용)
const total = (prevRoundsTotal[n] || 0)   // 이전 라운드 누적
            + (teamRewards[n]  || 0)      // 이번 라운드 팀
            + (indivRewards[n] || 0);     // 이번 라운드 개인
sbSaveDepositReward(gameId, n, total);
```

라운드 내 재제출(금액 변경) 시 `indivRewards[n] = newAmount`로 덮어써도 `prevRoundsTotal`이 이전 라운드를 보존하므로 안전.

---

## 5. View 2 (플레이어 리스트) 변경

- 헤더 타이틀: `"1라운드 장기 예금 신청"` / `"2라운드 중기 예금 신청"` / `"3라운드 단기 예금 신청"` (기존 "예금 신청자 선택" 대체)
- 하단 진행자 버튼: `"다음 라운드 →"` (confirm 후 실행)
  - `currentRound === 3`일 때: `"예금 신청 종료"` (confirm 후 `currentRound = 4`)
  - `currentRound === 4`일 때: 버튼 비활성화
- 라운드 4일 때 플레이어 카드 클릭 시 아무 동작 없음

---

## 6. 플레이어 카드 태그

### 팀 게임 — 팀 탭

**팀 헤더:**
- 진행 뱃지: `[n/m]`
- 누적 타입 태그: `teamTypeTags[teamName]`에 쌓인 `장기 🏦`, `중기 ⏳`, `단기 ⚡` 표시

**플레이어 카드:**
- `신청완료` or `신청전`만 표시
- EFTI 태그 제거

### 팀 게임 — 개인 탭 / 개인전

**플레이어 카드:**
- 누적 타입 태그: `playerTypeTags[nickname]` 기반 (`장기 🏦`, `중기 ⏳`, `단기 ⚡`)
- `신청완료` or `신청전`
- EFTI 태그 제거

### 태그 축적 시점

- 개인 제출 성공 → `playerTypeTags[nickname]`에 현재 라운드 타입 추가
- 팀 전체 완료(allDone) → `teamTypeTags[teamName]`과 팀원 전체 `playerTypeTags[nickname]`에 추가
- 팀 미완료로 라운드 전환 → 태그 추가 없음 (무효)

---

## 7. View 3 (예금 신청서) 변경

- **제거**: "예금 종류" 섹션 전체 (`.bank-type-cards`, `bankTcLong/Mid/Short` 등)
- **유지**: 예금 금액 stepper, 미리보기 박스, 신청 버튼
- 미리보기는 `_ROUND_TYPE[currentRound]` 타입의 배율로 자동 계산

관련 함수 변경:
- `bankPickType()` 제거
- `bankStep2Submit()`: type 선택 체크 제거, `_ROUND_TYPE[currentRound]`로 타입 자동 결정
- `_bankUpdatePreview()`: `_bank.deposit.type` 대신 `_ROUND_TYPE[_bank.currentRound]` 사용
- `bankSelectPlayer()`: type 카드 선택 로직 제거

---

## 8. `bankStep1Complete()` 초기화 추가

게임 로드 시 새 상태 초기화:
```js
_bank.currentRound    = 1;
_bank.playerTypeTags  = {};
_bank.teamTypeTags    = {};
_bank.prevRoundsTotal = {};
```

---

## 9. 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `js/bank.js` | 상태 추가, `_bankSaveReward` 수정, `bankAdvanceRound` 추가, `bankPickType` 제거, `bankStep2Submit`/`bankSelectPlayer`/`_bankUpdatePreview` 수정, 카드 렌더 수정 |
| `index.html` | View 2 라운드 타이틀 + 다음 라운드 버튼 추가, View 3 예금 종류 섹션 제거 |
