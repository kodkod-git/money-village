const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js/supabase-client.js'), 'utf8');

assert(/async function sbGetLuckState\(gameId\)/.test(js), 'sbGetLuckState should exist');
assert(/async function sbUpsertLuckState\(gameId, fields\)/.test(js), 'sbUpsertLuckState should exist');
assert(/_sb\.from\('luck_state'\)\.upsert\(/.test(js), 'sbUpsertLuckState should upsert into luck_state');
assert(/onConflict: 'game_id'/.test(js), 'luck_state upsert should conflict on game_id like bank_state/quiz_state');

assert(/async function sbGetLuckHistory\(gameId\)/.test(js), 'sbGetLuckHistory should exist');
assert(/async function sbInsertLuckHistory\(gameId, userId, luckType, amount, maturedAmount, isWin\)/.test(js), 'sbInsertLuckHistory should exist with the full signature');
assert(/_sb\.from\('luck_history'\)\.insert\(/.test(js), 'sbInsertLuckHistory should INSERT (not upsert) since replays are allowed');

assert(/async function sbDeleteLuckHistory\(gameId\)/.test(js), 'sbDeleteLuckHistory should exist');
assert(/_sb\.from\('luck_history'\)\.delete\(\)\.eq\('game_id', gid\)/.test(js), 'sbDeleteLuckHistory should delete all rows for a game');

assert(/async function sbSaveLuckReward\(gameId, userId, amount\)/.test(js), 'sbSaveLuckReward should exist');
assert(/luck_reward: Number\(amount\)/.test(js), 'sbSaveLuckReward should write the luck_reward column');

const rewardsFnMatch = js.match(/async function sbGetRewardsByGameId[\s\S]*?\n}/);
assert(rewardsFnMatch, 'sbGetRewardsByGameId should exist');
assert(/luck_reward/.test(rewardsFnMatch[0]), 'sbGetRewardsByGameId should select luck_reward alongside quest_reward/deposit_reward');

console.log('luck-supabase-client.test.js passed');
