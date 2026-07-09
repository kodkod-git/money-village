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

console.log('luck-games.test.js (rps portion) passed');
