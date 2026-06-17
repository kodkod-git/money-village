# 은행 예금 라운드 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플레이어가 예금 종류를 직접 선택하던 구조를 진행자가 라운드 버튼으로 전환하는 구조로 변경하고, 라운드 간 DB 누적을 보장한다.

**Architecture:** `js/bank.js`에 `currentRound`, `prevRoundsTotal`, `playerTypeTags`, `teamTypeTags` 상태를 추가하고, `_bankSaveReward`에서 `prevRoundsTotal`을 합산하여 `.update()` 덮어쓰기 시에도 라운드 간 누적이 보장되도록 한다. `index.html`의 View 2에 라운드 제목과 "다음 라운드" 버튼을, View 3에서 예금 종류 선택 섹션을 제거한다.

**Tech Stack:** Vanilla JS, localStorage, Supabase (`sbSaveDepositReward`)

---

## 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `js/bank.js` | 상태 추가, `_bankSaveReward` 수정, `bankAdvanceRound` 신규, `bankPickType` 제거, `bankSelectPlayer`/`_bankUpdatePreview`/`bankStep2Submit`/`_bankSubmitIndividual`/`_bankSubmitTeam`/`_bankRenderPlayerList`/`_bankMakePlayerCard`/`bankStep1Complete` 수정 |
| `index.html` | View 2 헤더 타이틀 + 다음 라운드 버튼 추가, View 3 예금 종류 섹션 제거 |

---

## Task 1: `_bank` 상태 객체 및 상수 확장

**Files:**
- Modify: `js/bank.js:3-23`

- [ ] **Step 1: `_bank` 객체에 신규 필드 추가, `deposit.type` 제거**

`js/bank.js` 상단의 `_bank` 객체를 다음으로 교체:

```js
const _bank = {
    settings:     { long: 2.0, mid: 1.5, short: 1.2 },
    teamSettings: { long: 2.5, mid: 2.0, short: 1.5 },
    gameId:   null,
    gameDate: null,
    gameType: null,
    players:  [],
    deposit:  { amount: 1000 },
    currentPlayerIdx: null,
    currentRound:    1,
    indivCompleted:  {},
    teamDeposits:    {},
    teamRewards:     {},
    indivRewards:    {},
    prevRoundsTotal: {},
    playerTypeTags:  {},
    teamTypeTags:    {},
    viewMode:  'team'
};
```

- [ ] **Step 2: `_ROUND_TYPE` 상수 추가**

`_BANK_TYPE` 상수 바로 아래(line 23 이후)에 추가:

```js
const _ROUND_TYPE = { 1: 'long', 2: 'mid', 3: 'short' };

const _ROUND_TITLE = {
    1: '1라운드 장기 예금 신청',
    2: '2라운드 중기 예금 신청',
    3: '3라운드 단기 예금 신청'
};
```

- [ ] **Step 3: 브라우저에서 `index.html` 열어 콘솔 에러 없는지 확인**

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "feat: _bank 상태에 currentRound·prevRoundsTotal·타입태그 추가"
```

---

## Task 2: `bankStep1Complete()` 초기화 업데이트

**Files:**
- Modify: `js/bank.js` — `bankStep1Complete` 함수

- [ ] **Step 1: 신규 상태 초기화 추가**

`bankStep1Complete()` 내의 다음 블록을:

```js
_bank.indivCompleted = {};
_bank.teamDeposits   = {};
_bank.teamRewards    = {};
_bank.indivRewards   = {};
_bank.viewMode       = 'team';
```

아래로 교체:

```js
_bank.indivCompleted  = {};
_bank.teamDeposits    = {};
_bank.teamRewards     = {};
_bank.indivRewards    = {};
_bank.prevRoundsTotal = {};
_bank.playerTypeTags  = {};
_bank.teamTypeTags    = {};
_bank.currentRound    = 1;
_bank.viewMode        = 'team';
```

- [ ] **Step 2: 새 게임 로드 후 `currentRound`가 1인지 콘솔로 확인**

브라우저 콘솔에서:
```js
// 게임 로드 후
_bank.currentRound   // → 1
_bank.prevRoundsTotal // → {}
```

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bankStep1Complete에서 라운드 상태 초기화 추가"
```

---

## Task 3: `_bankSaveReward()` 수정 — 라운드 간 누적 보장

**Files:**
- Modify: `js/bank.js` — `_bankSaveReward` 함수

- [ ] **Step 1: `_bankSaveReward` 수정**

현재 코드:

```js
function _bankSaveReward(nickname, source, amount) {
    if (source === 'team') _bank.teamRewards[nickname] = amount;
    else                   _bank.indivRewards[nickname] = amount;
    const total = (_bank.teamRewards[nickname] || 0) + (_bank.indivRewards[nickname] || 0);
    sbSaveDepositReward(_bank.gameId, nickname, total).catch(console.error);
}
```

교체:

```js
function _bankSaveReward(nickname, source, amount) {
    if (source === 'team') _bank.teamRewards[nickname] = amount;
    else                   _bank.indivRewards[nickname] = amount;
    const total = (_bank.prevRoundsTotal[nickname] || 0)
                + (_bank.teamRewards[nickname]   || 0)
                + (_bank.indivRewards[nickname]  || 0);
    sbSaveDepositReward(_bank.gameId, nickname, total).catch(console.error);
}
```

- [ ] **Step 2: 브라우저 콘솔에서 로직 확인**

```js
// 1라운드 개인 제출 시뮬레이션
_bank.prevRoundsTotal['테스트'] = 0;
_bank.indivRewards['테스트'] = 2000;
_bank.teamRewards['테스트'] = 0;
// total = 0 + 0 + 2000 = 2000 ✓

// 라운드 전환 후 prevRoundsTotal 스냅샷 가정
_bank.prevRoundsTotal['테스트'] = 2000;
_bank.indivRewards['테스트'] = 0; // 리셋
// 2라운드 개인 제출
_bank.indivRewards['테스트'] = 1500;
// total = 2000 + 0 + 1500 = 3500 ✓
```

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "fix: _bankSaveReward에서 prevRoundsTotal 포함해 라운드 간 누적 보장"
```

---

## Task 4: `bankAdvanceRound()` 신규 함수 추가

**Files:**
- Modify: `js/bank.js` — `// ── View 4: 결과` 섹션 위에 추가

- [ ] **Step 1: `bankAdvanceRound` 함수 추가**

`bankNextStudent()` 함수 바로 위에 삽입:

```js
// ── 라운드 전환 ────────────────────────────────────────────────────
function bankAdvanceRound() {
    const isLast  = _bank.currentRound >= 3;
    const label   = isLast ? '예금 신청 종료' : '다음 라운드';
    if (!confirm(`${label}으로 넘어갑니다.\n미완료 팀 신청은 무효 처리됩니다.\n계속하시겠습니까?`)) return;

    // 현재 라운드 보상을 prevRoundsTotal에 스냅샷
    const allNicks = new Set([
        ...Object.keys(_bank.teamRewards),
        ...Object.keys(_bank.indivRewards)
    ]);
    allNicks.forEach(nick => {
        _bank.prevRoundsTotal[nick] = (_bank.prevRoundsTotal[nick] || 0)
            + (_bank.teamRewards[nick]  || 0)
            + (_bank.indivRewards[nick] || 0);
    });

    // 라운드 레벨 상태 리셋
    _bank.teamRewards    = {};
    _bank.indivRewards   = {};
    _bank.indivCompleted = {};
    _bank.teamDeposits   = {};
    _bank.currentRound   = Math.min(_bank.currentRound + 1, 4);

    _bankRenderPlayerList();
    _bankShowView(2);
}
```

- [ ] **Step 2: 브라우저 콘솔에서 함수 존재 확인**

```js
typeof bankAdvanceRound // → "function"
```

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bankAdvanceRound 함수 추가 — 라운드 전환 및 상태 리셋"
```

---

## Task 5: View 2 HTML — 라운드 제목 + 다음 라운드 버튼

**Files:**
- Modify: `index.html` — `bankView2` 섹션

- [ ] **Step 1: 헤더 타이틀을 `id="bankRoundTitle"` 엘리먼트로 교체**

`index.html`의 bankView2 헤더 내:

```html
<div class="bank-screen-title">👥 예금 신청자 선택</div>
```

교체:

```html
<div class="bank-screen-title" id="bankRoundTitle">1라운드 장기 예금 신청</div>
```

- [ ] **Step 2: `bankPlayerGrid` 아래에 "다음 라운드" 버튼 추가**

```html
<div id="bankPlayerGrid" class="bank-player-grid"></div>
```

아래에 추가:

```html
<div style="padding: 16px 0 8px;">
    <button id="bankAdvanceRoundBtn" class="btn btn-purple"
        style="width:100%; padding:14px; font-size:15px; justify-content:center;"
        onclick="bankAdvanceRound()">다음 라운드 →</button>
</div>
```

- [ ] **Step 3: 브라우저에서 View 2 렌더 확인 — "1라운드 장기 예금 신청" 제목과 버튼 보임**

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -m "feat: bankView2에 라운드 제목 및 다음 라운드 버튼 추가"
```

---

## Task 6: `_bankRenderPlayerList()` — 라운드 제목·버튼 상태·라운드4 차단

**Files:**
- Modify: `js/bank.js` — `_bankRenderPlayerList` 함수

- [ ] **Step 1: 함수 첫 부분에 라운드 제목·버튼 업데이트 로직 추가**

`_bankRenderPlayerList()` 함수 본문 맨 앞(첫 번째 `const grid` 줄 이전)에 삽입:

```js
// 라운드 제목 업데이트
const titleEl = document.getElementById('bankRoundTitle');
if (titleEl) {
    titleEl.textContent = _ROUND_TITLE[_bank.currentRound] || '예금 신청 종료';
}

// 다음 라운드 버튼 상태 업데이트
const advBtn = document.getElementById('bankAdvanceRoundBtn');
if (advBtn) {
    const isEnded = _bank.currentRound >= 4;
    advBtn.disabled    = isEnded;
    advBtn.textContent = _bank.currentRound === 3 ? '예금 신청 종료 →'
                       : isEnded               ? '종료됨'
                       :                          '다음 라운드 →';
}
```

- [ ] **Step 2: 브라우저에서 게임 로드 후 View 2 확인**

- "1라운드 장기 예금 신청" 제목 표시  
- "다음 라운드 →" 버튼 활성화 상태 확인

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "feat: _bankRenderPlayerList에서 라운드 제목·버튼 상태 반영"
```

---

## Task 7: 플레이어 카드 태그 변경

**Files:**
- Modify: `js/bank.js` — `_bankMakePlayerCard` 함수, 팀 헤더 렌더 블록

- [ ] **Step 1: `_bankMakePlayerCard` 수정 — EFTI 제거, 누적 타입 태그 추가**

현재 `_bankMakePlayerCard` 함수 전체를 교체:

```js
function _bankMakePlayerCard(p, idx) {
    const done     = _getPlayerDone(p, idx);
    const card     = document.createElement('div');
    card.className = 'bank-player-card' + (done ? ' completed' : '');

    // 개인 탭 / 개인전: 누적 타입 태그 표시 (팀 탭 플레이어 카드에는 표시 안 함)
    const typeTags = !isTeamTab
        ? (_bank.playerTypeTags[p.nickname] || [])
            .map(t => `<span class="bank-status-type">${_BANK_TYPE[t].label}</span>`)
            .join('')
        : '';

    const statusTag = done
        ? `<span class="bank-status-done">신청 완료</span>`
        : `<span class="bank-status-pending">신청 전</span>`;

    card.innerHTML = `
        <div class="bank-player-nickname">${p.nickname}</div>
        <div class="bank-player-realname">${p.real_name}</div>
        <div class="bank-player-status">
            ${typeTags}
            ${statusTag}
        </div>`;

    card.onclick = () => {
        if (_bank.currentRound >= 4) return;
        bankSelectPlayer(idx);
    };
    return card;
}
```

- [ ] **Step 2: 팀 헤더 렌더 블록에서 누적 타입 태그로 교체**

팀 헤더 렌더 부분에서:

```js
const typeLabel = td && td.type ? `<span class="bank-status-type">${_BANK_TYPE[td.type].label}</span>` : '';
header.innerHTML = `${teamKey || '무소속'} <span class="bank-team-progress-badge">[${completedCnt}/${teamSize}]</span>${typeLabel}`;
```

교체:

```js
const teamTypeTagsHtml = (_bank.teamTypeTags[teamKey] || [])
    .map(t => `<span class="bank-status-type">${_BANK_TYPE[t].label}</span>`)
    .join('');
header.innerHTML = `${teamKey || '무소속'} <span class="bank-team-progress-badge">[${completedCnt}/${teamSize}]</span>${teamTypeTagsHtml}`;
```

- [ ] **Step 3: 브라우저에서 플레이어 카드 확인**

- EFTI 태그 없음  
- 팀 탭 플레이어 카드: "신청 전"만 표시  
- 개인 탭: 신청 완료 후 타입 태그(예: "장기 🏦") + "신청 완료" 표시  
- 팀 헤더: 팀 완료 후 "장기 🏦" 태그 누적 표시

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "feat: 플레이어 카드 EFTI 제거·누적 타입 태그 추가"
```

---

## Task 8: View 3 HTML — 예금 종류 선택 섹션 제거

**Files:**
- Modify: `index.html` — `bankView3` 내 "예금 종류" 카드 섹션

- [ ] **Step 1: bankView3에서 예금 종류 섹션 전체 제거**

`index.html`에서 아래 블록 전체 삭제:

```html
<div class="bank-screen-card">
    <div class="bank-screen-card-title">예금 종류</div>
    <div class="bank-type-cards">
        <div class="bank-type-card" id="bankTcLong" onclick="bankPickType('long')">
            <div class="bank-tc-name">장기 🏦</div>
            <div class="bank-tc-round">1라운드</div>
            <div class="bank-tc-info" id="bankTcInfoLong">—</div>
        </div>
        <div class="bank-type-card" id="bankTcMid" onclick="bankPickType('mid')">
            <div class="bank-tc-name">중기 ⏳</div>
            <div class="bank-tc-round">2라운드</div>
            <div class="bank-tc-info" id="bankTcInfoMid">—</div>
        </div>
        <div class="bank-type-card" id="bankTcShort" onclick="bankPickType('short')">
            <div class="bank-tc-name">단기 ⚡</div>
            <div class="bank-tc-round">3라운드</div>
            <div class="bank-tc-info" id="bankTcInfoShort">—</div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: 브라우저에서 View 3 확인**

플레이어 카드 클릭 → View 3에 예금 종류 선택 카드 없음, 금액 stepper와 신청 버튼만 표시

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: bankView3 예금 종류 선택 섹션 제거"
```

---

## Task 9: `bankPickType` 제거 + `bankSelectPlayer` / `_bankUpdatePreview` / `bankStep2Submit` 수정

**Files:**
- Modify: `js/bank.js`

- [ ] **Step 1: `bankPickType` 함수 전체 삭제**

`js/bank.js`에서 아래 함수 전체 삭제:

```js
function bankPickType(t) {
    _bank.deposit.type = t;
    document.querySelectorAll('.bank-type-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('bankTc' + _bankCap(t)).classList.add('selected');
    const p = _bank.players[_bank.currentPlayerIdx];
    if (_bank.viewMode === 'team' && p && p.team_name) {
        if (!_bank.teamDeposits[p.team_name]) {
            _bank.teamDeposits[p.team_name] = { type: t, members: {} };
        } else {
            _bank.teamDeposits[p.team_name].type = t;
        }
    }
    _bankUpdatePreview();
}
```

- [ ] **Step 2: `bankSelectPlayer()` 수정 — 타입 카드 로직 제거**

현재 `bankSelectPlayer()` 함수 전체를 아래로 교체:

```js
function bankSelectPlayer(idx) {
    const p = _bank.players[idx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    _bank.currentPlayerIdx = idx;
    document.getElementById('bankDepositPlayerName').textContent =
        `${p.nickname}(${p.real_name})의 예금 신청`;

    // 이전 금액 복원 (덮어쓰기 지원)
    let prevAmount = 1000;
    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        if (td && td.members && td.members[idx] !== undefined) prevAmount = td.members[idx];
    } else {
        if (_bank.indivCompleted[idx]) prevAmount = _bank.indivCompleted[idx].amount;
    }

    _bank.deposit = { amount: prevAmount };
    document.getElementById('bankAmountDisplay').textContent = prevAmount.toLocaleString() + '원';
    _bankUpdatePreview();

    _bankShowView(3);
}
```

- [ ] **Step 3: `_bankUpdatePreview()` 수정 — `currentRound` 기반으로 타입 자동 결정**

현재 `_bankUpdatePreview()` 전체를 아래로 교체:

```js
function _bankUpdatePreview() {
    const type   = _ROUND_TYPE[_bank.currentRound];
    const amount = _bank.deposit.amount;
    const box    = document.getElementById('bankPreviewBox');

    const p = _bank.players[_bank.currentPlayerIdx];
    if (!p) return;
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        const prevSelf   = td && td.members ? (td.members[_bank.currentPlayerIdx] || 0) : 0;
        const alreadySum = td && td.members
            ? Object.values(td.members).reduce((a, b) => a + b, 0) - prevSelf : 0;
        const totalPrincipal = alreadySum + amount;
        const totalMatured   = Math.round(totalPrincipal * _bank.teamSettings[type]);
        box.textContent = `${totalPrincipal.toLocaleString()}원 → 💰 ${totalMatured.toLocaleString()}원`;
    } else {
        const out = Math.round(amount * _bank.settings[type]);
        box.textContent = `${amount.toLocaleString()}원 → 💰 ${out.toLocaleString()}원`;
    }
}
```

- [ ] **Step 4: `bankStep2Submit()` 수정 — 타입 체크 제거, `currentRound` 기반 타입 사용**

현재 `bankStep2Submit()` 전체를 아래로 교체:

```js
async function bankStep2Submit() {
    const type   = _ROUND_TYPE[_bank.currentRound];
    const amount = _bank.deposit.amount;
    const p = _bank.players[_bank.currentPlayerIdx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;
    if (isTeamTab) {
        _bankSubmitTeam(p, type, amount);
    } else {
        _bankSubmitIndividual(p, type, amount);
    }
}
```

- [ ] **Step 5: 브라우저에서 전체 흐름 확인**

1. 게임 로드 → View 2에 "1라운드 장기 예금 신청"
2. 플레이어 클릭 → View 3에 예금 종류 섹션 없음
3. 금액 입력 → 미리보기에 장기 배율(2.0배) 계산 표시
4. 신청 → View 4에 "1라운드", "장기 🏦" 표시

- [ ] **Step 6: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bankPickType 제거·bankSelectPlayer/_bankUpdatePreview/bankStep2Submit을 currentRound 기반으로 수정"
```

---

## Task 10: `_bankSubmitIndividual` / `_bankSubmitTeam` — 태그 축적 로직 추가

**Files:**
- Modify: `js/bank.js`

- [ ] **Step 1: `_bankSubmitIndividual()`에 `playerTypeTags` 축적 추가**

`_bankSubmitIndividual()` 내에서 `_bank.indivCompleted[_bank.currentPlayerIdx] = { type, amount };` 바로 아래에 추가:

```js
// 누적 타입 태그
if (!_bank.playerTypeTags[p.nickname]) _bank.playerTypeTags[p.nickname] = [];
if (!_bank.playerTypeTags[p.nickname].includes(type)) {
    _bank.playerTypeTags[p.nickname].push(type);
}
```

- [ ] **Step 2: `_bankSubmitTeam()`의 allDone 블록에 태그 축적 추가**

`_bankSubmitTeam()` 내 `if (allDone) { ... }` 블록 마지막(teamMembers.forEach 이후)에 추가:

```js
if (allDone) {
    // ... 기존 코드 (perMemberReward 계산 + _bankSaveReward 호출) ...

    // 누적 타입 태그 — 팀 헤더
    if (!_bank.teamTypeTags[teamName]) _bank.teamTypeTags[teamName] = [];
    if (!_bank.teamTypeTags[teamName].includes(type)) {
        _bank.teamTypeTags[teamName].push(type);
    }
    // 누적 타입 태그 — 팀원 개인
    teamMembers.forEach(pl => {
        if (!_bank.playerTypeTags[pl.nickname]) _bank.playerTypeTags[pl.nickname] = [];
        if (!_bank.playerTypeTags[pl.nickname].includes(type)) {
            _bank.playerTypeTags[pl.nickname].push(type);
        }
    });
}
```

- [ ] **Step 3: 전체 3라운드 시나리오 수동 테스트**

**개인전 시나리오:**
1. 게임 로드 → 1라운드 개인 플레이어 신청 → View 2로 복귀
2. 플레이어 카드에 "장기 🏦" 태그 + "신청 완료" 확인
3. "다음 라운드 →" 클릭 → confirm → "2라운드 중기 예금 신청"으로 변경
4. 같은 플레이어 다시 신청 → 미리보기에 중기 배율(1.5배) 확인
5. 신청 완료 → 플레이어 카드에 "장기 🏦 중기 ⏳" 두 태그 모두 표시 확인
6. Supabase에서 해당 플레이어의 `deposit_reward`가 1라운드+2라운드 합산값인지 확인

**팀전 시나리오:**
1. 게임 로드 → 1라운드 팀 탭에서 팀 전체 신청 완료 → 팀 헤더에 "장기 🏦" 태그 확인
2. 다음 라운드 → 2라운드 팀 탭에서 일부만 신청 → "다음 라운드" 클릭 → 무효 처리 확인
3. 2라운드 개인 탭에서 개인 신청 → 개인 탭 플레이어 카드에 타입 태그 확인

**라운드 3 종료 시나리오:**
1. 3라운드에서 "예금 신청 종료 →" 버튼 표시 확인
2. 종료 후 플레이어 카드 클릭 시 View 3 이동 없음 확인
3. 버튼 "종료됨"으로 비활성화 확인

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "feat: 예금 제출 시 playerTypeTags·teamTypeTags 누적 추가"
```
