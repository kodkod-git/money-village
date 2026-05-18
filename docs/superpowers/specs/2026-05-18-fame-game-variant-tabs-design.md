# 명예의 전당 game_variant 탭 분리 설계

**날짜:** 2026-05-18  
**브랜치:** feat/advanced-mode

## 목표

명예의 전당(fameScreen)에서 game_variant(기본/심화/부자의그릇)별로 랭킹을 탭으로 나눠서 표시한다.

## 현재 상태

- `sbLoadHallOfFame()`은 `game_individual`과 `game_team`을 단순 조회 (game_variant 정보 없음)
- `game_variant`는 `game_info` 테이블에 `game_id`와 함께 저장됨
- UI는 단일 테이블로 모든 variant 데이터를 혼합 표시

## 접근법: 프론트엔드 필터링

`sbLoadHallOfFame()` 호출 시 `game_info`도 함께 조회하여 `game_id → game_variant` 맵을 만든 뒤, 각 레코드에 `game_variant`를 부착한다. 탭 전환은 JS 필터링으로 처리 (DB 추가 요청 없음).

## 변경 범위

### 1. `js/supabase-client.js` — `sbLoadHallOfFame()`

```js
// 변경 전
const [{ data: indiv }, { data: team }] = await Promise.all([
  _sb.from('game_individual').select('*').order('total_asset', { ascending: false }).limit(200),
  _sb.from('game_team').select('*').order('team_total_asset', { ascending: false }).limit(200)
]);

// 변경 후: game_info 추가 조회
const [{ data: gameInfoList }, { data: indiv }, { data: team }] = await Promise.all([
  _sb.from('game_info').select('game_id, game_variant'),
  _sb.from('game_individual').select('*').order('total_asset', { ascending: false }).limit(200),
  _sb.from('game_team').select('*').order('team_total_asset', { ascending: false }).limit(200)
]);

const variantMap = Object.fromEntries((gameInfoList || []).map(r => [r.game_id, r.game_variant || 'basic']));
// 각 레코드에 game_variant 부착
const indivWithVariant = (indiv || []).map(r => ({ ...r, game_variant: variantMap[r.game_id] || 'basic' }));
const teamWithVariant  = (team  || []).map(r => ({ ...r, game_variant: variantMap[r.game_id] || 'basic' }));

return { indiv: indivWithVariant, team: teamWithVariant };
```

### 2. `js/fame.js`

- `currentFameVariant` 상태 변수 추가 (초기값 `'basic'`)
- `switchFameTab(variant)` 함수 추가: 상태 업데이트 후 `renderFame()` 호출, 탭 active 클래스 갱신
- `renderFame()` 수정: `currentFameVariant`로 `fameIndivData` / `fameTeamData` 필터링 후 기존 `renderRankingTable()` 호출
- `setSpecialAwards()` 도 필터된 데이터 기준 적용

```js
let currentFameVariant = 'basic';

function switchFameTab(variant) {
  currentFameVariant = variant;
  document.querySelectorAll('.fame-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.variant === variant);
  });
  renderFame();
}

function renderFame() {
  const indiv = fameIndivData.filter(d => d.game_variant === currentFameVariant);
  const team  = fameTeamData.filter(d => d.game_variant === currentFameVariant);
  indiv.sort((a, b) => b.total - a.total);
  team.sort((a, b) => b.total - a.total);
  renderRankingTable(indiv.slice(0, 10), 'indivTableBody', false);
  renderRankingTable(team.slice(0, 5), 'teamTableBody', true);
  setSpecialAwards(indiv);
}
```

### 3. `index.html` — fameScreen 탭 UI 추가

랭킹 섹션 상단에 탭 버튼 3개 삽입:

```html
<div class="fame-tabs">
  <button class="fame-tab-btn active" data-variant="basic"       onclick="switchFameTab('basic')">기본</button>
  <button class="fame-tab-btn"        data-variant="advanced"    onclick="switchFameTab('advanced')">심화</button>
  <button class="fame-tab-btn"        data-variant="rich_vessel" onclick="switchFameTab('rich_vessel')">부자의그릇</button>
</div>
```

### 4. `style.css` — 탭 스타일

`bank.js`의 기존 `tag-basic` / `tag-advanced` / `tag-rich` 색상 체계와 일관성 유지:

```css
.fame-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.fame-tab-btn {
  padding: 6px 18px; border-radius: 20px; border: 2px solid #ddd;
  background: #f5f5f5; font-weight: 700; cursor: pointer; font-size: 14px;
}
.fame-tab-btn.active[data-variant="basic"]       { background: #e3f2fd; border-color: #2196f3; color: #1565c0; }
.fame-tab-btn.active[data-variant="advanced"]    { background: #f3e5f5; border-color: #9c27b0; color: #6a1b9a; }
.fame-tab-btn.active[data-variant="rich_vessel"] { background: #fff8e1; border-color: #ff9800; color: #e65100; }
```

## 데이터 흐름

```
fetchFameData()
  → sbLoadHallOfFame()
      → Promise.all([game_info, game_individual, game_team])
      → variantMap 생성
      → { indiv: [...+game_variant], team: [...+game_variant] }
  → fameIndivData / fameTeamData 저장 (전체)
  → renderFame() (currentFameVariant = 'basic')

사용자가 탭 클릭
  → switchFameTab('advanced')
      → currentFameVariant = 'advanced'
      → renderFame() → 필터 후 renderRankingTable()
```

## 탭 초기화

`showFameScreen()` 호출 시마다 `currentFameVariant`를 `'basic'`으로 리셋하고 탭 active 상태도 초기화한다. 이전에 선택했던 탭이 다음 방문 시 유지되지 않도록 한다.

## 엣지 케이스

- 특정 variant에 데이터가 없으면 `renderRankingTable()`의 기존 "데이터가 없습니다." 처리를 그대로 사용
- `game_variant`가 null인 레코드는 `'basic'`으로 폴백
- `game_info`에 없는 `game_id`를 가진 레코드도 `'basic'`으로 폴백

## 변경 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `js/supabase-client.js` | `sbLoadHallOfFame()` — game_info 조회 추가, variant 부착 |
| `js/fame.js` | `currentFameVariant` 상태, `switchFameTab()`, `renderFame()` 수정 |
| `index.html` | 탭 버튼 3개 추가 |
| `style.css` | `.fame-tabs`, `.fame-tab-btn` 스타일 추가 |
