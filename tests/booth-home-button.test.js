// tests/booth-home-button.test.js
// 은행/퀴즈/행운 첫 화면 좌상단 버튼: 뒤로가기(←) → 홈 아이콘 버튼.
// 부스 진행 중에는 예/아니오 확인 모달을 거쳐 메인으로 나간다.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const app = read('js/app.js');
const css = read('style.css');

// ── 마크업: 세 부스 View2 헤더에 홈 버튼 ─────────────────────────────────────
for (const [view, type] of [['bankView2', 'bank'], ['quizView2', 'quiz'], ['luckView2', 'luck']]) {
    const start = html.indexOf(`id="${view}"`);
    assert(start !== -1, `${view} should exist`);
    const header = html.slice(start, html.indexOf('</div>', html.indexOf('bank-screen-header', start)));
    assert(new RegExp(`class="bank-back-btn booth-home-btn"[^>]*onclick="boothGoHome\\('${type}'\\)"`).test(header),
        `${view} header should use the home button calling boothGoHome('${type}')`);
    assert(/aria-label="메인 화면으로"/.test(header), `${view} home button should have an accessible label`);
    assert(/<svg/.test(header), `${view} home button should render a home icon`);
    assert(!/switchScreen\('setupScreen'\)">←</.test(header), `${view} should no longer use the ← back button`);
}

// ── 확인 모달: 예/아니오 ─────────────────────────────────────────────────────
const modal = html.match(/<div id="boothHomeConfirmModal"[\s\S]*?\n    <\/div>/);
assert(modal, 'boothHomeConfirmModal should exist');
assert(/id="boothHomeConfirmMsg"/.test(modal[0]), 'modal should have a message slot');
assert(/onclick="_boothGoHomeConfirmed\(\)"[^>]*>예</.test(modal[0]), 'modal should have 예 button');
assert(/onclick="_boothGoHomeCancel\(\)"[^>]*>아니오</.test(modal[0]), 'modal should have 아니오 button');

assert(/\.booth-home-btn[^{]*\{/.test(css), 'booth-home-btn style should exist');

// ── 동작: 진행 중이면 모달, 아니면 바로 메인 ──────────────────────────────────
const grab = (name) => {
    const m = app.match(new RegExp(`function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\}`));
    assert(m, `${name} should exist in js/app.js`);
    return m[0];
};
const labelConst = app.match(/const _BOOTH_LABEL = \{[^}]*\};/);
assert(labelConst, '_BOOTH_LABEL should exist in js/app.js');
const src = labelConst[0] + '\n' + ['_isBoothInProgress', 'boothGoHome', '_boothGoHomeConfirmed', '_boothGoHomeCancel'].map(grab).join('\n');

function run(state) {
    const modalEl = { classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } } };
    const msgEl = { textContent: '' };
    const screens = [];
    const env = {
        _bank: state.bank, _quiz: state.quiz, _luck: state.luck,
        switchScreen: (id) => screens.push(id),
        document: { getElementById: (id) => id === 'boothHomeConfirmModal' ? modalEl : msgEl },
    };
    const fn = new Function(...Object.keys(env), `${src}; return { boothGoHome, _boothGoHomeConfirmed, _boothGoHomeCancel };`);
    return { api: fn(...Object.values(env)), modalEl, msgEl, screens };
}

const idle = { bank: { gameId: null, currentRound: 1 }, quiz: { gameId: null, isClosed: false }, luck: { gameId: null, isClosed: false } };

// 진행 중 → 모달 표시, 화면 전환 없음 / 예 → 메인
for (const [type, st] of [
    ['bank', { ...idle, bank: { gameId: 'g', currentRound: 2 } }],
    ['quiz', { ...idle, quiz: { gameId: 'g', isClosed: false } }],
    ['luck', { ...idle, luck: { gameId: 'g', isClosed: false } }],
]) {
    const t = run(st);
    t.api.boothGoHome(type);
    assert(t.modalEl.classList.contains('show'), `${type}: in-progress booth should show the confirm modal`);
    assert.deepStrictEqual(t.screens, [], `${type}: should not leave before confirmation`);
    assert(/나가시겠습니까/.test(t.msgEl.textContent), `${type}: modal should show a warning message`);
    t.api._boothGoHomeCancel();
    assert(!t.modalEl.classList.contains('show') && t.screens.length === 0, `${type}: 아니오 should stay on the booth`);
    t.api.boothGoHome(type);
    t.api._boothGoHomeConfirmed();
    assert.deepStrictEqual(t.screens, ['setupScreen'], `${type}: 예 should go to the main screen`);
    assert(!t.modalEl.classList.contains('show'), `${type}: modal should close after 예`);
}

// 마감/종료 상태 → 확인 없이 바로 메인
for (const [type, st] of [
    ['bank', { ...idle, bank: { gameId: 'g', currentRound: 4 } }],
    ['quiz', { ...idle, quiz: { gameId: 'g', isClosed: true } }],
    ['luck', { ...idle, luck: { gameId: 'g', isClosed: true } }],
]) {
    const t = run(st);
    t.api.boothGoHome(type);
    assert(!t.modalEl.classList.contains('show'), `${type}: closed booth should not prompt`);
    assert.deepStrictEqual(t.screens, ['setupScreen'], `${type}: closed booth should go straight to main`);
}

console.log('booth-home-button.test.js passed');
