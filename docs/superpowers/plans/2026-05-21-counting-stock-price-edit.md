# 계수 화면 주식/부동산 가격 수정 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계수 화면의 "보유 주식/부동산" 카드에 ⚙️ 아이콘을 추가하고, 클릭 시 가격 수정 모달을 열어 변경 즉시 전체 플레이어 자산을 재계산하고 DB에 upsert한다.

**Architecture:** 기존 `modal-backdrop` + `.show` 패턴으로 팝업을 구현하고, setup 화면의 `initStockConfig()` 구조(`stock-input-item` 그리드)를 그대로 재사용한다. `supabase-client.js`에 `sbUpdateStockPrice(gameId, stockValues)` (upsert)를 추가하고, `counting.js`에 모달 열기/저장/닫기 함수를 추가한다.

**Tech Stack:** Vanilla JS, HTML5, Supabase JS SDK v2

---

## 파일 변경 맵

| 파일 | 작업 |
|---|---|
| `js/supabase-client.js` | `sbUpdateStockPrice` 함수 추가 |
| `index.html` | 카드 헤더 ⚙️ 버튼 + `#stockPriceEditModal` 모달 추가 |
| `js/counting.js` | `openStockPriceEditModal`, `saveStockPriceEdit`, `closeStockPriceEditModal`, `handleStockPriceEditBackdrop` 추가 |

---

## Task 1: sbUpdateStockPrice 함수 추가

**Files:**
- Modify: `js/supabase-client.js:117` (sbSaveStockValue 함수 바로 뒤에 삽입)

- [ ] **Step 1: `sbSaveStockValue` 함수 끝 위치 확인**

`js/supabase-client.js`를 열어 `sbSaveStockValue` 함수가 끝나는 줄(117번 줄 근처, `return gameId;` 다음 `}`)을 확인한다.

- [ ] **Step 2: `sbUpdateStockPrice` 함수 추가**

`sbSaveStockValue` 함수의 닫는 `}` 바로 뒤에 아래 코드를 삽입한다:

```javascript
async function sbUpdateStockPrice(gameId, stockValues) {
    if (!gameId) return null;
    const { error } = await _sb.from('stock_price').upsert({
        game_id: gameId,
        sasung:  Number(stockValues[0] ?? 1500),
        lgi:     Number(stockValues[1] ?? 600),
        skei:    Number(stockValues[2] ?? 1600),
        cacao:   Number(stockValues[3] ?? 4000),
        hyunde:  Number(stockValues[4] ?? 6000),
        naber:   Number(stockValues[5] ?? 7000)
    }, { onConflict: 'game_id' });
    if (error) { console.error('[sbUpdateStockPrice]', error); return null; }
    return gameId;
}
```

- [ ] **Step 3: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: sbUpdateStockPrice upsert 함수 추가"
```

---

## Task 2: index.html — 카드 헤더 수정 + 모달 HTML 추가

**Files:**
- Modify: `index.html:123-126` (count-card 카드 헤더 부분)
- Modify: `index.html:927` (finishConfirmModal 닫는 태그 뒤에 모달 삽입)

- [ ] **Step 1: 카드 헤더에 ⚙️ 버튼 추가**

`index.html` 124번 줄 근처의 아래 코드를:

```html
<div class="count-card">
    <h4 id="cntAssetCardTitle">보유 주식 (4R 현재가)</h4>
    <div class="portfolio-grid-sm" id="stockGridSm"></div>
</div>
```

다음으로 교체한다:

```html
<div class="count-card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h4 id="cntAssetCardTitle" style="margin:0;">보유 주식 (4R 현재가)</h4>
        <button onclick="openStockPriceEditModal()" style="background:none; border:none; cursor:pointer; font-size:18px; padding:2px 4px;" title="가격 수정">⚙️</button>
    </div>
    <div class="portfolio-grid-sm" id="stockGridSm"></div>
</div>
```

- [ ] **Step 2: 가격 수정 모달 HTML 추가**

`finishConfirmModal` 닫는 `</div>` 바로 뒤(927번 줄 근처)에 삽입:

```html
<!-- 주식/부동산 가격 수정 모달 -->
<div id="stockPriceEditModal" class="modal-backdrop" onclick="handleStockPriceEditBackdrop(event)">
    <div class="modal-card" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h3 id="stockPriceEditTitle">📈 주식 가격 수정</h3>
        </div>
        <div class="modal-body">
            <div class="stock-inputs-grid" id="stockPriceEditInputs"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-danger" onclick="closeStockPriceEditModal()">닫기</button>
            <button class="btn btn-success" onclick="saveStockPriceEdit()">💾 저장</button>
        </div>
    </div>
</div>
```

- [ ] **Step 3: 브라우저에서 확인**

`index.html`을 Chrome으로 열어 계수 화면으로 이동한다. "보유 주식" 카드 오른쪽 상단에 ⚙️ 버튼이 보이는지 확인한다 (클릭해도 아직 동작 안 함).

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -m "feat: 계수 화면 주식 카드에 가격 수정 모달 HTML 추가"
```

---

## Task 3: counting.js — 모달 함수 4개 추가

**Files:**
- Modify: `js/counting.js` (파일 끝 `}` 닫힘 직전에 추가)

- [ ] **Step 1: 모달 열기/닫기/백드롭 함수 3개 추가**

`counting.js` 마지막 함수(`toggleSuccessFactor`) 뒤에 아래 코드를 추가한다:

```javascript
function openStockPriceEditModal() {
    const isBasic = currentGameVariant === 'basic';
    const title = document.getElementById('stockPriceEditTitle');
    if (title) title.textContent = isBasic ? '📈 주식 가격 수정' : '🏠 부동산 가격 수정';

    const grid = document.getElementById('stockPriceEditInputs');
    grid.innerHTML = '';
    const info = getActiveAssetInfo();
    for (let k in info) {
        grid.innerHTML += `<div class="stock-input-item">
            <label>${info[k].name}</label>
            <input type="number" id="cnt_price_${k}" value="${info[k].price}" min="0">
        </div>`;
    }
    document.getElementById('stockPriceEditModal').classList.add('show');
}

function closeStockPriceEditModal() {
    document.getElementById('stockPriceEditModal').classList.remove('show');
}

function handleStockPriceEditBackdrop(e) {
    if (e.target === document.getElementById('stockPriceEditModal')) closeStockPriceEditModal();
}
```

- [ ] **Step 2: 브라우저에서 모달 열림 확인**

Chrome에서 계수 화면 → ⚙️ 클릭 → 모달이 열리고 종목명/현재가 입력란이 표시되는지 확인한다. 닫기 버튼과 배경 클릭으로 닫히는지 확인한다.

- [ ] **Step 3: saveStockPriceEdit 함수 추가**

`handleStockPriceEditBackdrop` 뒤에 추가:

```javascript
async function saveStockPriceEdit() {
    const info = getActiveAssetInfo();
    const prices = [];
    for (let k in info) {
        const val = parseInt(document.getElementById(`cnt_price_${k}`)?.value) || info[k].price;
        info[k].price = val;
        prices.push(val);
    }

    // 카드 내 단가 텍스트 갱신
    initAssetGrid('stockGridSm', false, true);

    // 전체 플레이어 total 재계산
    players.forEach(p => {
        p.total = (p.manualCash || 0) + calcActiveAsset(p.assets)
                + (p.diligenceReward || 0) + (p.depositReward || 0) + (p.questReward || 0);
    });
    recalculateAllRankings();
    updateDash();

    // DB 저장 (샘플 모드이거나 gameId 없으면 스킵)
    const gameId = players[0]?.gameId;
    if (gameId && !isSampleMode) {
        await sbUpdateStockPrice(gameId, prices);
    }

    closeStockPriceEditModal();
}
```

- [ ] **Step 4: 전체 동작 수동 검증**

1. Chrome에서 게임 시작 (basic 모드)
2. 계수 화면에서 ⚙️ 클릭 → "📈 주식 가격 수정" 모달 확인
3. SASUNG 가격을 1,500 → 3,000으로 변경 후 💾 저장
4. 카드 내 "1개: 3,000원" 텍스트가 갱신되는지 확인
5. 대시보드 총 자산 합계가 즉시 재계산되는지 확인
6. advanced/rich_vessel 모드로 게임 시작 후 동일 동작 확인
   - 모달 타이틀이 "🏠 부동산 가격 수정"인지 확인
   - 부동산 목록 6개가 표시되는지 확인

- [ ] **Step 5: 커밋**

```bash
git add js/counting.js
git commit -m "feat: 계수 화면 주식/부동산 가격 수정 모달 기능 구현"
```

---

## Spec 커버리지 체크

| 요구사항 | 구현 Task |
|---|---|
| ⚙️ 아이콘 버튼 (카드 오른쪽 상단) | Task 2 Step 1 |
| 팝업 형태 모달 | Task 2 Step 2 |
| 주식/부동산 가격 입력 (setup과 동일 구조) | Task 3 Step 1 |
| 모드에 따른 모달 타이틀 (주식/부동산) | Task 3 Step 1 |
| 저장 버튼 | Task 2 Step 2 |
| stockInfo/estateInfo 즉시 반영 | Task 3 Step 3 |
| 전체 플레이어 total 재계산 | Task 3 Step 3 |
| 화면 즉시 갱신 (updateDash) | Task 3 Step 3 |
| DB upsert 반영 | Task 1 + Task 3 Step 3 |
| isSampleMode 가드 | Task 3 Step 3 |
