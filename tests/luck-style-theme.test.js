const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

assert(/\.btn-luck\s*\{\s*background:\s*#[0-9a-fA-F]{6};\s*color:\s*#fff;\s*\}/.test(css), '.btn-luck should be defined next to .btn-bank/.btn-quiz');
assert(/#luckView2 \.bank-screen-title\s*\{/.test(css), 'luckView2 should override the screen title color (red theme)');
assert(/#luckView2 \.bank-player-card\s*\{/.test(css), 'luckView2 should override player card colors (red theme)');
assert(/\.luck-game-stage\s*\{/.test(css), 'luck game stage container should be styled');
assert(/\.luck-game-img\s*\{/.test(css), 'luck game image should be styled');
assert(/\.luck-choice-btns\s*\{/.test(css), 'luck choice button row should be styled');
assert(/\.luck-color-btn\s*\{/.test(css), 'luck roulette color buttons should be styled');
assert(/@keyframes luck-spin/.test(css), 'roulette spin animation should be defined');
assert(/\.luck-roulette-spinning\s*\{[^}]*animation:\s*luck-spin/.test(css), 'roulette image should use the spin animation while active');

console.log('luck-style-theme.test.js passed');
