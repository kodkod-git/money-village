# luckReward를 총자산 계산에서 제외 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 총자산(`p.total`) 계산 공식에서 `luckReward` 항을 제거해, 이미 `manualCash`(실물 현금 계수)에
포함된 행운 게임 상금이 두 번 계산되는 버그를 고친다.

**Architecture:** `js/app.js`와 `js/report.js`에 흩어진 5곳의 총자산 계산식에서 `+ (p.luckReward || 0)`
항(또는 그에 대응하는 `luck` 변수)만 제거한다. `luck_reward` 컬럼, `sbSaveLuckReward`/
`sbGetRewardsByGameId`, `js/luck.js`의 실시간 획득 배지 등 나머지 저장·조회·표시 로직은 그대로 둔다.

**Tech Stack:** Vanilla JS (빌드 스텝 없음). 테스트는 이 저장소 관례대로 `node tests/*.test.js`로 실행하는
정적 소스 텍스트 assertion (`fs.readFileSync` + `assert`).

**설계 문서:** `docs/superpowers/specs/2026-07-13-luck-reward-exclude-total-design.md`

---

## Task 1: `luckReward`를 총자산 공식 5곳에서 제거

**Files:**
- Modify: `js/app.js:154` (`applyInputsToPlayer`)
- Modify: `js/app.js:162` (`recalculateAllRankings`)
- Modify: `js/report.js:391-398` (`refreshDisplayOnly`)
- Modify: `js/report.js:1313` (과거 게임 리로드 재계산 — advanced/rich_vessel 분기)
- Modify: `js/report.js:1322` (과거 게임 리로드 재계산 — basic 분기)
- Test: `tests/luck-reward-integration.test.js` (기존 파일 수정)

- [ ] **Step 1: 기존 테스트 내용 확인**

`tests/luck-reward-integration.test.js`는 현재 "총자산 공식에 luckReward가 포함되어야 한다"를
검증하고 있다. 이번 변경으로 정반대(= 포함되면 안 된다)가 되어야 하므로 이 파일을 덮어쓴다.

- [ ] **Step 2: 테스트를 새 기대 동작으로 수정 (실패해야 정상)**

`tests/luck-reward-integration.test.js` 전체를 다음으로 교체:

```javascript
// tests/luck-reward-integration.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJs    = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const reportJs = fs.readFileSync(path.join(root, 'js/report.js'), 'utf8');

// switchScreen: luck 동기화 훅 (회귀 방지용으로 계속 확인)
assert(/_luckStopSync\(\);/.test(appJs), 'switchScreen should stop luck sync on every transition');
assert(/if \(id === 'luckScreen'\) _luckStartSync\(\);/.test(appJs), 'switchScreen should start luck sync when entering luckScreen');

// app.js 총자산 공식: luckReward는 manualCash에 이미 포함되므로 제외되어야 함
const applyInputsFn = appJs.match(/function applyInputsToPlayer[\s\S]*?\n    }/)[0];
assert(!/luckReward/.test(applyInputsFn), 'applyInputsToPlayer total formula should NOT include luckReward (already counted in manualCash)');

const recalcFn = appJs.match(/function recalculateAllRankings[\s\S]*?\n    }/)[0];
assert(!/luckReward/.test(recalcFn), 'recalculateAllRankings total formula should NOT include luckReward (already counted in manualCash)');

// report.js refreshDisplayOnly: base 계산에서 luckReward 제외
const refreshFn = reportJs.match(/function refreshDisplayOnly[\s\S]*?\n    }/)[0];
assert(!/luckReward/.test(refreshFn), 'refreshDisplayOnly total formula should NOT include luckReward');

// report.js 과거 게임 리로드 재계산 (심화/기본 두 갈래) — luckReward 제외
assert(
    !/\(p\.diligenceReward \|\| 0\) \+ \(p\.questReward \|\| 0\) \+ \(p\.depositReward \|\| 0\) \+ \(p\.luckReward \|\| 0\)/.test(reportJs),
    'report.js balance-load total formulas should NOT include luckReward'
);

console.log('luck-reward-integration.test.js (luckReward excluded from total) passed');
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `node tests/luck-reward-integration.test.js`
Expected: `AssertionError` — `applyInputsToPlayer total formula should NOT include luckReward (already counted in manualCash)` (아직 코드를 안 고쳤으므로 실패해야 정상)

- [ ] **Step 4: `js/app.js` 수정**

`js/app.js:154`에서 찾기:

```javascript
        const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.depositReward || 0) + (p.questReward || 0) + (p.luckReward || 0);
```

다음으로 교체:

```javascript
        const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.depositReward || 0) + (p.questReward || 0);
```

`js/app.js:162`에서 찾기:

```javascript
            const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0) + (p.luckReward || 0);
```

다음으로 교체:

```javascript
            const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
```

- [ ] **Step 5: `js/report.js` — `refreshDisplayOnly` 수정**

`js/report.js:391-398`에서 찾기:

```javascript
    function refreshDisplayOnly(p) {
        const cash      = Number(p.manualCash      || 0);
        const assetVal  = Number(calcActiveAsset(p.assets || {}) || 0);
        const diligence = Number(p.diligenceReward || 0);
        const deposit   = Number(p.depositReward   || 0);
        const quest     = Number(p.questReward     || 0);
        const luck      = Number(p.luckReward      || 0);
        const base = cash + assetVal + diligence + deposit + quest + luck;
```

다음으로 교체 (미사용이 되는 `luck` 변수 선언도 함께 제거):

```javascript
    function refreshDisplayOnly(p) {
        const cash      = Number(p.manualCash      || 0);
        const assetVal  = Number(calcActiveAsset(p.assets || {}) || 0);
        const diligence = Number(p.diligenceReward || 0);
        const deposit   = Number(p.depositReward   || 0);
        const quest     = Number(p.questReward     || 0);
        const base = cash + assetVal + diligence + deposit + quest;
```

- [ ] **Step 6: `js/report.js` — 과거 게임 리로드 재계산 수정**

`js/report.js:1313`에서 찾기:

```javascript
                        const base = (p.manualCash || 0) + calcEstate(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0) + (p.luckReward || 0);
```

다음으로 교체:

```javascript
                        const base = (p.manualCash || 0) + calcEstate(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
```

`js/report.js:1322`에서 찾기:

```javascript
                        p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0) + (p.luckReward || 0);
```

다음으로 교체:

```javascript
                        p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
```

- [ ] **Step 7: 테스트 실행해서 통과 확인**

Run: `node tests/luck-reward-integration.test.js`
Expected: `luck-reward-integration.test.js (luckReward excluded from total) passed`

- [ ] **Step 8: luck 관련 전체 테스트 스위트 회귀 확인**

Run (bash):
```bash
for f in tests/luck-*.test.js; do node "$f" || echo "FAILED: $f"; done
```
Expected: 7개 파일 모두 `... passed` 출력, `FAILED` 없음. (`luckReward`를 여전히 저장·조회·배지
표시하는 다른 테스트들은 이번 변경으로 영향받지 않아야 한다.)

- [ ] **Step 9: 저장소 전체 테스트 스위트 실행 (회귀 확인)**

Run (bash):
```bash
for f in tests/*.test.js; do node "$f" || echo "FAILED: $f"; done
```
Expected: 모든 파일이 `... passed`를 출력하고 `FAILED` 줄이 없어야 한다.

- [ ] **Step 10: Commit**

```bash
git add js/app.js js/report.js tests/luck-reward-integration.test.js
git commit -m "fix: exclude luckReward from total-asset formula to avoid double-counting with manualCash"
```

---

## Self-Review Notes

- **Spec coverage:** 설계 문서의 "제거 대상 6곳" 중 `js/app.js` 2곳 + `js/report.js` 3곳(설계 문서에는
  4곳으로 표기됐으나 실제 코드 확인 결과 `refreshDisplayOnly` 1곳 + 리로드 재계산 2곳 = 3곳) 총 5곳이
  이 Task 1로 모두 커버된다. `luck_state`/`luck_history`/`sbSaveLuckReward` 등 "유지되는 것" 항목은
  아예 수정 대상이 아니므로 별도 Task 없이 그대로 둔다.
- **Placeholder scan:** 없음 — 모든 Step에 실제 코드/명령어 포함.
- **Type consistency:** `p.luckReward` 프로퍼티명은 전 구간에서 동일하게 유지(제거만 함, 이름 변경 없음).
