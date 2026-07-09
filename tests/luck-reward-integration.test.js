// tests/luck-reward-integration.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJs    = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const reportJs = fs.readFileSync(path.join(root, 'js/report.js'), 'utf8');

// switchScreen: luck 동기화 훅
assert(/_luckStopSync\(\);/.test(appJs), 'switchScreen should stop luck sync on every transition');
assert(/if \(id === 'luckScreen'\) _luckStartSync\(\);/.test(appJs), 'switchScreen should start luck sync when entering luckScreen');

// app.js 총자산 공식
const applyInputsFn = appJs.match(/function applyInputsToPlayer[\s\S]*?\n    }/)[0];
assert(/\(p\.luckReward \|\| 0\)/.test(applyInputsFn), 'applyInputsToPlayer total formula should include luckReward');

const recalcFn = appJs.match(/function recalculateAllRankings[\s\S]*?\n    }/)[0];
assert(/\(p\.luckReward \|\| 0\)/.test(recalcFn), 'recalculateAllRankings total formula should include luckReward');

// report.js 총자산 공식 (2곳: 심화/기본)
assert(
    /\+ \(p\.diligenceReward \|\| 0\) \+ \(p\.questReward \|\| 0\) \+ \(p\.depositReward \|\| 0\) \+ \(p\.luckReward \|\| 0\)/.test(reportJs),
    'report.js balance-load total formulas should include luckReward'
);

console.log('luck-reward-integration.test.js (app.js portion) passed');
