// tests/luck-games.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js/luck.js'), 'utf8');

// 공유 결과 처리
assert(/function _luckResolve\(isWin, detail\)/.test(js), '_luckResolve should exist as the shared win/lose handler');
assert(/sbInsertLuckHistory\(_luck\.gameId, p\.user_id, type, amount, matured, isWin\)/.test(js), '_luckResolve should record every play via sbInsertLuckHistory (insert, not upsert)');
assert(/sbSaveLuckReward\(_luck\.gameId, p\.user_id, _luck\.earnedRewards\[p\.nickname\]\)/.test(js), '_luckResolve should persist the cumulative reward only on a win');
assert(/_luckShowView\(6\)/.test(js), '_luckResolve should navigate to the result view');
assert(/function luckNextStudent\(\)/.test(js), 'luckNextStudent should exist to return to the player list');

// 가위바위보
assert(/const _RPS_IMAGES = \{/.test(js), '_RPS_IMAGES should map each hand to an image path under image/luck/');
assert(/image\/luck\/rps_scissors\.png/.test(js), 'scissors image path should follow the image/luck/ convention');
assert(/image\/luck\/rps_rock\.png/.test(js), 'rock image path should follow the image/luck/ convention');
assert(/image\/luck\/rps_paper\.png/.test(js), 'paper image path should follow the image/luck/ convention');
assert(/const _RPS_BEATS = \{\s*scissors:\s*'paper',\s*rock:\s*'scissors',\s*paper:\s*'rock'\s*\}/.test(js), 'RPS win table should encode standard rules (scissors beats paper, rock beats scissors, paper beats rock)');

assert(/function _luckRpsStart\(\)/.test(js), '_luckRpsStart should exist');
assert(/setInterval\([\s\S]{0,200}, 200\)/.test(js), 'RPS should cycle hands every 0.2s per the proposal');

assert(/function luckRpsPick\(playerChoice\)/.test(js), 'luckRpsPick should exist');
assert(/clearInterval\(_luck\.rpsCycleTimer\)/.test(js), 'picking a hand should stop the 0.2s cycle immediately (result decided at click time)');
assert(/Math\.floor\(Math\.random\(\) \* 3\)/.test(js), "computer's hand should be picked with Math.random() at click time, not pre-determined");
assert(/_RPS_BEATS\[playerChoice\] === computerChoice/.test(js), 'win should be judged by standard RPS rules, not equality');

// 룰렛
assert(/const _ROULETTE_COLORS = \['red', 'blue', 'yellow', 'green'\]/.test(js), 'roulette should support exactly the 4 colors from the proposal');
assert(/function _luckRouletteStart\(\)/.test(js), '_luckRouletteStart should exist');
assert(/image\/luck\/roulette_wheel\.png/.test(js), 'roulette wheel image path should follow the image/luck/ convention');
assert(/luck-roulette-spinning/.test(js), 'roulette should toggle the CSS spin class while active');

assert(/function luckRoulettePick\(playerColor\)/.test(js), 'luckRoulettePick should exist');
assert(/_ROULETTE_COLORS\[Math\.floor\(Math\.random\(\) \* 4\)\]/.test(js), 'winning color should be picked with Math.random() at click time');
assert(/playerColor === winningColor/.test(js), 'win should require the clicked color to match the randomly decided winning color');
assert(/classList\.remove\('luck-roulette-spinning'\)/.test(js), 'picking a color should stop the spin animation immediately');

assert(/function _luckDiceStart\(\)/.test(js), '_luckDiceStart should exist');
assert(/image\/luck\/dice_spin\.gif/.test(js), 'dice should play a spin GIF while rolling (per the resolved GIF-vs-static-frames design decision)');

assert(/function luckDiceStop\(\)/.test(js), 'luckDiceStop should exist');
assert(/Math\.floor\(Math\.random\(\) \* 6\) \+ 1/.test(js), 'dice face should be picked 1-6 with Math.random() at click time');
assert(/`image\/luck\/dice_face_\$\{face\}\.png`/.test(js), 'stopping should swap the GIF for a static per-face image so the shown result is always exact — a GIF cannot be paused at an arbitrary frame');
assert(/face === 6/.test(js), 'winning requires exactly a 6, per the proposal');

console.log('luck-games.test.js passed');
