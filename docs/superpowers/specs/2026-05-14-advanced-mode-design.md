# 심화 버전 (부자의 그릇) 설계 문서

**날짜**: 2026-05-14  
**브랜치**: feat/report-rewards-team-flex  
**접근 방식**: Approach A — `currentGameVariant` 전역 상태 변수 추가

---

## 1. 개요

기존 머니빌리지 게임에 "심화(부자의 그릇)" 모드를 추가한다.  
심화 모드는 주식 대신 부동산, 플레이스타일 대신 경제적 성공요소를 사용하며, 총자산 계산 시 성공요소 개수에 따른 배율이 적용된다.

---

## 2. 상태 및 데이터 구조

### 2.1 새 전역 변수 (app.js)

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
// 이모지는 구현 완료 후 복원: [coin]=, [chat]=, [think]=, [bulb]=, [shake]=, [bld]=
```

### 2.2 player 객체 확장

기존 `traits` 유지 + `successFactors` 추가:

```javascript
{
    // ... 기존 필드 ...
    traits: { diligent, saving, invest, career, luck, adventure },     // basic 모드
    successFactors: {                                                   // advanced 모드
        financial_management, communication, critical_thinking,
        global_economy, credit_trust, entrepreneurship
    }
}
```

### 2.3 assets 객체 (모드별)

- **기본**: `{ "100","500","1000","5000","10000","50000","SASUNG","LGI","SKEI","CACAO","HYUNDE","NABER" }`
- **심화**: `{ "100","500","1000","5000","10000","50000","NOORIDAMBI","DAMIGORANI","GIRUGI","MARUSURI","CHORONGDAM","HANIYUWOO" }`

### 2.4 새 헬퍼 함수 (app.js)

```javascript
function initSuccessFactorsState() { /* SUCCESS_FACTORS.forEach key -> false */ }
function calcEstate(assets)        { /* estateInfo 기준 합산, calcStock과 동일 구조 */ }
function calcSuccessMultiplier(sf) { /* Object.values(sf).filter(Boolean).length * 0.25 */ }
function getActiveAssetInfo()      { /* currentGameVariant === 'advanced' ? estateInfo : stockInfo */ }
```

---

## 3. UI 변경

### 3.1 게임 시작 모달 — Step 1 (index.html)

팀전/개인전 버튼 **위에** 기본/심화 버튼 추가:

```
[ 기본 ]  [ 심화 ]      <- 새로 추가 (위)
[ 개인전 ] [ 팀전 ]     <- 기존 유지 (아래)
```

심화 선택 시 Step 2 인디케이터 라벨 "주식 가격" -> "부동산 가격"으로 동적 변경.

### 3.2 게임 시작 모달 — Step 2

심화 모드일 때 `initEstateConfig()` 호출, 부동산 6종 가격 입력 필드 렌더.

### 3.3 계수 화면 (counting screen)

| 영역 | 기본 | 심화 |
|---|---|---|
| 두 번째 카드 제목 | 보유 주식 (4R 현재가) | 보유 부동산 (현재가) |
| 그리드 내용 | stockInfo 6종 | estateInfo 6종 |
| 세 번째 카드 제목 | 나의 플레이 스타일 | 경제적 성공요소 |
| 그리드 내용 | TRAITS | SUCCESS_FACTORS |
| 총자산 표시 | 현금 + 주식 + 성실활동금 | (현금 + 부동산 + 성실활동금) x 배율 |

### 3.4 리포트 화면 (report screen)

| 영역 | 기본 | 심화 |
|---|---|---|
| 총자산 라벨 | `(현금 + 주식 + 성실활동금 + 예금 + 퀘스트)` | `(현금 + 부동산 + 성실활동금 + 예금 + 퀘스트) x (성공요소 개수 x 0.25)` |
| 포트폴리오 섹션 헤더 | 나의 주식 포트폴리오 | 나의 부동산 포트폴리오 |
| 스타일 섹션 헤더 | 나의 플레이 스타일 | 나의 경제적 성공요소 |
| 각 항목 렌더 | emo + king + desc (설명 있음, 소형 텍스트) | emo + name (설명 없음, 대형 텍스트) |

---

## 4. 총자산 계산 로직

### 기본 모드 (기존 동일)
```
total = cash + stock + diligence + deposit + quest
```

### 심화 모드
```
successFactorCount = 선택된 성공요소 개수 (0~6)
multiplier = successFactorCount * 0.25
total = (cash + estate + diligence + deposit + quest) * multiplier
```
- 성공요소 0개 선택 시 total = 0 (의도된 동작)
- `recalculateAllRankings()` 및 `applyInputsToPlayer()` 내부에서 분기 처리

---

## 5. DB / Supabase 변경

### 5.1 새 테이블 3개 (Supabase 대시보드에서 직접 생성)

**estate_price**
| 컬럼 | 타입 | 설명 |
|---|---|---|
| game_id | text (PK) | |
| nooridambi | integer | |
| damigorani | integer | |
| girugi | integer | |
| marusuri | integer | |
| chorongdam | integer | |
| haniyuwoo | integer | |

**estate_balance**
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK, default gen_random_uuid()) | |
| nickname | text | |
| game_id | text | |
| nooridambi | integer | default 0 |
| damigorani | integer | default 0 |
| girugi | integer | default 0 |
| marusuri | integer | default 0 |
| chorongdam | integer | default 0 |
| haniyuwoo | integer | default 0 |
- unique constraint: (game_id, nickname)

**success_factors**
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK, default gen_random_uuid()) | |
| nickname | text | |
| game_id | text | |
| financial_management | boolean | default false |
| communication | boolean | default false |
| critical_thinking | boolean | default false |
| global_economy | boolean | default false |
| credit_trust | boolean | default false |
| entrepreneurship | boolean | default false |
- unique constraint: (game_id, nickname)

### 5.2 기존 테이블 수정

**game_info** 테이블에 컬럼 추가:
- `game_variant` text, default `'basic'`

### 5.3 새 supabase-client.js 함수

- `sbSaveEstatePrice(gameId, prices)` — estate_price upsert
- `sbSaveEstateBalance(nickname, gameId, assets)` — estate_balance upsert
- `sbLoadEstateBalance(nickname, gameId)` — estate_balance 조회
- `sbSaveSuccessFactors(gameId, players)` — success_factors upsert
- `sbLoadSuccessFactorsByGameId(gameId)` — success_factors 전체 조회

### 5.4 sbInitGame 수정

`game_variant` 파라미터 추가, game_info insert 시 포함.

### 5.5 과거 게임 불러오기 (_loadPastGame) 수정

1. `sbGetGamesByDate` 결과에 `game_variant` 포함 (game_info 조회)
2. `_loadPastGame` 에서 `currentGameVariant = game.game_variant || 'basic'` 설정
3. 심화 모드일 경우:
   - `sbLoadUserBalance` 대신 `sbLoadEstateBalance` 호출 (assets에 부동산 키 채움)
   - `sbLoadTraitsByGameId` 대신 `sbLoadSuccessFactorsByGameId` 호출
   - players 각각에 `successFactors` 복원
4. `stockInfo` / `estateInfo` 중 올바른 쪽으로 `calcStock` / `calcEstate` 분기

---

## 6. 수정 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `index.html` | 게임 시작 모달 Step1에 기본/심화 버튼 추가, Step2 라벨 동적화 |
| `js/app.js` | `currentGameVariant`, `estateInfo`, `SUCCESS_FACTORS`, 헬퍼 함수, `recalculateAllRankings` 분기 |
| `js/setup.js` | `selectGameVariant()`, `initEstateConfig()`, `startGame()` 수정 |
| `js/counting.js` | 계수 화면 카드 제목/그리드 조건부 렌더, 총자산 표시 로직 |
| `js/report.js` | 리포트 라벨, 섹션 헤더, 성공요소 렌더 함수 |
| `js/supabase-client.js` | 새 함수 5개, `sbInitGame` 수정 |

---

## 7. 이모지 복원 목록 (구현 완료 후)

SUCCESS_FACTORS emo 필드 (구현 시 placeholder 사용, 완료 후 복원):
- `[coin]`  -> U+1FA99 (동전)
- `[chat]`  -> U+1F4AC (말풍선)
- `[think]` -> U+1F914 (생각하는 얼굴)
- `[bulb]`  -> U+1F4A1 (전구)
- `[shake]` -> U+1F91D (악수하는 손)
- `[bld]`   -> U+1F3E2 (사무빌딩)

HTML 버튼/카드 라벨 내 이모지(기존 코드 포함)도 최종 단계에서 원상복구.
