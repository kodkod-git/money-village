const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 진입 버튼
assert(/onclick="openLuckModal\(\)">\s*🍀 머니빌리지 행운/.test(html), 'setupScreen should have a luck entry button calling openLuckModal()');
assert(html.indexOf('openBankModal()') < html.indexOf('openLuckModal()'), 'luck button should come after the bank button');

// script 로드 순서: player-list-view.js -> ... -> luck.js, quiz.js 이후
assert(html.includes('<script src="js/luck.js"></script>'), 'index.html should load js/luck.js');
assert(
    html.indexOf('js/player-list-view.js') < html.indexOf('js/luck.js'),
    'luck.js should load after the shared player-list-view.js'
);
assert(
    html.indexOf('js/quiz.js') < html.indexOf('js/luck.js'),
    'luck.js should load after quiz.js (bank -> quiz -> luck ordering)'
);

// luckModal / luckScreen 존재 (Task 6/7에서 채워짐 — 여기서는 최소 자리 확인)
assert(html.includes('id="luckModal"'), 'index.html should define luckModal');
assert(html.includes('id="luckScreen"'), 'index.html should define luckScreen');

assert(html.includes('id="luckDateSelect"'), 'luckModal should have a date select, mirroring bankModal/quizModal');
assert(html.includes('onclick="luckStep1Complete()"'), 'luckModal should have a 설정 완료 button');
assert(html.includes('id="luckRpsMultiplierDisplay"'), 'luckModal should show the RPS multiplier');
assert(html.includes('id="luckRouletteMultiplierDisplay"'), 'luckModal should show the roulette multiplier');
assert(html.includes('id="luckDiceMultiplierDisplay"'), 'luckModal should show the dice multiplier');
assert(html.includes(`onclick="luckAdjustMultiplier('rps', -1)"`), 'RPS multiplier stepper should call luckAdjustMultiplier');

console.log('luck-screen-markup.test.js (entry + script) passed');
