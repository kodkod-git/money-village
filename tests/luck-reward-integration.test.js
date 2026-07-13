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
