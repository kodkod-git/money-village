// tests/luck-core.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsPath = path.join(root, 'js/luck.js');
assert(fs.existsSync(jsPath), 'js/luck.js should exist');
const js = fs.readFileSync(jsPath, 'utf8');

assert(/const _luck = \{/.test(js), '_luck state object should exist');
assert(/multipliers:\s*\{\s*rps:\s*4,\s*roulette:\s*5,\s*dice:\s*7\s*\}/.test(js), 'default multipliers should be rps:4, roulette:5, dice:7 per the proposal');
assert(/isClosed:\s*false/.test(js), '_luck should track isClosed like quiz');

assert(/async function openLuckModal\(\)/.test(js), 'openLuckModal should exist');
assert(/function closeLuckModal\(force = false\)/.test(js), 'closeLuckModal should exist');
assert(/function handleLuckModalBackdrop\(e\)/.test(js), 'handleLuckModalBackdrop should exist');
assert(/async function onLuckDateChange\(\)/.test(js), 'onLuckDateChange should exist');
assert(/async function _luckSelectGame\(gameId, date, sectionNum, cardEl\)/.test(js), '_luckSelectGame should exist');
assert(/function luckAdjustMultiplier\(type, delta\)/.test(js), 'luckAdjustMultiplier should exist');
assert(/if \(next < 1\) return;/.test(js), 'multiplier should not go below 1x');
assert(/async function luckStep1Complete\(\)/.test(js), 'luckStep1Complete should exist');
assert(/switchScreen\('luckScreen'\)/.test(js), 'luckStep1Complete should navigate to luckScreen');

assert(/sbGetGameDates\(\)/.test(js), 'modal should reuse the shared sbGetGameDates');
assert(/sbGetPlayersByGameId\(_luck\.gameId\)/.test(js), 'luckStep1Complete should load players via the shared loader');
assert(/sbUpsertLuckState\(_luck\.gameId,/.test(js), 'luckStep1Complete should persist multipliers via sbUpsertLuckState');

assert(/function _luckStartSync\(\)/.test(js), '_luckStartSync should exist');
assert(/function _luckStopSync\(\)/.test(js), '_luckStopSync should exist');
assert(/setInterval\(_luckPollAndMerge, 3000\)/.test(js), 'luck sync should poll every 3s like bank/quiz');
assert(/async function _luckPollAndMerge\(\)/.test(js), '_luckPollAndMerge should exist');
assert(/function _luckMergeRemoteState\(state, history\)/.test(js), '_luckMergeRemoteState should exist');

assert(/function _luckShowView\(n\)/.test(js), '_luckShowView should exist to toggle View2~6');
assert(/\[2, 3, 4, 5, 6\]\.forEach/.test(js), '_luckShowView should manage all 5 views');
assert(/i === n \? \(i === 2 \? 'flex' : 'block'\) : 'none'/.test(js), 'luck list view should display as flex so the shared player grid can scroll');
assert(/classList\.toggle\('is-luck-play-view', n === 5\)/.test(js), 'luck play wrapper should scroll the game and result views together');

assert(/function _luckRenderPlayerList\(\)/.test(js), '_luckRenderPlayerList should exist');
assert(/useTeamGroups:\s*false/.test(js), 'luck player list should never use team groups (individual-only per the design)');
assert(/function _luckHistoryRewardDelta\(record\)/.test(js), 'luck should derive reward delta from each history row');
assert(/record\.is_win \? Number\(record\.matured_amount \|\| 0\) : -Number\(record\.amount \|\| 0\)/.test(js), 'luck history should count wins as matured_amount and losses as negative amount');
assert(/function _luckRewardBadgeText\(earned\)/.test(js), 'luck should format player-list reward badge text through a helper');
assert(/if \(amount === 0\) return '0원';/.test(js), 'luck reward badge text should show 0원 without a plus sign');
assert(/const sign = amount < 0 \? '-' : '\+'/.test(js), 'luck reward badge text should use + for positive and - for negative');
assert(/function _luckRewardBadgeClass\(earned\)/.test(js), 'luck should classify zero, positive, and negative reward badges');
assert(/if \(amount === 0\) return 'luck-earned-badge--zero';/.test(js), 'zero luck reward badges should use a dedicated gray class');
assert(/const badgeClass = _luckRewardBadgeClass\(earned\)/.test(js), 'luck player list should use the reward badge class helper');
assert(/const headerHtml = `<span class="luck-earned-badge \$\{badgeClass\}">\$\{_luckRewardBadgeText\(earned\)\}<\/span>`/.test(js), 'luck player list should always render a signed reward badge');
assert(!/getTeamGroupState/.test(js), 'luck.js should not need getTeamGroupState since there is no team mode');
assert(/disabled:\s*_luck\.isClosed/.test(js), 'player cards should disable once the round is closed, with no cooldown/attempt-limit logic otherwise');
assert(!/cooldown/i.test(js), 'luck.js must not port quiz-style cooldown logic (explicitly out of scope)');

assert(/async function luckClose\(\)/.test(js), 'luckClose should exist');
assert(/sbUpsertLuckState\(_luck\.gameId, \{ is_closed: true \}\)/.test(js), 'luckClose should persist is_closed');

assert(/async function luckReset\(\)/.test(js), 'luckReset should exist');
assert(/sbDeleteLuckHistory\(_luck\.gameId\)/.test(js), 'luckReset should delete all history for the game');
assert(/sbSaveLuckReward\(_luck\.gameId, p\.user_id, 0\)/.test(js), 'luckReset should zero out each player persisted luck_reward');

assert(/function luckSelectPlayer\(idx\)/.test(js), 'luckSelectPlayer should exist');
assert(/_luckShowView\(3\)/.test(js), 'luckSelectPlayer should navigate to the game-select view');

assert(/function luckBackToList\(\)/.test(js), 'luckBackToList should exist');

assert(/function luckSelectGame\(type\)/.test(js), 'luckSelectGame should exist');
assert(/function _luckSyncGameSelectUI\(\)/.test(js), '_luckSyncGameSelectUI should exist to sync the selected-game highlight and bet preview');

assert(/function luckAdjustBet\(delta\)/.test(js), 'luckAdjustBet should exist');
assert(/if \(next < 0\) return;/.test(js), 'bet amount should not go negative');

assert(/function _luckUpdateBetPreview\(\)/.test(js), '_luckUpdateBetPreview should exist');
assert(/_luck\.multipliers\[_luck\.selectedGame\]/.test(js), 'bet preview should use the selected game multiplier');

assert(/function luckStep2Submit\(\)/.test(js), 'luckStep2Submit should exist');
assert(/_luckShowView\(5\)/.test(js), 'luckStep2Submit should navigate to the play view');
assert(/function _luckStartGame\(\)/.test(js), '_luckStartGame should exist to dispatch to the selected game engine');

console.log('luck-core.test.js passed');
