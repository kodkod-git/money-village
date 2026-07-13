// tests/luck-games.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js/luck.js'), 'utf8');

// 공유 결과 처리
assert(/function _luckResolve\(isWin, detail\)/.test(js), '_luckResolve should exist as the shared win/lose handler');
assert(/rps:\s*\{\s*label:\s*'[^']+',\s*icon:\s*'✊'\s*\}/.test(js), 'RPS title icon should use the fist representative icon');
assert(/isWin \? '🎉 성공!' : '😢 실패'/.test(js), 'success result title should use 성공 wording');
assert(/sbInsertLuckHistory\(_luck\.gameId, p\.user_id, type, amount, matured, isWin\)/.test(js), '_luckResolve should record every play via sbInsertLuckHistory (insert, not upsert)');
assert(/sbSaveLuckReward\(_luck\.gameId, p\.user_id, _luck\.earnedRewards\[p\.nickname\]\)/.test(js), '_luckResolve should persist the cumulative reward only on a win');
assert(/function _luckDisableVisibleChoiceButtons\(\)/.test(js), '_luckResolve should disable game choice buttons before showing the result');
assert(/btn\.disabled = true/.test(js), 'choice buttons should remain visible but disabled after a result');
assert(/luckView6'\)\.style\.display = 'block'/.test(js), '_luckResolve should show the result panel below the game view');
assert(/function luckNextStudent\(\)/.test(js), 'luckNextStudent should exist to return to the player list');

// 가위바위보
assert(/const _RPS_IMAGES = \{/.test(js), '_RPS_IMAGES should map each hand to an image path under image/luck/');
assert(/image\/luck\/rps_scissors\.jpg/.test(js), 'scissors image path should follow the image/luck/ convention');
assert(/image\/luck\/rps_rock\.jpg/.test(js), 'rock image path should follow the image/luck/ convention');
assert(/image\/luck\/rps_paper\.jpg/.test(js), 'paper image path should follow the image/luck/ convention');
assert(/const _RPS_BEATS = \{\s*scissors:\s*'paper',\s*rock:\s*'scissors',\s*paper:\s*'rock'\s*\}/.test(js), 'RPS win table should encode standard rules (scissors beats paper, rock beats scissors, paper beats rock)');

assert(/function _luckRpsStart\(\)/.test(js), '_luckRpsStart should exist');
assert(/setInterval\([\s\S]{0,200}, 200\)/.test(js), 'RPS should cycle hands every 0.2s per the proposal');
assert(/luckRpsComputerImg/.test(js), 'RPS should render the cycling computer hand in the left panel');
assert(/luckRpsPlayerPlaceholder[\s\S]{0,120}style\.display = 'block'/.test(js), 'RPS should show a ? placeholder before the player picks');

assert(/function luckRpsPick\(playerChoice\)/.test(js), 'luckRpsPick should exist');
assert(/clearInterval\(_luck\.rpsCycleTimer\)/.test(js), 'picking a hand should stop the 0.2s cycle immediately (result decided at click time)');
assert(/luckRpsPlayerPlaceholder[\s\S]{0,120}style\.display = 'none'/.test(js), 'picking a hand should hide the ? placeholder');
assert(/luckRpsPlayerImg[\s\S]{0,160}src = _RPS_IMAGES\[playerChoice\]/.test(js), 'picking a hand should show only the clicked hand in the right panel');
assert(/Math\.floor\(Math\.random\(\) \* 3\)/.test(js), "computer's hand should be picked with Math.random() at click time, not pre-determined");
assert(/luckRpsComputerImg'\)\.src = _RPS_IMAGES\[computerChoice\]/.test(js), 'after picking, the left panel should show the final computer hand');
assert(/_RPS_BEATS\[playerChoice\] === computerChoice/.test(js), 'win should be judged by standard RPS rules, not equality');

// 룰렛
assert(/const _ROULETTE_COLORS = \[\s*\{\s*key:\s*'red',\s*label:\s*'[^']+',\s*color:\s*'#DE4948'\s*\},\s*\{\s*key:\s*'orange',\s*label:\s*'[^']+',\s*color:\s*'#F07854'\s*\},\s*\{\s*key:\s*'green',\s*label:\s*'[^']+',\s*color:\s*'#5ABDAA'\s*\},\s*\{\s*key:\s*'blue',\s*label:\s*'[^']+',\s*color:\s*'#58B7DA'\s*\}/.test(js), 'roulette should define the requested red/orange/green/blue palette as data');
assert(/function _luckRouletteStart\(\)/.test(js), '_luckRouletteStart should exist');
assert(/function _luckBuildRouletteWheel\(\)/.test(js), 'roulette should build its wheel directly in JS');
assert(/document\.createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'svg'\)/.test(js), 'roulette wheel should be rendered as SVG instead of an image asset');
assert(/_luckRouletteSlicePath\(startDeg, endDeg\)/.test(js), 'roulette should draw one SVG path per color slice');
assert(!/image\/luck\/roulette_wheel\.png/.test(js), 'roulette should no longer depend on the roulette_wheel.png image asset');
assert(/luckRoulettePointer'\)\.style\.display = 'block'/.test(js), 'roulette should show the fixed 12-o-clock pointer');
assert(/requestAnimationFrame\(spin\)/.test(js), 'roulette should spin quickly via requestAnimationFrame');

assert(/function luckRoulettePick\(playerColor\)/.test(js), 'luckRoulettePick should exist');
assert(/_ROULETTE_COLORS\[Math\.floor\(Math\.random\(\) \* _ROULETTE_COLORS\.length\)\]\.key/.test(js), 'winning color should be picked from the data array length at click time');
assert(/_luckMarkSelectedChoice\('luckRouletteButtons', playerColor\)/.test(js), 'roulette should mark the selected color button');
assert(/const winningCenterDeg = _luckRouletteCenterDeg\(winningColor\)/.test(js), 'roulette should compute the winning center from the current color list');
assert(/winningTopDeg = \(360 - winningCenterDeg\) % 360/.test(js), 'roulette should rotate the winning color center to the 12-o-clock pointer');
assert(/cubic-bezier\(0\.12, 0\.82, 0\.18, 1\)/.test(js), 'roulette should decelerate after the player clicks');
assert(/playerColor === winningColor/.test(js), 'win should require the clicked color to match the randomly decided winning color');
assert(/setTimeout\(\(\) => _luckResolve\(isWin, \{ playerColor, winningColor \}\), 1400\)/.test(js), 'roulette should reveal the result after the deceleration finishes');

assert(/function _luckDiceStart\(\)/.test(js), '_luckDiceStart should exist');

assert(/function luckDiceStop\(playerGuess\)/.test(js), 'luckDiceStop should take the selected dice guess');
assert(/_luckMarkSelectedChoice\('luckDiceButtons', String\(playerGuess\)\)/.test(js), 'dice should mark the selected number button');
assert(/Math\.floor\(Math\.random\(\) \* 6\) \+ 1/.test(js), 'dice face should be picked 1-6 with Math.random() at click time');
assert(/face === playerGuess/.test(js), 'dice succeeds only when the chosen number matches the rolled face');

// 3D 주사위 (Three.js 직접 렌더링)
assert(/const _DICE_FACE_ORIENTATION = \{/.test(js), '_DICE_FACE_ORIENTATION lookup table should exist for the 3D dice calibration');
assert(/diceGroup\.rotation\.set/.test(js), 'dice engine should drive the Three.js dice group rotation directly');
assert(/new window\.GLTFLoader\(\)\.load\('image\/luck\/dice_spin\.glb'/.test(js), 'dice engine should load the GLB model via GLTFLoader');
assert(/requestAnimationFrame\(tumble\)/.test(js), 'dice should tumble continuously via requestAnimationFrame while rolling');
assert(/cancelAnimationFrame\(_diceRollFrame\)/.test(js), 'stopping the dice should cancel the in-flight roll animation frame');
assert(!/\}, 800\);/.test(js), 'dice should resolve immediately after settling, with no extra 0.8s delay');
assert(/function _luckResetGameImg\(\)[\s\S]*?_diceRollFrame/.test(js), '_luckResetGameImg should also cancel any in-flight dice animation frame, mirroring the RPS/roulette cleanup fixes');

console.log('luck-games.test.js passed');
