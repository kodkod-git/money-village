# 명예의 전당 game_variant 탭 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 명예의 전당(fameScreen)에서 기본/심화/부자의그릇 탭을 추가해 game_variant별로 랭킹을 분리 표시한다.

**Architecture:** `sbLoadHallOfFame()`에서 `game_info`를 함께 조회해 `game_id → game_variant` 맵을 만들고 각 레코드에 부착한다. JS에서 `currentFameVariant` 상태 변수로 탭 전환 시 필터링하며, DB 추가 요청 없이 즉각 전환된다.

**Tech Stack:** Vanilla JS, Supabase JS SDK (`_sb`), HTML/CSS

---

## File Map

| 파일 | 변경 유형 | 책임 |
|---|---|---|
| `js/supabase-client.js` | 수정 | `sbLoadHallOfFame()` — game_info 조회 추가, variant 부착 |
| `js/fame.js` | 수정 | 탭 상태 관리, `switchFameTab()`, `renderFame()` 필터 추가 |
| `index.html` | 수정 | 탭 버튼 3개 HTML 추가 |
| `style.css` | 수정 | `.fame-tabs`, `.fame-tab-btn` 스타일 추가 |

---

### Task 1: `sbLoadHallOfFame()` — game_variant 부착

**Files:**
- Modify: `js/supabase-client.js` — `sbLoadHallOfFame()` 함수 (607-613줄)

- [ ] **Step 1: 현재 함수 확인**

`js/supabase-client.js` 607-613줄을 읽어 현재 구현 확인:
```js
async function sbLoadHallOfFame() {
    const [{ data: indiv }, { data: team }] = await Promise.all([
        _sb.from('game_individual').select('*').order('total_asset', { ascending: false }).limit(200),
        _sb.from('game_team').select('*').order('team_total_asset', { ascending: false }).limit(200)
    ]);
    return { indiv: indiv || [], team: team || [] };
}
```

- [ ] **Step 2: `sbLoadHallOfFame()` 수정**

아래 코드로 교체한다:

```js
async function sbLoadHallOfFame() {
    const [{ data: gameInfoList }, { data: indiv }, { data: team }] = await Promise.all([
        _sb.from('game_info').select('game_id, game_variant'),
        _sb.from('game_individual').select('*').order('total_asset', { ascending: false }).limit(200),
        _sb.from('game_team').select('*').order('team_total_asset', { ascending: false }).limit(200)
    ]);
    const variantMap = Object.fromEntries(
        (gameInfoList || []).map(r => [r.game_id, r.game_variant || 'basic'])
    );
    const indivWithVariant = (indiv || []).map(r => ({ ...r, game_variant: variantMap[r.game_id] || 'basic' }));
    const teamWithVariant  = (team  || []).map(r => ({ ...r, game_variant: variantMap[r.game_id] || 'basic' }));
    return { indiv: indivWithVariant, team: teamWithVariant };
}
```

- [ ] **Step 3: 브라우저 콘솔 확인**

`index.html`을 열고 명예의 전당 화면으로 이동 후 콘솔에서:
```js
sbLoadHallOfFame().then(d => console.log(d.indiv[0]))
```
출력된 객체에 `game_variant` 필드가 `'basic'` / `'advanced'` / `'rich_vessel'` 중 하나로 포함되어 있으면 OK.

- [ ] **Step 4: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: sbLoadHallOfFame에 game_variant 필드 추가"
```

---

### Task 2: `fame.js` — 탭 상태 및 필터링 로직

**Files:**
- Modify: `js/fame.js`

- [ ] **Step 1: `currentFameVariant` 상태 변수 추가**

`fame.js` 맨 위(1줄 앞)에 삽입:

```js
let currentFameVariant = 'basic';
```

- [ ] **Step 2: `switchFameTab()` 함수 추가**

`showFameScreen()` 함수 바로 아래에 추가:

```js
function switchFameTab(variant) {
    currentFameVariant = variant;
    document.querySelectorAll('.fame-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.variant === variant);
    });
    renderFame();
}
```

- [ ] **Step 3: `showFameScreen()` — 탭 초기화 추가**

`showFameScreen()` 내 `fetchFameData()` 호출 전에 아래 두 줄 삽입:

```js
currentFameVariant = 'basic';
document.querySelectorAll('.fame-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.variant === 'basic');
});
```

- [ ] **Step 4: `renderFame()` — variant 필터 추가**

기존:
```js
function renderFame() {
    fameIndivData.sort((a,b) => b.total - a.total);
    fameTeamData.sort((a,b) => b.total - a.total);

    renderRankingTable(fameIndivData.slice(0, 10), 'indivTableBody', false);
    renderRankingTable(fameTeamData.slice(0, 5), 'teamTableBody', true);
    setSpecialAwards(fameIndivData);
}
```

아래로 교체:
```js
function renderFame() {
    const indiv = fameIndivData
        .filter(d => d.game_variant === currentFameVariant)
        .sort((a, b) => b.total - a.total);
    const team = fameTeamData
        .filter(d => d.game_variant === currentFameVariant)
        .sort((a, b) => b.total - a.total);

    renderRankingTable(indiv.slice(0, 10), 'indivTableBody', false);
    renderRankingTable(team.slice(0, 5), 'teamTableBody', true);
    setSpecialAwards(indiv);
}
```

- [ ] **Step 5: 브라우저 동작 확인 (HTML 추가 전 임시 테스트)**

콘솔에서 직접 실행해 렌더링이 바뀌는지 확인:
```js
switchFameTab('advanced')
// 심화 데이터만 테이블에 표시되어야 함
switchFameTab('basic')
// 기본 데이터로 복귀해야 함
```

- [ ] **Step 6: 커밋**

```bash
git add js/fame.js
git commit -m "feat: 명예의 전당 variant 탭 상태 및 필터링 로직 추가"
```

---

### Task 3: `index.html` — 탭 버튼 UI 추가

**Files:**
- Modify: `index.html` — fameScreen 내 랭킹 섹션 상단

- [ ] **Step 1: 탭 삽입 위치 확인**

`index.html`에서 `indivTableBody`가 포함된 테이블을 찾는다. 해당 테이블을 감싸는 섹션(개인 랭킹 섹션) 바로 위에 탭 div를 삽입한다.

현재 구조 (약 322~344줄):
```html
<div class="fame-section">
    <div class="section-title">🏅 개인 랭킹 Top 10</div>
    <table class="ranking-table">
        ...
        <tbody id="indivTableBody"></tbody>
    </table>
```

- [ ] **Step 2: 탭 버튼 삽입**

`<div class="fame-section">` 바로 위에 아래 HTML 추가:

```html
<div class="fame-tabs">
    <button class="fame-tab-btn active" data-variant="basic"       onclick="switchFameTab('basic')">기본</button>
    <button class="fame-tab-btn"        data-variant="advanced"    onclick="switchFameTab('advanced')">심화</button>
    <button class="fame-tab-btn"        data-variant="rich_vessel" onclick="switchFameTab('rich_vessel')">부자의그릇</button>
</div>
```

- [ ] **Step 3: 브라우저에서 탭 클릭 확인**

명예의 전당 화면에서 탭 3개가 보이고, 클릭 시 테이블 내용이 해당 variant 데이터로 교체되어야 한다. 아직 스타일이 없어도 기능은 동작해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -m "feat: 명예의 전당 variant 탭 버튼 HTML 추가"
```

---

### Task 4: `style.css` — 탭 스타일

**Files:**
- Modify: `style.css` — fameScreen 관련 CSS 섹션 끝에 추가

- [ ] **Step 1: 탭 스타일 추가**

`style.css`에서 fameScreen 관련 CSS 블록 끝을 찾아 아래를 추가한다:

```css
/* [화면 4] 명예의 전당 — variant 탭 */
.fame-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.fame-tab-btn {
    padding: 6px 18px;
    border-radius: 20px;
    border: 2px solid #ddd;
    background: #f5f5f5;
    font-weight: 700;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
}

.fame-tab-btn:hover {
    border-color: #bbb;
    background: #ebebeb;
}

.fame-tab-btn.active[data-variant="basic"] {
    background: #e3f2fd;
    border-color: #2196f3;
    color: #1565c0;
}

.fame-tab-btn.active[data-variant="advanced"] {
    background: #f3e5f5;
    border-color: #9c27b0;
    color: #6a1b9a;
}

.fame-tab-btn.active[data-variant="rich_vessel"] {
    background: #fff8e1;
    border-color: #ff9800;
    color: #e65100;
}
```

- [ ] **Step 2: 최종 브라우저 확인**

1. 명예의 전당 화면 진입 → 기본 탭이 활성(파란색)으로 표시
2. 심화 탭 클릭 → 보라색 활성, 테이블에 심화 데이터만 표시
3. 부자의그릇 탭 클릭 → 주황색 활성, 데이터 없으면 "데이터가 없습니다." 표시
4. 다른 화면 이동 후 명예의 전당 재진입 → 기본 탭으로 초기화

- [ ] **Step 3: 커밋**

```bash
git add style.css
git commit -m "feat: 명예의 전당 variant 탭 스타일 추가"
```

---

## 완료 기준

- [ ] 탭 3개(기본/심화/부자의그릇)가 명예의 전당 상단에 표시됨
- [ ] 탭 클릭 시 해당 variant 데이터만 개인 랭킹, 팀 랭킹, 특별상에 반영됨
- [ ] 데이터 없는 variant는 "데이터가 없습니다." 표시
- [ ] 명예의 전당 재진입 시 기본 탭으로 초기화
- [ ] `game_variant` 미설정 레코드는 'basic'으로 폴백
