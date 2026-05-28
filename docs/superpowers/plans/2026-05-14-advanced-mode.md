# 심화 모드(부자의 그릇) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 머니빌리지 게임에 심화(부자의 그릇) 모드를 추가한다. 주식 대신 부동산 6종, 플레이스타일 대신 경제적 성공요소 6가지를 사용하며, 총자산에 성공요소 개수 기반 배율을 적용한다.

**Architecture:** `currentGameVariant = 'basic' | 'advanced'` 전역 변수를 추가해 기존 `currentMode`(개인/팀) 패턴과 동일하게 조건 분기한다. 각 화면(counting, report)은 이 변수를 읽어 주식↔부동산, 플레이스타일↔성공요소를 전환한다. DB는 Supabase에 테이블 3개 + 컬럼 1개를 추가한다.

**Tech Stack:** Vanilla JS (no build step), Supabase (PostgreSQL), html2pdf.js, Chrome Web Serial API

---

## Task 1: Supabase DB 스키마 추가

**Files:**
- (Supabase 대시보드 SQL Editor에서 실행)

- [ ] **Step 1: Supabase 대시보드 SQL Editor에서 아래 SQL 실행**

```sql
-- estate_price 테이블
CREATE TABLE estate_price (
  game_id     text PRIMARY KEY,
  nooridambi  integer NOT NULL DEFAULT 100000,
  damigorani  integer NOT NULL DEFAULT 100000,
  girugi      integer NOT NULL DEFAULT 100000,
  marusuri    integer NOT NULL DEFAULT 100000,
  chorongdam  integer NOT NULL DEFAULT 100000,
  haniyuwoo   integer NOT NULL DEFAULT 100000
);

-- estate_balance 테이블
CREATE TABLE estate_balance (
  game_id     text NOT NULL,
  nickname    text NOT NULL,
  nooridambi  integer NOT NULL DEFAULT 0,
  damigorani  integer NOT NULL DEFAULT 0,
  girugi      integer NOT NULL DEFAULT 0,
  marusuri    integer NOT NULL DEFAULT 0,
  chorongdam  integer NOT NULL DEFAULT 0,
  haniyuwoo   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, nickname)
);

-- success_factors 테이블
CREATE TABLE success_factors (
  game_id              text NOT NULL,
  nickname             text NOT NULL,
  financial_management boolean NOT NULL DEFAULT false,
  communication        boolean NOT NULL DEFAULT false,
  critical_thinking    boolean NOT NULL DEFAULT false,
  global_economy       boolean NOT NULL DEFAULT false,
  credit_trust         boolean NOT NULL DEFAULT false,
  entrepreneurship     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (game_id, nickname)
);

-- game_info 에 game_variant 컬럼 추가
ALTER TABLE game_info ADD COLUMN IF NOT EXISTS game_variant text NOT NULL DEFAULT 'basic';
```

- [ ] **Step 2: 각 테이블이 생성됐는지 확인**

Supabase Table Editor에서 `estate_price`, `estate_balance`, `success_factors` 테이블이 보이는지 확인. `game_info` 테이블에 `game_variant` 컬럼이 추가됐는지 확인.

---

## Task 2: app.js — 전역 상태·데이터·헬퍼 함수 추가

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: `currentGameVariant` 와 `estateInfo` 를 app.js 상단 변수 선언 영역에 추가**

기존 `const stockInfo = { ... };` 블록 바로 아래에 추가:

```javascript
let currentGameVariant = 'basic'; // 'basic' | 'advanced'

const estateInfo = {
    "NOORIDAMBI": { name: "누리담비 단독주택", price: 100000, color: "#4e7c3f" },
    "DAMIGORANI": { name: "다미고라니 단독주택", price: 100000, color: "#7b5ea7" },
    "GIRUGI":     { name: "기러기 다세대주택",   price: 100000, color: "#c0773d" },
    "MARUSURI":   { name: "마루수리 다세대주택", price: 100000, color: "#2e7d9b" },
    "CHORONGDAM": { name: "초롱담 아파트",       price: 100000, color: "#c94b4b" },
    "HANIYUWOO":  { name: "하늬여우 아파트",     price: 100000, color: "#3d7a5e" },
};

const SUCCESS_FACTORS = [
    { key: "financial_management", emo: "[coin]",  name: "재정관리능력" },
    { key: "communication",        emo: "[chat]",  name: "의사소통능력" },
    { key: "critical_thinking",    emo: "[think]", name: "비판적사고력" },
    { key: "global_economy",       emo: "[bulb]",  name: "글로벌경제이해력" },
    { key: "credit_trust",         emo: "[shake]", name: "신용과신뢰" },
    { key: "entrepreneurship",     emo: "[bld]",   name: "기업가정신" },
];
```

- [ ] **Step 2: `initTraitsState` 아래에 `initSuccessFactorsState` 추가**

```javascript
function initSuccessFactorsState() {
    const obj = {};
    SUCCESS_FACTORS.forEach(f => obj[f.key] = false);
    return obj;
}
```

- [ ] **Step 3: `calcStock` 아래에 `calcEstate`, `calcActiveAsset`, `calcSuccessMultiplier`, `getActiveAssetInfo` 추가**

기존 `function calcStock(a){ ... }` 바로 아래:

```javascript
function calcEstate(a) {
    let s = 0;
    for (let k in estateInfo) s += (a[k] || 0) * estateInfo[k].price;
    return s;
}

function calcActiveAsset(assets) {
    return currentGameVariant === 'advanced' ? calcEstate(assets) : calcStock(assets);
}

function calcSuccessMultiplier(sf) {
    return Object.values(sf || {}).filter(Boolean).length * 0.25;
}

function getActiveAssetInfo() {
    return currentGameVariant === 'advanced' ? estateInfo : stockInfo;
}
```

- [ ] **Step 4: `initAssets()` 를 모드에 따라 분기하도록 수정**

기존:
```javascript
function initAssets(){ return { "100":0,"500":0,"1000":0,"5000":0,"10000":0,"50000":0,"SASUNG":0,"LGI":0,"SKEI":0,"CACAO":0,"HYUNDE":0,"NABER":0 }; }
```

교체:
```javascript
function initAssets() {
    const bills = { "100":0,"500":0,"1000":0,"5000":0,"10000":0,"50000":0 };
    if (currentGameVariant === 'advanced') {
        const est = {};
        for (let k in estateInfo) est[k] = 0;
        return { ...bills, ...est };
    }
    return { ...bills, "SASUNG":0,"LGI":0,"SKEI":0,"CACAO":0,"HYUNDE":0,"NABER":0 };
}
```

- [ ] **Step 5: `applyInputsToPlayer()` 를 수정해 활성 자산 정보(stock or estate) 를 사용**

기존 함수의 stockInfo 반복 부분과 total 계산:

기존:
```javascript
    const stockPrefix = prefix === 'cnt' ? 'ui' : 'rpt';
    for (let k in stockInfo) {
        const input = document.getElementById(`${stockPrefix}_cnt_input_${k}`);
        if (input) {
            p.assets[k] = parseInt(input.value, 10) || 0;
        }
    }

    p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0) + (p.depositReward || 0) + (p.questReward || 0);
```

교체:
```javascript
    const stockPrefix = prefix === 'cnt' ? 'ui' : 'rpt';
    const activeInfo = getActiveAssetInfo();
    for (let k in activeInfo) {
        const input = document.getElementById(`${stockPrefix}_cnt_input_${k}`);
        if (input) {
            p.assets[k] = parseInt(input.value, 10) || 0;
        }
    }

    const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.depositReward || 0) + (p.questReward || 0);
    p.total = currentGameVariant === 'advanced'
        ? base * calcSuccessMultiplier(p.successFactors || {})
        : base;
```

- [ ] **Step 6: `recalculateAllRankings()` 에서 total 계산을 분기**

기존:
```javascript
    players.forEach(p => {
        p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
    });
```

교체:
```javascript
    players.forEach(p => {
        const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
        p.total = currentGameVariant === 'advanced'
            ? base * calcSuccessMultiplier(p.successFactors || {})
            : base;
    });
```

- [ ] **Step 7: 브라우저에서 열어 JS 오류 없는지 확인**

`index.html` 을 Chrome에서 열고 F12 콘솔에 오류가 없는지 확인. 기존 기본 게임 흐름(시작→계수→리포트)이 정상 동작하는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add js/app.js
git commit -m "feat: advanced mode 전역 상태, estateInfo, SUCCESS_FACTORS, 헬퍼 함수 추가"
```

---

## Task 3: supabase-client.js — 새 함수 추가 및 sbInitGame 수정

**Files:**
- Modify: `js/supabase-client.js`

- [ ] **Step 1: 파일 하단에 estate 및 success_factors 관련 함수 5개 추가**

`sbLoadTraitsByGameId` 함수 아래에 추가:

```javascript
// =========================================================
// 심화 모드: 부동산 & 성공요소
// =========================================================

async function sbSaveEstatePrice(gameId, prices) {
    const { error } = await _sb.from('estate_price').upsert({
        game_id:    String(gameId || '').trim(),
        nooridambi: Number(prices['NOORIDAMBI'] ?? 100000),
        damigorani: Number(prices['DAMIGORANI'] ?? 100000),
        girugi:     Number(prices['GIRUGI']     ?? 100000),
        marusuri:   Number(prices['MARUSURI']   ?? 100000),
        chorongdam: Number(prices['CHORONGDAM'] ?? 100000),
        haniyuwoo:  Number(prices['HANIYUWOO']  ?? 100000),
    }, { onConflict: 'game_id' });
    if (error) console.error('[sbSaveEstatePrice]', error);
}

async function sbSaveEstateBalance(nickname, gameId, assets) {
    const nick = _nick(nickname);
    const gid  = String(gameId || '').trim();
    if (!nick || !gid) return;
    const { error } = await _sb.from('estate_balance').upsert({
        nickname:   nick,
        game_id:    gid,
        nooridambi: Number(assets['NOORIDAMBI'] || 0),
        damigorani: Number(assets['DAMIGORANI'] || 0),
        girugi:     Number(assets['GIRUGI']     || 0),
        marusuri:   Number(assets['MARUSURI']   || 0),
        chorongdam: Number(assets['CHORONGDAM'] || 0),
        haniyuwoo:  Number(assets['HANIYUWOO']  || 0),
    }, { onConflict: 'game_id,nickname' });
    if (error) console.error('[sbSaveEstateBalance]', error);
}

async function sbLoadEstateBalance(nickname, gameId) {
    const { data } = await _sb
        .from('estate_balance').select('*')
        .eq('nickname', nickname).eq('game_id', gameId)
        .maybeSingle();
    if (!data) return null;
    return {
        NOORIDAMBI: data.nooridambi,
        DAMIGORANI: data.damigorani,
        GIRUGI:     data.girugi,
        MARUSURI:   data.marusuri,
        CHORONGDAM: data.chorongdam,
        HANIYUWOO:  data.haniyuwoo,
    };
}

async function sbSaveSuccessFactors(gameId, players) {
    if (!gameId) return;
    const rows = players
        .map(p => ({
            nickname:             _nick(p.nickname || ''),
            game_id:              String(gameId).trim(),
            financial_management: !!(p.successFactors && p.successFactors.financial_management),
            communication:        !!(p.successFactors && p.successFactors.communication),
            critical_thinking:    !!(p.successFactors && p.successFactors.critical_thinking),
            global_economy:       !!(p.successFactors && p.successFactors.global_economy),
            credit_trust:         !!(p.successFactors && p.successFactors.credit_trust),
            entrepreneurship:     !!(p.successFactors && p.successFactors.entrepreneurship),
        }))
        .filter(r => r.nickname);
    if (rows.length === 0) return;
    const { error } = await _sb.from('success_factors').upsert(rows, { onConflict: 'game_id,nickname' });
    if (error) console.error('[sbSaveSuccessFactors]', error);
}

async function sbLoadSuccessFactorsByGameId(gameId) {
    const { data } = await _sb.from('success_factors').select('*').eq('game_id', gameId);
    return { success: true, factors: data || [] };
}
```

- [ ] **Step 2: `sbInitGame` 함수 시그니처에 `gameVariant` 파라미터 추가 및 game_info insert 에 포함**

기존:
```javascript
async function sbInitGame(gameId, mode, players, stockValues) {
```

교체:
```javascript
async function sbInitGame(gameId, mode, players, stockValues, gameVariant = 'basic') {
```

game_info insert 부분:
```javascript
    const { error: giErr } = await _sb.from('game_info').insert({
        game_id:      gameId,
        date:         today,
        player_count: players.length,
        game_type:    mode,
        section_num:  (count || 0) + 1,
        game_variant: gameVariant
    });
```

- [ ] **Step 3: 브라우저 콘솔에 오류 없는지 확인**

기존 기본 게임 시작 후 Supabase `game_info` 테이블에 `game_variant: 'basic'` 으로 저장됐는지 확인 (Table Editor).

- [ ] **Step 4: 커밋**

```bash
git add js/supabase-client.js
git commit -m "feat: estate/success_factors Supabase 함수 추가, sbInitGame game_variant 파라미터 추가"
```

---

## Task 4: index.html — 기본/심화 버튼 및 ID 추가

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 게임 시작 모달 Step 1에 기본/심화 선택 버튼 추가**

`index.html` 의 `<!-- Step 1: 게임 종류 -->` 블록에서 `<div class="mode-select">` 바로 위에 추가:

```html
<!-- 게임 버전 선택 (기본/심화) -->
<div style="margin-bottom:12px;">
    <div style="font-size:12px; color:#888; margin-bottom:6px; font-weight:600;">게임 버전</div>
    <div class="mode-select">
        <div class="mode-btn selected" onclick="selectGameVariant('basic')" id="btnBasic">
            <span class="mode-ico">[basic]</span><span class="mode-txt">기본</span>
        </div>
        <div class="mode-btn" onclick="selectGameVariant('advanced')" id="btnAdvanced">
            <span class="mode-ico">[adv]</span><span class="mode-txt">심화 (부자의 그릇)</span>
        </div>
    </div>
</div>
<div style="font-size:12px; color:#888; margin-bottom:6px; font-weight:600;">게임 종류</div>
```

- [ ] **Step 2: Step 2 인디케이터 라벨에 id 추가**

기존:
```html
                <div class="gs-label">주식 가격</div>
```

교체:
```html
                <div class="gs-label" id="gsStep2Label">주식 가격</div>
```

- [ ] **Step 3: Step 2 영역의 stock-config-title에 id 추가**

기존:
```html
                        <div class="stock-config-title">주식 가격 설정 (4R)</div>
```

교체:
```html
                        <div class="stock-config-title" id="stockConfigTitle">주식 가격 설정 (4R)</div>
```

- [ ] **Step 4: 리포트 화면 섹션 헤더에 id 추가**

기존:
```html
            <div class="section-header">나의 주식 포트폴리오</div>
```
교체:
```html
            <div class="section-header" id="rptPortfolioHeader">나의 주식 포트폴리오</div>
```

기존:
```html
            <div class="section-header">나의 플레이 스타일</div>
```
교체:
```html
            <div class="section-header" id="rptStyleHeader">나의 플레이 스타일</div>
```

- [ ] **Step 5: 리포트 화면 총자산 라벨에 id 추가**

기존:
```html
                    <div class="label" style="font-size:12px; font-weight:bold; color:#555;">총 자산 (현금 + 주식 + 성실활동금 + 예금 + 퀘스트)</div>
```
교체:
```html
                    <div class="label" id="rptAssetLabel" style="font-size:12px; font-weight:bold; color:#555;">총 자산 (현금 + 주식 + 성실활동금 + 예금 + 퀘스트)</div>
```

- [ ] **Step 6: 리포트 화면 "주식:" 텍스트 span에 id 추가**

기존:
```html
                        <div>
                            <span style="color:var(--mv-yellow)">●</span>&nbsp;주식:
                            <span id="rptStock">0</span> 원
                        </div>
```
교체:
```html
                        <div>
                            <span style="color:var(--mv-yellow)">●</span>&nbsp;<span id="rptAssetTypeLabel">주식</span>:
                            <span id="rptStock">0</span> 원
                        </div>
```

- [ ] **Step 7: 계수 화면 카드 제목에 id 추가**

기존:
```html
                <div class="count-card">
                    <h4>보유 주식 (4R 현재가)</h4>
```
교체:
```html
                <div class="count-card">
                    <h4 id="cntAssetCardTitle">보유 주식 (4R 현재가)</h4>
```

기존:
```html
                <div class="count-card">
                    <h4>나의 플레이 스타일 (복수 선택 가능)</h4>
```
교체:
```html
                <div class="count-card">
                    <h4 id="cntTraitCardTitle">나의 플레이 스타일 (복수 선택 가능)</h4>
```

- [ ] **Step 8: 브라우저에서 열어 화면 레이아웃 정상 확인**

기본/심화 버튼이 모달 Step 1 상단에 표시되는지 확인. 기타 id 변경으로 기존 기능이 깨지지 않았는지 확인.

- [ ] **Step 9: 커밋**

```bash
git add index.html
git commit -m "feat: 기본/심화 버튼 HTML 추가, 리포트/계수 화면 섹션 헤더에 id 추가"
```

---

## Task 5: setup.js — 게임 변형 선택 및 Step 2 부동산 설정

**Files:**
- Modify: `js/setup.js`

- [ ] **Step 1: `selectMode` 함수 위에 `selectGameVariant` 함수 추가**

```javascript
function selectGameVariant(v) {
    currentGameVariant = v;
    document.getElementById('btnBasic').className    = v === 'basic'    ? 'mode-btn selected' : 'mode-btn';
    document.getElementById('btnAdvanced').className = v === 'advanced' ? 'mode-btn selected' : 'mode-btn';

    const step2Label = document.getElementById('gsStep2Label');
    if (step2Label) step2Label.textContent = v === 'advanced' ? '부동산 가격' : '주식 가격';
}
```

- [ ] **Step 2: `initStockConfig` 아래에 `initEstateConfig` 함수 추가**

```javascript
function initEstateConfig() {
    const grid = document.getElementById('stockConfigInputs');
    grid.innerHTML = '';
    for (let k in estateInfo) {
        grid.innerHTML += `<div class="stock-input-item">
            <label>${estateInfo[k].name}</label>
            <input type="number" id="conf_${k}" value="${estateInfo[k].price}">
        </div>`;
    }
}
```

- [ ] **Step 3: `gsGoToStep` 함수에서 step === 2 일 때 variant에 따라 config 렌더링 분기**

기존 `gsGoToStep` 내부에서 `currentGameStep = step;` 바로 앞에 아래 블록 추가:

```javascript
        if (step === 2) {
            const titleEl = document.getElementById('stockConfigTitle');
            if (currentGameVariant === 'advanced') {
                initEstateConfig();
                if (titleEl) titleEl.textContent = '부동산 가격 설정 (4R)';
            } else {
                initStockConfig();
                if (titleEl) titleEl.textContent = '주식 가격 설정 (4R)';
            }
        }
```

- [ ] **Step 4: `startGame()` 함수 수정 — 가격 반영, successFactors 초기화, sbInitGame 호출**

기존 startGame() 첫 부분:
```javascript
        for(let k in stockInfo) {
            const v = document.getElementById(`conf_${k}`).value;
            if(v) stockInfo[k].price = parseInt(v);
        }
        const gameId = crypto.randomUUID().split('-')[0];
```

교체:
```javascript
        if (currentGameVariant === 'advanced') {
            for (let k in estateInfo) {
                const v = document.getElementById(`conf_${k}`)?.value;
                if (v) estateInfo[k].price = parseInt(v);
            }
        } else {
            for (let k in stockInfo) {
                const v = document.getElementById(`conf_${k}`)?.value;
                if (v) stockInfo[k].price = parseInt(v);
            }
        }
        const gameId = crypto.randomUUID().split('-')[0];
```

player 생성 부분에서 `traits: initTraitsState()` 뒤에 `successFactors` 추가 (두 곳 — individual과 team 각각):

```javascript
                traits: initTraitsState(),
                successFactors: initSuccessFactorsState()
```

startGame() 마지막의 `sbInitGame` 호출 부분:

기존:
```javascript
        const stockValues = Object.values(stockInfo).map(s => s.price);
        sbInitGame(gameId, currentMode, players, stockValues)
            .catch(e => console.error('[sbInitGame]', e));
```

교체:
```javascript
        if (currentGameVariant === 'advanced') {
            const estateValues = Object.fromEntries(
                Object.entries(estateInfo).map(([k, v]) => [k, v.price])
            );
            sbInitGame(gameId, currentMode, players, [], currentGameVariant)
                .then(() => sbSaveEstatePrice(gameId, estateValues))
                .catch(e => console.error('[sbInitGame]', e));
        } else {
            const stockValues = Object.values(stockInfo).map(s => s.price);
            sbInitGame(gameId, currentMode, players, stockValues, currentGameVariant)
                .catch(e => console.error('[sbInitGame]', e));
        }
```

- [ ] **Step 5: 브라우저에서 심화 모드 Step 2 진입 확인**

게임 시작 모달 → 심화 클릭 → 다음 → Step 2에 부동산 6종 가격 입력 필드가 표시되는지 확인.
기본으로 돌아가면 주식 6종이 다시 표시되는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add js/setup.js
git commit -m "feat: selectGameVariant, initEstateConfig, startGame 심화 모드 분기"
```

---

## Task 6: counting.js — 계수 화면 자산 그리드 및 특성 선택 수정

**Files:**
- Modify: `js/counting.js`

- [ ] **Step 1: `initStockGrid` 를 `initAssetGrid` 로 리네임하고 내부를 `getActiveAssetInfo()` 기반으로 수정**

기존 `function initStockGrid(id, sm, isCountingScreen=false)` 전체를 교체:

```javascript
function initAssetGrid(id, sm, isCountingScreen = false) {
    const grid = document.getElementById(id);
    if (!grid) return;
    grid.innerHTML = '';

    const activeInfo = getActiveAssetInfo();
    const prefix = isCountingScreen ? 'ui' : 'rpt';
    const inputHandler = isCountingScreen ? 'updateManualOnCounting()' : 'manualUpdate()';

    for (let k in activeInfo) {
        const s = activeInfo[k];
        const colorStyle = `background:${s.color} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color:#fff !important;`;
        const priceDisplay = `<div style="font-size:11px; color:#999; margin-bottom:2px;">1개: ${s.price.toLocaleString()}원</div>`;

        grid.innerHTML += `<div class="${sm ? 'stock-item-sm' : 'stock-card'}">
            <div class="stock-logo" style="${colorStyle}">${k[0]}</div>
            <div style="font-weight:bold; color:#555; font-size:11px;">${s.name}</div>
            ${priceDisplay}
            <div class="${sm ? '' : 'stock-val'}" id="${prefix}_val_${k}">0원</div>
            <div class="${sm ? '' : 'stock-cnt'}" id="${prefix}_cnt_${k}">
                <input type="number" id="${prefix}_cnt_input_${k}" class="editable-input" style="width:40px;" min="0" oninput="${inputHandler}"> 개
            </div>
        </div>`;
    }
}
```

- [ ] **Step 2: `renderSidebar()` 에서 카드 제목 업데이트 및 `initStockGrid` → `initAssetGrid` 호출 변경**

기존 `renderSidebar()` 마지막 줄:
```javascript
        initStockGrid('stockGridSm', false, true);
```

교체:
```javascript
        const assetTitle = document.getElementById('cntAssetCardTitle');
        if (assetTitle) assetTitle.textContent = currentGameVariant === 'advanced' ? '보유 부동산 (현재가)' : '보유 주식 (4R 현재가)';
        const traitTitle = document.getElementById('cntTraitCardTitle');
        if (traitTitle) traitTitle.textContent = currentGameVariant === 'advanced' ? '경제적 성공요소 (복수 선택 가능)' : '나의 플레이 스타일 (복수 선택 가능)';
        initAssetGrid('stockGridSm', false, true);
```

- [ ] **Step 3: `updateDash()` 를 `calcActiveAsset` 사용 및 심화 배율 반영으로 수정**

기존 `updateDash()` 전체를 교체:

```javascript
    function updateDash() {
        const p = players[activeCountingIndex];
        document.getElementById('displayPlayerName').innerText = p.realName || p.name;
        const cash = p.manualCash || 0;
        const assetVal = calcActiveAsset(p.assets);
        const diligence = p.diligenceReward || 0;
        const base = cash + assetVal + diligence;

        if (currentGameVariant === 'advanced') {
            p.total = base * calcSuccessMultiplier(p.successFactors || {});
        } else {
            p.total = base;
        }

        document.getElementById('displayTotalAsset').innerText = p.total.toLocaleString() + " 원";
        document.getElementById('cntCashInput').value = cash;
        document.getElementById('cntDiligenceInput').value = diligence;
        document.getElementById('displayStock').innerText = assetVal.toLocaleString();

        const activeInfo = getActiveAssetInfo();
        for (let k in activeInfo) {
            const valEl = document.getElementById(`ui_val_${k}`);
            if (valEl) valEl.innerText = ((p.assets[k] || 0) * activeInfo[k].price).toLocaleString();
            const input = document.getElementById(`ui_cnt_input_${k}`);
            if (input) input.value = p.assets[k] || 0;
        }

        renderTraitGridCounting();
    }
```

- [ ] **Step 4: `renderTraitGridCounting()` 를 심화/기본 분기로 수정**

기존 함수 전체를 교체:

```javascript
    function renderTraitGridCounting() {
        const grid = document.getElementById('traitGridSm');
        if (!grid) return;
        const p = players[activeCountingIndex];
        if (!p) return;

        grid.innerHTML = '';

        if (currentGameVariant === 'advanced') {
            if (!p.successFactors) p.successFactors = initSuccessFactorsState();
            SUCCESS_FACTORS.forEach(f => {
                const isOn = !!p.successFactors[f.key];
                grid.innerHTML += `
                    <button class="trait-btn ${isOn ? 'on' : ''}" type="button"
                        onclick="toggleSuccessFactor('${f.key}')">
                        <span class="emo">${f.emo}</span>
                        <span>${f.name}</span>
                    </button>`;
            });
        } else {
            if (!p.traits) p.traits = initTraitsState();
            TRAITS.forEach(t => {
                const isOn = !!p.traits[t.key];
                grid.innerHTML += `
                    <button class="trait-btn ${isOn ? 'on' : ''}" type="button"
                        onclick="toggleTrait('${t.key}')">
                        <span class="emo">${t.emo}</span>
                        <span>${t.king}</span>
                    </button>`;
            });
        }
    }
```

- [ ] **Step 5: `toggleTrait` 아래에 `toggleSuccessFactor` 함수 추가**

```javascript
    function toggleSuccessFactor(key) {
        const p = players[activeCountingIndex];
        if (!p) return;
        if (!p.successFactors) p.successFactors = initSuccessFactorsState();
        p.successFactors[key] = !p.successFactors[key];
        updateDash();
    }
```

- [ ] **Step 6: 브라우저에서 심화 모드 계수 화면 확인**

심화 게임 시작 → 계수 화면 진입. 아래를 확인:
- "보유 부동산 (현재가)" 제목과 부동산 6종 그리드 표시
- "경제적 성공요소" 제목과 성공요소 6개 버튼 표시
- 성공요소 버튼 클릭 시 총자산이 배율 계산으로 업데이트
- 기본 모드로 시작하면 기존 주식/플레이스타일이 표시

- [ ] **Step 7: 커밋**

```bash
git add js/counting.js
git commit -m "feat: initAssetGrid로 리네임, 계수화면 심화/기본 분기 (부동산 그리드, 성공요소 선택)"
```

---

## Task 7: report.js + _finishGameConfirmed — 리포트 화면 수정

**Files:**
- Modify: `js/report.js`

- [ ] **Step 1: `_finishGameConfirmed` 내 `initStockGrid` 호출을 `initAssetGrid` 로 변경**

기존:
```javascript
        initStockGrid('rptStockGrid', false, false);
```
교체:
```javascript
        initAssetGrid('rptStockGrid', false, false);
```

- [ ] **Step 2: `showReport()` 에서 섹션 헤더 및 자산 타입 라벨 동적 업데이트 추가**

`showReport(idx)` 함수 내 `document.getElementById('rptCashInput').value = p.manualCash;` 바로 위에 추가:

```javascript
        // 심화/기본 UI 라벨 업데이트
        const assetLabelEl = document.getElementById('rptAssetLabel');
        if (assetLabelEl) {
            assetLabelEl.textContent = currentGameVariant === 'advanced'
                ? '총 자산 (현금 + 부동산 + 성실활동금 + 예금 + 퀘스트) x (성공요소 개수 x 0.25)'
                : '총 자산 (현금 + 주식 + 성실활동금 + 예금 + 퀘스트)';
        }
        const portfolioHeader = document.getElementById('rptPortfolioHeader');
        if (portfolioHeader) {
            portfolioHeader.textContent = currentGameVariant === 'advanced' ? '나의 부동산 포트폴리오' : '나의 주식 포트폴리오';
        }
        const styleHeader = document.getElementById('rptStyleHeader');
        if (styleHeader) {
            styleHeader.textContent = currentGameVariant === 'advanced' ? '나의 경제적 성공요소' : '나의 플레이 스타일';
        }
        const assetTypeLabel = document.getElementById('rptAssetTypeLabel');
        if (assetTypeLabel) {
            assetTypeLabel.textContent = currentGameVariant === 'advanced' ? '부동산' : '주식';
        }
```

- [ ] **Step 3: `showReport()` 에서 주식 입력값 세팅을 activeInfo 기반으로 수정**

기존:
```javascript
        for(let k in stockInfo) {
            document.getElementById(`rpt_cnt_input_${k}`).value = p.assets[k];
            document.getElementById(`rpt_val_${k}`).innerText = (p.assets[k] * stockInfo[k].price).toLocaleString() + "원";
        }
```

교체:
```javascript
        const activeInfo = getActiveAssetInfo();
        for (let k in activeInfo) {
            const inputEl = document.getElementById(`rpt_cnt_input_${k}`);
            const valEl   = document.getElementById(`rpt_val_${k}`);
            if (inputEl) inputEl.value = p.assets[k] || 0;
            if (valEl)   valEl.innerText = ((p.assets[k] || 0) * activeInfo[k].price).toLocaleString() + "원";
        }
```

- [ ] **Step 4: `refreshDisplayOnly()` 를 심화 배율 및 activeInfo 기반으로 수정**

기존 함수 전체를 교체:

```javascript
    function refreshDisplayOnly(p) {
        const cash      = Number(p.manualCash      || 0);
        const assetVal  = Number(calcActiveAsset(p.assets) || 0);
        const diligence = Number(p.diligenceReward || 0);
        const deposit   = Number(p.depositReward   || 0);
        const quest     = Number(p.questReward     || 0);
        const base = cash + assetVal + diligence + deposit + quest;

        let total;
        if (currentGameVariant === 'advanced') {
            total = base * calcSuccessMultiplier(p.successFactors || {});
        } else {
            total = base;
        }
        p.total = total;

        document.getElementById('rptTotalAsset').innerText = total.toLocaleString() + " 원";
        document.getElementById('rptStock').innerText = assetVal.toLocaleString();

        const rptDiligenceInput = document.getElementById('rptDiligenceInput');
        if (rptDiligenceInput) rptDiligenceInput.value = diligence;
        const rptDepositInput = document.getElementById('rptDepositInput');
        if (rptDepositInput) rptDepositInput.value = deposit;
        const rptQuestInput = document.getElementById('rptQuestInput');
        if (rptQuestInput) rptQuestInput.value = quest;

        const activeInfo = getActiveAssetInfo();
        for (let k in activeInfo) {
            const valEl = document.getElementById(`rpt_val_${k}`);
            if (valEl) valEl.innerText = ((p.assets[k] || 0) * activeInfo[k].price).toLocaleString() + "원";
        }

        const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0;
        document.getElementById('rptCashPct').innerText = `${cashPct}%`;

        const cashCircle      = document.getElementById('rptArcCash');
        const stockCircle     = document.getElementById('rptArcStock');
        const diligenceCircle = document.getElementById('rptArcDiligence');
        const depositCircle   = document.getElementById('rptArcDeposit');
        const questCircle     = document.getElementById('rptArcQuest');

        if (total <= 0) {
            clearDonutSegment(cashCircle);
            clearDonutSegment(stockCircle);
            clearDonutSegment(diligenceCircle);
            if (depositCircle) clearDonutSegment(depositCircle);
            if (questCircle)   clearDonutSegment(questCircle);
            return;
        }

        const cashPercent      = (cash      / total) * 100;
        const assetPercent     = (assetVal  / total) * 100;
        const diligencePercent = (diligence / total) * 100;
        const depositPercent   = (deposit   / total) * 100;
        const questPercent     = (quest     / total) * 100;

        const _seg = (el, pct, off) => {
            if (!el) return;
            pct > 0 ? setDonutSegment(el, pct, off) : clearDonutSegment(el);
        };
        _seg(cashCircle,      cashPercent,      0);
        _seg(stockCircle,     assetPercent,     cashPercent);
        _seg(diligenceCircle, diligencePercent, cashPercent + assetPercent);
        _seg(depositCircle,   depositPercent,   cashPercent + assetPercent + diligencePercent);
        _seg(questCircle,     questPercent,     cashPercent + assetPercent + diligencePercent + depositPercent);
    }
```

- [ ] **Step 5: `renderPlayStyleReport()` 를 심화/기본 분기로 수정**

기존 함수 전체를 교체:

```javascript
    function renderPlayStyleReport(p) {
        const badgeWrap = document.getElementById('rptTraitBadges');
        const grid = document.getElementById('rptPlayStyleGrid');

        if (currentGameVariant === 'advanced') {
            if (!p.successFactors) p.successFactors = initSuccessFactorsState();
            const onList = SUCCESS_FACTORS.filter(f => p.successFactors[f.key]);

            if (badgeWrap) {
                badgeWrap.innerHTML = '';
                if (onList.length === 0) {
                    badgeWrap.innerHTML = `<span class="rpt-badge">선택 없음</span>`;
                } else {
                    onList.forEach(f => {
                        badgeWrap.innerHTML += `<span class="rpt-badge on">${f.emo} ${f.name}</span>`;
                    });
                }
            }

            if (!grid) return;
            grid.innerHTML = '';
            SUCCESS_FACTORS.forEach(f => {
                const isOn = !!(p.successFactors && p.successFactors[f.key]);
                grid.innerHTML += `
                    <div class="booth-item ${isOn ? 'selected' : ''}">
                        <div class="booth-icon" style="font-size:22px;">${f.emo}</div>
                        <div class="booth-text">
                            <h4 style="font-size:15px; margin:0;">${f.name}</h4>
                        </div>
                    </div>`;
            });

        } else {
            if (badgeWrap) {
                badgeWrap.innerHTML = '';
                if (!p.traits) p.traits = initTraitsState();
                const onList = TRAITS.filter(t => p.traits[t.key]);
                if (onList.length === 0) {
                    badgeWrap.innerHTML = `<span class="rpt-badge">선택 없음</span>`;
                } else {
                    onList.forEach(t => {
                        badgeWrap.innerHTML += `<span class="rpt-badge on">${t.emo} ${t.king}</span>`;
                    });
                }
            }

            if (!grid) return;
            grid.innerHTML = '';
            TRAITS.forEach(t => {
                const isOn = !!(p.traits && p.traits[t.key]);
                const title = isOn ? `${t.base} -> ${t.king}` : t.base;
                grid.innerHTML += `
                    <div class="booth-item ${isOn ? 'selected' : ''}">
                        <div class="booth-icon">${t.emo}</div>
                        <div class="booth-text">
                            <h4>${title}</h4>
                            <p>${t.desc}</p>
                        </div>
                    </div>`;
            });
        }
    }
```

- [ ] **Step 6: 브라우저에서 심화 모드 리포트 화면 확인**

심화 게임 완료 후 리포트 화면에서 아래를 확인:
- 총자산 라벨에 "x (성공요소 개수 x 0.25)" 포함
- "나의 부동산 포트폴리오" 섹션에 부동산 6종 입력 필드
- "나의 경제적 성공요소" 섹션에 설명 없이 이름만 표시
- 도넛 차트가 정상 렌더링

- [ ] **Step 7: 커밋**

```bash
git add js/report.js
git commit -m "feat: 리포트 화면 심화/기본 분기 (부동산 포트폴리오, 경제적 성공요소, 배율 라벨)"
```

---

## Task 8: app.js — saveToDrive 및 _loadPastGame 심화 모드 지원

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: `saveToDrive()` 에서 자산/특성 저장을 심화/기본 분기**

기존:
```javascript
            await Promise.all(players.map(p => saveUserBalance(p.nickname, gameId, p.assets)));
            await Promise.all(players.map(p => {
                ...
            }));
            await saveTraits(gameId, players);
```

교체 (saveUserBalance 와 saveTraits 호출 두 블록을 묶어):
```javascript
            if (currentGameVariant === 'advanced') {
                await Promise.all(players.map(p => sbSaveEstateBalance(p.nickname, gameId, p.assets)));
                await sbSaveSuccessFactors(gameId, players);
            } else {
                await Promise.all(players.map(p => saveUserBalance(p.nickname, gameId, p.assets)));
                await saveTraits(gameId, players);
            }
            await Promise.all(players.map(p => {
                const saves = [];
                if (p.depositReward !== undefined) saves.push(sbSaveDepositReward(gameId, p.nickname, p.depositReward));
                if (p.questReward   !== undefined) saves.push(sbSaveQuestReward(gameId,   p.nickname, p.questReward));
                return Promise.all(saves);
            }));
```

- [ ] **Step 2: `onPastGameDateChange()` 에서 `_loadPastGame` 호출 시 `game_variant` 전달**

기존:
```javascript
                card.onclick = () => _loadPastGame(g.game_id, g.date);
```
교체:
```javascript
                card.onclick = () => _loadPastGame(g.game_id, g.date, g.game_variant || 'basic');
```

- [ ] **Step 3: `_loadPastGame` 함수 시그니처에 `gameVariant` 추가 및 내부 로직 분기**

기존:
```javascript
    async function _loadPastGame(gameId, gameDate) {
```
교체:
```javascript
    async function _loadPastGame(gameId, gameDate, gameVariant = 'basic') {
```

함수 내부 `closePastGameModal();` 바로 다음에 추가:
```javascript
        currentGameVariant = gameVariant;
```

기존 주식 보유 수량 로드 블록 (`console.group ... console.groupEnd()`) 전체를 교체:
```javascript
            console.group(`[loadBalance] gameId=${gameId} variant=${gameVariant}`);
            await Promise.all(players.map(async p => {
                if (!p.gameId) { console.warn(`  no gameId: ${p.nickname}`); return; }
                if (gameVariant === 'advanced') {
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
            console.groupEnd();
```

기존 Traits 로드 블록 (`try { const traitsData = ... } catch(e)`) 전체를 교체:
```javascript
            try {
                if (gameVariant === 'advanced') {
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

- [ ] **Step 4: 브라우저에서 심화 게임 저장 및 불러오기 확인**

심화 게임 완료 → 드라이브 저장 → Supabase `estate_balance`, `success_factors` 테이블에 데이터 확인.
과거 게임 불러오기 → 심화 게임 선택 → 계수 화면에 부동산 수치가 복원되는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add js/app.js
git commit -m "feat: saveToDrive/loadPastGame 심화 모드 estate_balance, success_factors 저장/로드 분기"
```

---

## Task 9: 이모지 복원

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`

- [ ] **Step 1: `app.js` 의 SUCCESS_FACTORS emo 필드 실제 이모지로 교체**

기존:
```javascript
const SUCCESS_FACTORS = [
    { key: "financial_management", emo: "[coin]",  name: "재정관리능력" },
    { key: "communication",        emo: "[chat]",  name: "의사소통능력" },
    { key: "critical_thinking",    emo: "[think]", name: "비판적사고력" },
    { key: "global_economy",       emo: "[bulb]",  name: "글로벌경제이해력" },
    { key: "credit_trust",         emo: "[shake]", name: "신용과신뢰" },
    { key: "entrepreneurship",     emo: "[bld]",   name: "기업가정신" },
];
```

교체 (U+1FA99=재정, U+1F4AC=의사소통, U+1F914=비판, U+1F4A1=글로벌, U+1F91D=신용, U+1F3E2=기업가):
```javascript
const SUCCESS_FACTORS = [
    { key: "financial_management", emo: "\u{1FA99}", name: "재정관리능력" },
    { key: "communication",        emo: "\u{1F4AC}", name: "의사소통능력" },
    { key: "critical_thinking",    emo: "\u{1F914}", name: "비판적사고력" },
    { key: "global_economy",       emo: "\u{1F4A1}", name: "글로벌경제이해력" },
    { key: "credit_trust",         emo: "\u{1F91D}", name: "신용과신뢰" },
    { key: "entrepreneurship",     emo: "\u{1F3E2}", name: "기업가정신" },
];
```

- [ ] **Step 2: `index.html` 의 기본/심화 버튼 이모지 복원**

기존:
```html
        <div class="mode-btn selected" onclick="selectGameVariant('basic')" id="btnBasic">
            <span class="mode-ico">[basic]</span><span class="mode-txt">기본</span>
        </div>
        <div class="mode-btn" onclick="selectGameVariant('advanced')" id="btnAdvanced">
            <span class="mode-ico">[adv]</span><span class="mode-txt">심화 (부자의 그릇)</span>
        </div>
```

교체:
```html
        <div class="mode-btn selected" onclick="selectGameVariant('basic')" id="btnBasic">
            <span class="mode-ico">\u{1F3AE}</span><span class="mode-txt">기본</span>
        </div>
        <div class="mode-btn" onclick="selectGameVariant('advanced')" id="btnAdvanced">
            <span class="mode-ico">\u{1F3C6}</span><span class="mode-txt">심화 (부자의 그릇)</span>
        </div>
```

참고: `\u{1F3AE}` = 게임 컨트롤러, `\u{1F3C6}` = 트로피. 원하는 다른 이모지로 변경 가능.

- [ ] **Step 3: 브라우저에서 이모지 표시 확인**

기본/심화 버튼에 이모지가 정상 표시되는지, 성공요소 버튼에 이모지가 표시되는지 확인.

- [ ] **Step 4: 커밋 및 push**

```bash
git add js/app.js index.html
git commit -m "feat: 이모지 복원 - SUCCESS_FACTORS, 기본/심화 버튼"
git push origin feat/advanced-mode
```

---

## 자체 검토 (Spec Coverage)

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| 게임 종류 탭에 기본/심화 버튼 추가 | Task 4, Task 5 |
| 심화 시 부동산 가격 설정 (Step 2) | Task 5 |
| 부동산 6종 + 기본가 100,000원 | Task 2 (estateInfo) |
| estate_balance, estate_price DB 테이블 | Task 1, Task 3 |
| 계수화면 보유 주식→부동산 | Task 6 |
| 계수화면 플레이스타일→경제적 성공요소 | Task 6 |
| success_factors DB 테이블 | Task 1, Task 3 |
| total_asset = base x (성공요소개수 x 0.25) | Task 2, Task 6, Task 7 |
| 리포트 총자산 라벨에 배율 표시 | Task 7 |
| 나의 주식→부동산 포트폴리오 | Task 4, Task 7 |
| 나의 플레이스타일→경제적 성공요소 | Task 4, Task 7 |
| 성공요소 이모지 6종 | Task 9 |
| 성공요소 설명 없음, 글자 크게 | Task 7 (font-size:15px) |
| game_info.game_variant 컬럼 | Task 1, Task 3 |
| 과거 게임 불러오기 시 심화/기본 구분 | Task 8 |
| 드라이브 저장 시 심화 데이터 저장 | Task 8 |
