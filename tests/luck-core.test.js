// tests/luck-core.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsPath = path.join(root, 'js/luck.js');
assert(fs.existsSync(jsPath), 'js/luck.js should exist');
const js = fs.readFileSync(jsPath, 'utf8');

// 상태 객체
assert(/const _luck = \{/.test(js), '_luck state object should exist');
assert(/multipliers:\s*\{\s*rps:\s*4,\s*roulette:\s*5,\s*dice:\s*7\s*\}/.test(js), 'default multipliers should be rps:4, roulette:5, dice:7 per the proposal');
assert(/isClosed:\s*false/.test(js), '_luck should track isClosed like quiz');

// 모달 플로우
assert(/async function openLuckModal\(\)/.test(js), 'openLuckModal should exist');
assert(/function closeLuckModal\(force = false\)/.test(js), 'closeLuckModal should exist');
assert(/function handleLuckModalBackdrop\(e\)/.test(js), 'handleLuckModalBackdrop should exist');
assert(/async function onLuckDateChange\(\)/.test(js), 'onLuckDateChange should exist');
assert(/async function _luckSelectGame\(gameId, date, sectionNum, cardEl\)/.test(js), '_luckSelectGame should exist');
assert(/function luckAdjustMultiplier\(type, delta\)/.test(js), 'luckAdjustMultiplier should exist');
assert(/if \(next < 1\) return;/.test(js), 'multiplier should not go below 1x');
assert(/async function luckStep1Complete\(\)/.test(js), 'luckStep1Complete should exist');
assert(/switchScreen\('luckScreen'\)/.test(js), 'luckStep1Complete should navigate to luckScreen');

// Supabase 함수 사용
assert(/sbGetGameDates\(\)/.test(js), 'modal should reuse the shared sbGetGameDates');
assert(/sbGetPlayersByGameId\(_luck\.gameId\)/.test(js), 'luckStep1Complete should load players via the shared loader');
assert(/sbUpsertLuckState\(_luck\.gameId,/.test(js), 'luckStep1Complete should persist multipliers via sbUpsertLuckState');

// 동기화 폴링
assert(/function _luckStartSync\(\)/.test(js), '_luckStartSync should exist');
assert(/function _luckStopSync\(\)/.test(js), '_luckStopSync should exist');
assert(/setInterval\(_luckPollAndMerge, 3000\)/.test(js), 'luck sync should poll every 3s like bank/quiz');
assert(/async function _luckPollAndMerge\(\)/.test(js), '_luckPollAndMerge should exist');
assert(/function _luckMergeRemoteState\(state, history\)/.test(js), '_luckMergeRemoteState should exist');

console.log('luck-core.test.js passed');
