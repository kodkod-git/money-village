# 계수 화면 주식/부동산 가격 수정 기능 설계

## 목표

계수 화면에서 주식/부동산 현재가를 게임 도중에 변경할 수 있도록 한다. 변경 즉시 전체 플레이어 자산 합계가 재계산되어 화면에 반영되고, DB에도 upsert된다.

---

## UI 변경

### 1. 계수 화면 카드 헤더 (`index.html`)

`count-card` 안의 `<h4 id="cntAssetCardTitle">` 를 flex 컨테이너로 감싸고 오른쪽에 톱니바퀴 버튼 추가.

```html
<div style="display:flex; justify-content:space-between; align-items:center;">
  <h4 id="cntAssetCardTitle">보유 주식 (4R 현재가)</h4>
  <button class="btn-icon" onclick="openStockPriceEditModal()" title="가격 수정">⚙️</button>
</div>
```

### 2. 가격 수정 모달 (`index.html`)

기존 `modal-backdrop` + `modal-card` 패턴으로 `#stockPriceEditModal` 추가.

- **헤더**: 타이틀은 `id="stockPriceEditTitle"` — `openStockPriceEditModal()` 호출 시 동적 세팅
  - `currentGameVariant === 'basic'` → `"📈 주식 가격 수정"`
  - 그 외 → `"🏠 부동산 가격 수정"`
- **본문**: `<div id="stockPriceEditInputs">` — `stock-input-item` 그리드 (setup 화면과 동일 구조)
- **푸터**: 닫기 버튼 / 저장 버튼 (`onclick="saveStockPriceEdit()"`)

---

## JS 변경

### `counting.js` — 2개 함수 추가

#### `openStockPriceEditModal()`

1. `currentGameVariant`에 따라 모달 타이틀 세팅
2. `stockInfo` 또는 `estateInfo`를 순회하여 `stockPriceEditInputs` 안에 `stock-input-item` 입력 렌더링
3. 모달 표시 (`classList.add('show')`)

#### `saveStockPriceEdit()`

1. 입력값 읽어 `stockInfo`/`estateInfo` 업데이트
2. `initAssetGrid('stockGridSm', false, true)` 재호출 → 카드 내 단가 텍스트 즉시 갱신
3. 전체 플레이어 `total` 재계산:
   - `players.forEach(p => { p.total = (p.manualCash||0) + calcActiveAsset(p.assets) + (p.diligenceReward||0) + (p.depositReward||0) + (p.questReward||0) })`
   - `calcActiveAsset`는 `currentGameVariant`에 따라 `calcStock`/`calcEstate`를 자동 선택
4. `recalculateAllRankings()` 호출
5. `updateDash()` 호출 → 현재 선택 플레이어 합계 즉시 갱신
6. DB 저장: `sbUpdateStockPrice(players[0].gameId, newPrices)`
7. 모달 닫기

### `supabase-client.js` — 1개 함수 추가

#### `sbUpdateStockPrice(gameId, stockValues)`

`stock_price` 테이블에 upsert (`onConflict: 'game_id'`):

```javascript
await _sb.from('stock_price').upsert({
    game_id: gameId,
    sasung:  Number(stockValues[0]),
    lgi:     Number(stockValues[1]),
    skei:    Number(stockValues[2]),
    cacao:   Number(stockValues[3]),
    hyunde:  Number(stockValues[4]),
    naber:   Number(stockValues[5])
}, { onConflict: 'game_id' });
```

---

## 재계산 흐름

```
저장 버튼 클릭
  → 입력값 → stockInfo/estateInfo 갱신
  → initAssetGrid 재렌더 (단가 텍스트 갱신)
  → 전체 players[] total 재계산
  → recalculateAllRankings() (순위 갱신)
  → updateDash() (현재 플레이어 표시 갱신)
  → sbUpdateStockPrice (DB upsert)
  → 모달 닫기
```

---

## 영향 범위

| 파일 | 변경 내용 |
|---|---|
| `index.html` | 카드 헤더 래퍼 + 톱니바퀴 버튼 + `#stockPriceEditModal` 추가 |
| `js/counting.js` | `openStockPriceEditModal()`, `saveStockPriceEdit()` 추가 |
| `js/supabase-client.js` | `sbUpdateStockPrice()` 추가 |

---

## 제약 사항

- `isSampleMode === true` 이면 DB 저장 스킵 (기존 패턴과 동일)
- `players[0].gameId` 가 없을 경우 DB 저장 스킵하고 콘솔 경고만 출력
- 부동산 모드(`currentGameVariant !== 'basic'`)에서는 `estateInfo` 키 기준으로 입력 렌더링 및 저장
