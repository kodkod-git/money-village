# Bank Team Deposit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 은행 예금에 팀 우대 금리 추가, 팀/개인 예금 완전 분리, 팀 진행 뱃지([0/2] 등), 완료 시 N/1 보상 균등 분배 구현

**Architecture:** `js/bank.js`의 상태를 `indivCompleted`/`teamDeposits`로 분리하고 팀/개인 로직을 분기 처리. `index.html`의 모달에 팀 우대 금리 섹션 추가, View4에 팀 상태 표시 추가. CSS는 `style.css`에 추가.

**Tech Stack:** Vanilla JS, localStorage, Supabase (`sbSaveDepositReward`)

---

## 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `js/bank.js` | 수정 | 상태 구조 분리, 모든 은행 예금 로직 |
| `index.html` | 수정 | 모달 팀 배율 섹션, View4 팀 상태 섹션 |
| `style.css` | 수정 | `.bank-team-progress-badge`, `.bank-team-pending-msg` CSS 추가 |

---

### Task 1: `_bank` 상태 구조 + localStorage 영속화 업데이트

**Files:**
- Modify: `js/bank.js:3-32`

- [ ] **Step 1: `_bank` 객체 교체**

`js/bank.js` 3-12행 전체를 아래로 교체한다:

```javascript
const _bank = {
    settings:     { long: 2.0, mid: 1.5, short: 1.2 },
    teamSettings: { long: 2.5, mid: 2.0, short: 1.5 },
    gameId:   null,
    gameDate: null,
    gameType: null,
    players:  [],
    deposit:  { type: null, amount: 1000 },
    currentPlayerIdx: null,
    indivCompleted: {},
    teamDeposits:   {},
    viewMode:  'team'
};
```

- [ ] **Step 2: `_bankLoad()` 교체**

`js/bank.js` 21-28행 전체를 아래로 교체한다:

```javascript
function _bankLoad() {
    try {
        const s = JSON.parse(localStorage.getItem('mv_bank_settings') || '{}');
        if (s.long      >= 1) _bank.settings.long     = s.long;
        if (s.mid       >= 1) _bank.settings.mid      = s.mid;
        if (s.short     >= 1) _bank.settings.short    = s.short;
        if (s.teamLong  >= 1) _bank.teamSettings.long  = s.teamLong;
        if (s.teamMid   >= 1) _bank.teamSettings.mid   = s.teamMid;
        if (s.teamShort >= 1) _bank.teamSettings.short = s.teamShort;
    } catch(e) {}
}
```

- [ ] **Step 3: `_bankSave()` 교체**

`js/bank.js` 30-32행 전체를 아래로 교체한다:

```javascript
function _bankSave() {
    localStorage.setItem('mv_bank_settings', JSON.stringify({
        long: _bank.settings.long, mid: _bank.settings.mid, short: _bank.settings.short,
        teamLong: _bank.teamSettings.long, teamMid: _bank.teamSettings.mid, teamShort: _bank.teamSettings.short
    }));
}
```

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "refactor: bank 상태 구조 분리 (indivCompleted/teamDeposits/teamSettings)"
```

---

### Task 2: `bankAdjustRatio` + `_bankSyncRatioUI` 팀 지원

**Files:**
- Modify: `js/bank.js:150-162`

- [ ] **Step 1: `bankAdjustRatio` 교체**

`js/bank.js` 150-155행을 아래로 교체한다:

```javascript
function bankAdjustRatio(type, delta, isTeam = false) {
    const store  = isTeam ? _bank.teamSettings : _bank.settings;
    const prefix = isTeam ? 'bankTeam' : 'bank';
    const next = Math.round((store[type] + delta) * 10) / 10;
    if (next < 1.0) return;
    store[type] = next;
    document.getElementById(prefix + _bankCap(type) + 'RatioDisplay').textContent = next.toFixed(1) + '배';
}
```

- [ ] **Step 2: `_bankSyncRatioUI` 교체**

`js/bank.js` 157-162행을 아래로 교체한다:

```javascript
function _bankSyncRatioUI() {
    ['long', 'mid', 'short'].forEach(t => {
        const el = document.getElementById('bank' + _bankCap(t) + 'RatioDisplay');
        if (el) el.textContent = _bank.settings[t].toFixed(1) + '배';
        const teamEl = document.getElementById('bankTeam' + _bankCap(t) + 'RatioDisplay');
        if (teamEl) teamEl.textContent = _bank.teamSettings[t].toFixed(1) + '배';
    });
}
```

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bankAdjustRatio isTeam 파라미터 + _bankSyncRatioUI 팀 동기화"
```

---

### Task 3: HTML 모달 — 팀 우대 금리 섹션 추가

**Files:**
- Modify: `index.html:586-588` (bankRatioSection 닫는 태그 바로 앞)

- [ ] **Step 1: 팀 우대 금리 섹션 HTML 삽입**

`index.html`의 `bankRatioSection` 안, 마지막 `</div>` (short 카드 닫는 태그) 이후, `bankRatioSection` 닫는 `</div>` 직전에 아래를 삽입한다.

기존 586-588행:
```html
                        </div>
                    </div>
                </div>
```
(마지막 bank-ratio-card 닫기 → bankRatioSection 닫기 → modal-body 닫기)

`bankRatioSection`의 닫는 `</div>` (line 588) **바로 앞**에 아래 블록을 삽입한다:

```html
                        <div id="bankTeamRatioSection" style="display:none; margin-top:4px;">
                            <div class="bank-section-divider">🤝 팀 우대 금리 설정</div>
                            <div class="bank-ratio-card">
                                <div class="bank-ratio-title">장기 🏦 <span class="bank-ratio-sub">1라운드</span></div>
                                <div class="bank-stepper">
                                    <button class="bank-stepper-btn" onclick="bankAdjustRatio('long', -0.1, true)">▼</button>
                                    <div class="bank-stepper-val" id="bankTeamLongRatioDisplay">2.5배</div>
                                    <button class="bank-stepper-btn" onclick="bankAdjustRatio('long', 0.1, true)">▲</button>
                                </div>
                            </div>
                            <div class="bank-ratio-card">
                                <div class="bank-ratio-title">중기 ⏳ <span class="bank-ratio-sub">2라운드</span></div>
                                <div class="bank-stepper">
                                    <button class="bank-stepper-btn" onclick="bankAdjustRatio('mid', -0.1, true)">▼</button>
                                    <div class="bank-stepper-val" id="bankTeamMidRatioDisplay">2.0배</div>
                                    <button class="bank-stepper-btn" onclick="bankAdjustRatio('mid', 0.1, true)">▲</button>
                                </div>
                            </div>
                            <div class="bank-ratio-card">
                                <div class="bank-ratio-title">단기 ⚡ <span class="bank-ratio-sub">3라운드</span></div>
                                <div class="bank-stepper">
                                    <button class="bank-stepper-btn" onclick="bankAdjustRatio('short', -0.1, true)">▼</button>
                                    <div class="bank-stepper-val" id="bankTeamShortRatioDisplay">1.5배</div>
                                    <button class="bank-stepper-btn" onclick="bankAdjustRatio('short', 0.1, true)">▲</button>
                                </div>
                            </div>
                        </div>
```

- [ ] **Step 2: 커밋**

```bash
git add index.html
git commit -m "feat: 은행 모달 팀 우대 금리 섹션 HTML 추가"
```

---

### Task 4: HTML View 4 팀 상태 섹션 + CSS 추가

**Files:**
- Modify: `index.html:479-481` (bank-result-card 닫는 태그 앞)
- Modify: `style.css:705-706` (`.bank-status-pending` 이후)

- [ ] **Step 1: View 4에 팀 상태 섹션 추가**

`index.html` View4의 `bank-result-card` 닫는 `</div>` (`.bank-r-total` 행 아래, 약 line 480) **바로 앞**에 아래를 삽입한다:

```html
                    <div id="bankTeamStatusSection" style="display:none;">
                        <div class="bank-result-row">
                            <span class="bank-r-label">팀 진행 상태</span>
                            <span class="bank-r-value bank-team-progress-badge" id="bankRTeamBadge">—</span>
                        </div>
                        <div class="bank-result-row">
                            <span class="bank-r-label">팀 합산</span>
                            <span class="bank-r-value" id="bankRTeamPreview">—</span>
                        </div>
                    </div>
```

그리고 `bank-result-card` 닫는 `</div>` **다음**, "다른 학생 예금 접수" 버튼 **전**에 아래를 삽입한다:

```html
                <div id="bankRTeamPendingMsg" class="bank-team-pending-msg" style="display:none;">
                    나머지 팀원이 신청하면 보상이 확정됩니다
                </div>
```

- [ ] **Step 2: CSS 추가**

`style.css` 705행 (`.bank-status-pending { ... }` 이후, 빈 줄 뒤)에 아래를 삽입한다:

```css
        .bank-team-progress-badge {
            background: #E3F2FD; color: #1565C0;
            padding: 2px 8px; border-radius: 10px; font-size: 13px; font-weight: 700;
        }
        .bank-team-pending-msg {
            text-align: center; font-size: 13px; color: #888;
            margin-top: 10px; padding: 8px 12px;
            background: #FFF8E1; border-radius: 8px;
        }
```

- [ ] **Step 3: 커밋**

```bash
git add index.html style.css
git commit -m "feat: View4 팀 상태 섹션 HTML + 뱃지 CSS 추가"
```

---

### Task 5: `_bankSelectGame` + `_bankResetModal` — 팀 게임 감지

**Files:**
- Modify: `js/bank.js:80-90` (`_bankResetModal`)
- Modify: `js/bank.js:130` (`onBankDateChange` 내 card.onclick)
- Modify: `js/bank.js:139-148` (`_bankSelectGame`)

- [ ] **Step 1: `_bankResetModal` 업데이트**

`js/bank.js` 80-90행(`_bankResetModal` 함수 전체)을 아래로 교체한다:

```javascript
function _bankResetModal() {
    document.getElementById('bankDateSelect').innerHTML =
        '<option value="">-- 날짜를 선택하세요 --</option>';
    document.getElementById('bankGameCardsGrid').innerHTML = '';
    document.getElementById('bankGameLoading').style.display = 'none';
    document.getElementById('bankStep1Btn').disabled = true;
    document.getElementById('bankStep1Btn').textContent = '설정 완료';
    document.getElementById('bankRatioSection').style.display = 'none';
    const teamSection = document.getElementById('bankTeamRatioSection');
    if (teamSection) teamSection.style.display = 'none';
    _bank.gameId   = null;
    _bank.gameDate = null;
    _bank.gameType = null;
}
```

- [ ] **Step 2: `onBankDateChange` 내 card.onclick에 `g.game_type` 전달**

`js/bank.js` 130행:
```javascript
            card.onclick = () => _bankSelectGame(g.game_id, date, g.section_num, card);
```
를 아래로 교체한다:
```javascript
            card.onclick = () => _bankSelectGame(g.game_id, date, g.section_num, g.game_type, card);
```

- [ ] **Step 3: `_bankSelectGame` 교체**

`js/bank.js` 139-148행 전체를 아래로 교체한다:

```javascript
function _bankSelectGame(gameId, date, sectionNum, gameType, cardEl) {
    document.querySelectorAll('#bankGameCardsGrid .past-game-card')
        .forEach(c => c.classList.remove('bank-selected'));
    cardEl.classList.add('bank-selected');
    _bank.gameId     = gameId;
    _bank.gameDate   = date;
    _bank.sectionNum = sectionNum;
    _bank.gameType   = gameType;
    document.getElementById('bankRatioSection').style.display = 'block';
    const teamSection = document.getElementById('bankTeamRatioSection');
    if (teamSection) teamSection.style.display = gameType === 'team' ? 'block' : 'none';
    document.getElementById('bankStep1Btn').disabled = false;
}
```

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "feat: 은행 모달 팀 게임 감지 및 우대 금리 섹션 표시"
```

---

### Task 6: `bankStep1Complete` + `_bankRenderPlayerList` — 뱃지 + 분리 추적

**Files:**
- Modify: `js/bank.js:164-271`

- [ ] **Step 1: `bankStep1Complete` 내 초기화 코드 교체**

`js/bank.js` 187-188행:
```javascript
        _bank.completed = {};
        _bank.viewMode  = 'team';
```
를 아래로 교체한다:
```javascript
        _bank.indivCompleted = {};
        _bank.teamDeposits   = {};
        _bank.viewMode       = 'team';
```

- [ ] **Step 2: `_bankRenderPlayerList` 전체 교체**

`js/bank.js` 206-271행 전체를 아래로 교체한다:

```javascript
function _bankRenderPlayerList() {
    const grid   = document.getElementById('bankPlayerGrid');
    const isTeam = _bank.players.some(p => p.team_name);
    grid.innerHTML = '';

    const tabBar = document.getElementById('bankTabBar');
    tabBar.style.display = isTeam ? 'flex' : 'none';
    if (isTeam) {
        document.getElementById('bankTabTeam').classList.toggle('active', _bank.viewMode === 'team');
        document.getElementById('bankTabIndiv').classList.toggle('active', _bank.viewMode === 'individual');
    }

    grid.classList.toggle('is-team', isTeam && _bank.viewMode === 'team');

    const isTeamTab = isTeam && _bank.viewMode === 'team';

    function _getPlayerDone(p, idx) {
        if (isTeamTab) {
            const td = _bank.teamDeposits[p.team_name];
            return (td && td.members && td.members[idx] !== undefined) ? { type: td.type } : null;
        }
        return _bank.indivCompleted[idx] || null;
    }

    function _bankMakePlayerCard(p, idx) {
        const done     = _getPlayerDone(p, idx);
        const card     = document.createElement('div');
        card.className = 'bank-player-card' + (done ? ' completed' : '');
        const typeTag   = done ? `<span class="bank-status-type">${_BANK_TYPE[done.type].label}</span>` : '';
        const statusTag = done
            ? `<span class="bank-status-done">신청 완료</span>`
            : `<span class="bank-status-pending">신청 전</span>`;
        card.innerHTML = `
            <div class="bank-player-nickname">${p.nickname}</div>
            <div class="bank-player-realname">${p.real_name}</div>
            <div class="bank-player-status">
                <span class="bank-player-efti">${p.default_efti || 'FAEN'}</span>
                ${typeTag}
                ${statusTag}
            </div>`;
        card.onclick = () => bankSelectPlayer(idx);
        return card;
    }

    if (!isTeam || _bank.viewMode === 'individual') {
        _bank.players.forEach((p, idx) => grid.appendChild(_bankMakePlayerCard(p, idx)));
        return;
    }

    const teams = new Map();
    _bank.players.forEach((p, idx) => {
        const key = p.team_name;
        if (!teams.has(key)) teams.set(key, []);
        teams.get(key).push({ p, idx });
    });

    teams.forEach((members, teamKey) => {
        const teamSize     = members.length;
        const td           = _bank.teamDeposits[teamKey];
        const completedCnt = td && td.members ? Object.keys(td.members).length : 0;
        const allDone      = completedCnt === teamSize;

        const groupEl = document.createElement('div');
        groupEl.className = 'team-group' + (allDone ? ' team-done' : '');

        const header = document.createElement('div');
        header.className = 'team-group-header';
        header.innerHTML = `${teamKey || '무소속'} <span class="bank-team-progress-badge">[${completedCnt}/${teamSize}]</span>`;
        groupEl.appendChild(header);

        const playersEl = document.createElement('div');
        playersEl.className = 'team-group-players';
        members.forEach(({ p, idx }) => playersEl.appendChild(_bankMakePlayerCard(p, idx)));

        groupEl.appendChild(playersEl);
        grid.appendChild(groupEl);
    });
}
```

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bank 플레이어 그리드 팀/개인 분리 추적 + [0/2] 뱃지"
```

---

### Task 7: `bankSelectPlayer` + `bankPickType` + `_bankUpdatePreview` — 팀 폼 동기화

**Files:**
- Modify: `js/bank.js:273-319`

- [ ] **Step 1: `bankSelectPlayer` 전체 교체**

`js/bank.js` 273-291행 전체를 아래로 교체한다:

```javascript
function bankSelectPlayer(idx) {
    const p = _bank.players[idx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    // 이미 신청 완료된 플레이어는 폼을 열지 않음
    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        if (td && td.members && td.members[idx] !== undefined) return;
    } else {
        if (_bank.indivCompleted[idx]) return;
    }

    _bank.currentPlayerIdx = idx;
    document.getElementById('bankDepositPlayerName').textContent =
        `${p.nickname}(${p.real_name})의 예금 신청`;

    _bank.deposit = { type: null, amount: 1000 };
    document.querySelectorAll('.bank-type-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('bankAmountDisplay').textContent = '1,000원';
    document.getElementById('bankPreviewBox').textContent = '종류를 선택하면 미리보기가 나와요!';

    // 팀/개인 배율을 예금 종류 카드에 표시
    const ratioStore = isTeamTab ? _bank.teamSettings : _bank.settings;
    ['long', 'mid', 'short'].forEach(t => {
        const el = document.getElementById('bankTcInfo' + _bankCap(t));
        if (el) el.textContent = ratioStore[t].toFixed(1) + '배';
    });

    // 팀 탭: 팀이 이미 선택한 종류 미리 선택
    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        if (td && td.type) {
            _bank.deposit.type = td.type;
            document.getElementById('bankTc' + _bankCap(td.type)).classList.add('selected');
            _bankUpdatePreview();
        }
    }

    _bankShowView(3);
}
```

- [ ] **Step 2: `bankPickType` 교체**

`js/bank.js` 298-303행 전체를 아래로 교체한다:

```javascript
function bankPickType(t) {
    _bank.deposit.type = t;
    document.querySelectorAll('.bank-type-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('bankTc' + _bankCap(t)).classList.add('selected');

    // 팀 탭: 팀 공유 타입 업데이트
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

- [ ] **Step 3: `_bankUpdatePreview` 교체**

`js/bank.js` 313-319행 전체를 아래로 교체한다:

```javascript
function _bankUpdatePreview() {
    const { type, amount } = _bank.deposit;
    const box = document.getElementById('bankPreviewBox');
    if (!type) { box.textContent = '종류를 먼저 선택해주세요'; return; }

    const p = _bank.players[_bank.currentPlayerIdx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        const alreadySum = td && td.members
            ? Object.values(td.members).reduce((a, b) => a + b, 0) : 0;
        const totalPrincipal = alreadySum + amount;
        const totalMatured   = Math.round(totalPrincipal * _bank.teamSettings[type]);
        box.textContent = `${totalPrincipal.toLocaleString()}원 → 💰 ${totalMatured.toLocaleString()}원`;
    } else {
        const out = Math.round(amount * _bank.settings[type]);
        box.textContent = `${amount.toLocaleString()}원 → 💰 ${out.toLocaleString()}원`;
    }
}
```

- [ ] **Step 4: 커밋**

```bash
git add js/bank.js
git commit -m "feat: bank 팀 폼 종류 공유 + 팀 합산 미리보기"
```

---

### Task 8: `bankStep2Submit` — 팀/개인 분리 + N/1 보상 분배

**Files:**
- Modify: `js/bank.js:321-341`

- [ ] **Step 1: `bankStep2Submit` + `_bankSubmitIndividual` + `_bankSubmitTeam` 교체**

`js/bank.js` 321-341행 전체를 아래로 교체한다:

```javascript
async function bankStep2Submit() {
    if (!_bank.deposit.type) { alert('예금 종류를 선택해주세요'); return; }
    const { type, amount } = _bank.deposit;
    const p = _bank.players[_bank.currentPlayerIdx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;
    if (isTeamTab) {
        _bankSubmitTeam(p, type, amount);
    } else {
        _bankSubmitIndividual(p, type, amount);
    }
}

function _bankSubmitIndividual(p, type, amount) {
    const ratio    = _bank.settings[type];
    const maturity = Math.round(amount * ratio);
    const interest = maturity - amount;

    sbSaveDepositReward(_bank.gameId, p.nickname, interest).catch(console.error);
    _bank.indivCompleted[_bank.currentPlayerIdx] = { type, amount };

    document.getElementById('bankTeamStatusSection').style.display = 'none';
    document.getElementById('bankRTeamPendingMsg').style.display   = 'none';

    document.getElementById('bankResultRoundBadge').textContent = _BANK_TYPE[type].round;
    document.getElementById('bankRType').textContent      = _BANK_TYPE[type].label;
    document.getElementById('bankRPlayer').textContent    = `${p.nickname} (${p.real_name})`;
    document.getElementById('bankRPrincipal').textContent = amount.toLocaleString() + '원';
    document.getElementById('bankRInterest').textContent  = interest.toLocaleString() + '원';
    document.getElementById('bankRTotal').textContent     = maturity.toLocaleString() + '원';

    _bankShowView(4);
}

function _bankSubmitTeam(p, type, amount) {
    const teamName = p.team_name;
    if (!_bank.teamDeposits[teamName]) {
        _bank.teamDeposits[teamName] = { type, members: {} };
    }
    _bank.teamDeposits[teamName].type = type;
    _bank.teamDeposits[teamName].members[_bank.currentPlayerIdx] = amount;

    const teamMembers  = _bank.players.filter(pl => pl.team_name === teamName);
    const teamSize     = teamMembers.length;
    const td           = _bank.teamDeposits[teamName];
    const completedCnt = Object.keys(td.members).length;
    const allDone      = completedCnt === teamSize;

    const totalPrincipal = Object.values(td.members).reduce((a, b) => a + b, 0);
    const totalMatured   = Math.round(totalPrincipal * _bank.teamSettings[type]);

    let perMemberReward = null;
    if (allDone) {
        const totalInterest = totalMatured - totalPrincipal;
        perMemberReward = Math.floor(totalInterest / teamSize);
        teamMembers.forEach(pl => {
            sbSaveDepositReward(_bank.gameId, pl.nickname, perMemberReward).catch(console.error);
        });
    }

    document.getElementById('bankResultRoundBadge').textContent = _BANK_TYPE[type].round;
    document.getElementById('bankRType').textContent      = _BANK_TYPE[type].label;
    document.getElementById('bankRPlayer').textContent    = `${p.nickname} (${p.real_name})`;
    document.getElementById('bankRPrincipal').textContent = amount.toLocaleString() + '원';

    if (allDone) {
        document.getElementById('bankRInterest').textContent = perMemberReward.toLocaleString() + '원 (팀 균등 분배)';
        document.getElementById('bankRTotal').textContent    = (amount + perMemberReward).toLocaleString() + '원';
    } else {
        document.getElementById('bankRInterest').textContent = '팀 완료 후 확정';
        document.getElementById('bankRTotal').textContent    = '팀 완료 후 확정';
    }

    document.getElementById('bankTeamStatusSection').style.display = 'block';
    document.getElementById('bankRTeamBadge').textContent   = `[${completedCnt}/${teamSize}]`;
    document.getElementById('bankRTeamPreview').textContent = `${totalPrincipal.toLocaleString()}원 → ${totalMatured.toLocaleString()}원`;
    document.getElementById('bankRTeamPendingMsg').style.display = allDone ? 'none' : 'block';

    _bankShowView(4);
}
```

- [ ] **Step 2: 브라우저에서 수동 검증**

`index.html`을 Chrome에서 열고 아래 시나리오를 순서대로 확인한다:

1. **팀전 게임 선택 시**: 모달에서 "팀전" 분반 선택 → "팀 우대 금리 설정" 섹션이 나타나는지 확인. 배율 기본값 장기 2.5배 / 중기 2.0배 / 단기 1.5배 확인.
2. **개인전 게임 선택 시**: "팀 우대 금리 설정" 섹션이 숨겨지는지 확인.
3. **팀 탭 뱃지**: 은행 화면에서 팀 탭을 보면 팀 그룹 헤더에 `[0/2]` 뱃지가 보이는지 확인.
4. **팀 예금 신청 흐름**:
   - 팀원 A 선택 → 중기 선택 → 1,000원 설정 → 미리보기 `1,000원 → 💰 2,000원` 확인
   - 팀원 A 신청 → View4에 `[1/2]` 뱃지 + "팀 완료 후 확정" 확인
   - 팀 탭으로 돌아가면 헤더 뱃지 `[1/2]` 확인
   - 팀원 B 선택 → 중기 자동 선택 확인 → 2,000원 → 미리보기 `3,000원 → 💰 6,000원` 확인
   - 팀원 B 신청 → View4에 `[2/2]` 뱃지 + 이자 "1,500원 (팀 균등 분배)" 확인
5. **개인 탭 독립**: 팀 탭에서 신청 후 개인 탭으로 전환 → 플레이어들이 모두 "신청 전" 상태인지 확인.
6. **완료된 플레이어 클릭 차단**: 팀 탭에서 이미 신청한 팀원 클릭 시 폼이 열리지 않는지 확인.
7. **배율 저장**: 팀 우대 금리 조정 후 페이지 새로고침 → 설정값 유지 확인.

- [ ] **Step 3: 커밋**

```bash
git add js/bank.js
git commit -m "feat: 팀 예금 N/1 보상 분배 + 팀/개인 신청 완전 분리"
```

---

## 완료 기준

- [ ] 팀전 게임 선택 시 팀 우대 금리 섹션 표시
- [ ] 팀 탭과 개인 탭의 예금 신청이 서로 독립적
- [ ] 팀 그룹 헤더에 `[0/2]` / `[1/2]` / `[2/2]` 뱃지 표시
- [ ] 팀원 1명 신청 시 View4에 "팀 완료 후 확정" 표시
- [ ] 팀원 전체 신청 시 N/1 이자 분배 후 DB 저장
- [ ] 미리보기가 팀 합산 원금 → 합산 만기 기준으로 표시
- [ ] 배율 설정 localStorage 영속화 (팀 배율 포함)
