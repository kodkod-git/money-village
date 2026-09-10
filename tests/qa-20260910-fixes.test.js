// tests/qa-20260910-fixes.test.js
// 2026-09-10 QA 시뮬레이션에서 발견된 이슈 수정에 대한 회귀 테스트.
// test-reports/20260910_qa_result_management_system.md 참조.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const supa = read('js/supabase-client.js');
const bank = read('js/bank.js');
const luck = read('js/luck.js');

// ── S-1: sbDeleteGame 이 luck_history / luck_state 도 삭제해야 함 ──────────────
const deleteFn = supa.match(/async function sbDeleteGame[\s\S]*?\n}/);
assert(deleteFn, 'sbDeleteGame should exist');
assert(/'luck_history'/.test(deleteFn[0]), 'sbDeleteGame should delete luck_history (S-1)');
assert(/'luck_state'/.test(deleteFn[0]), 'sbDeleteGame should delete luck_state (S-1)');

// ── B-1: bankReset 이 deposit_reward 를 0 으로 되돌려야 함 ────────────────────
const bankResetFn = bank.match(/async function bankReset\(\)[\s\S]*?\n}/);
assert(bankResetFn, 'bankReset should exist');
assert(
    /sbSaveDepositReward\(\s*_bank\.gameId,\s*p\.user_id,\s*0\s*\)/.test(bankResetFn[0]),
    'bankReset should reset every player deposit_reward to 0 like quizReset/luckReset (B-1)'
);

// ── L-1: luckSelectPlayer 가 배팅 금액/선택 게임을 초기화해야 함 ──────────────
const luckSelectFn = luck.match(/function luckSelectPlayer\(idx\)[\s\S]*?\n}/);
assert(luckSelectFn, 'luckSelectPlayer should exist');
assert(/_luck\.selectedGame\s*=\s*null/.test(luckSelectFn[0]), 'luckSelectPlayer should clear selectedGame (L-1)');
assert(/_luck\.bet\s*=\s*\{\s*amount:\s*_LUCK_DEFAULT_BET\s*\}/.test(luckSelectFn[0]), 'luckSelectPlayer should reset bet to default (L-1)');
assert(/const _LUCK_DEFAULT_BET = 1000;/.test(luck), '_LUCK_DEFAULT_BET constant should exist');

// ── L-2: 주사위 결과 확정이 rAF 밖(setTimeout)에서 일어나야 함 ────────────────
const diceStopFn = luck.match(/function luckDiceStop\(playerGuess\)[\s\S]*?\n}/);
assert(diceStopFn, 'luckDiceStop should exist');
assert(/setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?_luckResolve\(/.test(diceStopFn[0]),
    'luckDiceStop should resolve via setTimeout so a backgrounded tab still finalizes the bet (L-2)');
// settle(rAF) 루프 안에서는 더 이상 _luckResolve 를 호출하지 않아야 함
const settleBlock = diceStopFn[0].match(/function settle\(now\)[\s\S]*?\n    }/);
assert(settleBlock && !/_luckResolve\(/.test(settleBlock[0]),
    'the rAF settle loop should no longer call _luckResolve directly (L-2)');

// ── B-2: 라운드 전환 시 폴링 역전 방지 가드 ─────────────────────────────────
assert(/_bank\._roundChangedAt = Date\.now\(\)/.test(bank), 'round transitions should stamp _roundChangedAt (B-2)');
assert(/localRoundIsFresh/.test(bank), '_bankMergeRemoteState should skip stale remote round while a local change is fresh (B-2)');
assert(/async function bankAdvanceRound\(\)/.test(bank), 'bankAdvanceRound should be async and await the state upsert (B-2)');
assert(/async function bankGoBackRound\(\)/.test(bank), 'bankGoBackRound should be async and await the state upsert (B-2)');

console.log('qa-20260910-fixes.test.js passed');
