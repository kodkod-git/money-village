// tests/qa-20261024-fixes.test.js
// 2026-10-24 QA 시뮬레이션(12명 · 2인 6팀 팀전)에서 발견된 이슈 수정에 대한 회귀 테스트.
// test-reports/20261024_qa_result_management_system.md 참조.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const bank = read('js/bank.js');

// ── B-3: 팀 마지막 신청자의 bank_history 가 matured=0 으로 덮어써지면 안 됨 ──────
// 마지막 팀원 신청 시 (matured=0) upsert 와 팀 정산 upsert 가 같은 키로 동시에 날아가
// 도착 순서가 뒤바뀌면 0 이 최종값으로 남았다. 팀 완료 여부를 먼저 계산하고,
// 미완료일 때만 (matured=0) 행을 기록해야 한다.
const submitTeamFn = bank.match(/function _bankSubmitTeam\(p, type, amount\)[\s\S]*?\n}/);
assert(submitTeamFn, '_bankSubmitTeam should exist');
const body = submitTeamFn[0];

const allDoneIdx = body.indexOf('const allDone');
const pendingUpsert = body.match(/sbUpsertBankHistory\([^;]*?amount,\s*0,\s*true\)/);
assert(pendingUpsert, '_bankSubmitTeam should still record a pending (matured=0) row for incomplete teams');
assert(allDoneIdx !== -1 && allDoneIdx < body.indexOf(pendingUpsert[0]),
    'allDone must be computed before the pending upsert (B-3)');
assert(/if\s*\(\s*!allDone\s*\)\s*\{?\s*sbUpsertBankHistory\([^;]*?amount,\s*0,\s*true\)/.test(body),
    'the matured=0 upsert must only run when the team is not complete, so it cannot race the settlement upsert (B-3)');

console.log('qa-20261024-fixes.test.js passed');
