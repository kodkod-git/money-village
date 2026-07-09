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

// View 2: 목록 — 보상 배지/팀 탭 없어야 함
assert(html.includes('id="luckPlayerGrid"'), 'luckScreen should have a player grid');
assert(html.includes('screen-bottom-actions luck-close-actions'), 'luck close action area should use the full-width close button layout');
assert(!/#luckScreen[\s\S]{0,400}player-tab-bar/.test(html), 'luckScreen should not have a team/individual tab bar');
assert(html.includes('onclick="luckClose()"'), 'luckScreen should have a 마감 button');
assert(html.includes('onclick="luckReset()"'), 'luckScreen should have a 전체 초기화 button');

// View 3: 게임 선택
assert(html.includes(`onclick="luckSelectGame('rps')"`), 'game-select view should offer RPS');
assert(html.includes(`onclick="luckSelectGame('roulette')"`), 'game-select view should offer roulette');
assert(html.includes(`onclick="luckSelectGame('dice')"`), 'game-select view should offer dice');

// View 4: 배팅 신청서 — 예금 신청서(bank View3)와 동일한 스테퍼 재사용
assert(html.includes('id="luckBetAmountDisplay"'), 'bet view should show the bet amount');
assert(/onmousedown="startHold\(\(\)=>luckAdjustBet\(-10000\)\)"/.test(html), 'bet stepper should reuse startHold/stopHold like the deposit form');
assert(html.includes('onclick="luckStep2Submit()"'), 'bet view should have a 배팅 완료 button');

// View 5: 게임 플레이
assert(html.includes('id="luckGameImg"'), 'play view should have a single game image element shared by all 3 games');
assert(html.includes(`onclick="luckRpsPick('scissors')"`), 'play view should have RPS pick buttons');
assert(html.includes(`onclick="luckRoulettePick('red')"`), 'play view should have roulette color buttons');
assert(html.includes('onclick="luckDiceStop()"'), 'play view should have a dice 멈춤 button');

// View 6: 결과
assert(html.includes('id="luckRReward"'), 'result view should show the reward amount');
assert(html.includes('onclick="luckNextStudent()"'), 'result view should have a 다른 학생 배팅 접수 button');

// 3D 주사위 모델 (Three.js 직접 렌더링)
assert(html.includes('"three": "https://unpkg.com/three@0.160.0/build/three.module.js"'), 'index.html should import-map three.js for the 3D dice');
assert(html.includes('GLTFLoader'), 'index.html should load GLTFLoader for the dice_spin.glb asset');
assert(html.includes('id="luckDiceModel"'), 'play view should have a container element for the 3D dice canvas');

console.log('luck-screen-markup.test.js (entry + script) passed');
