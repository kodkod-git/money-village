const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

assert(/\.btn-luck\s*\{\s*background:\s*#[0-9a-fA-F]{6};\s*color:\s*#fff;\s*\}/.test(css), '.btn-luck should be defined next to .btn-bank/.btn-quiz');
assert(/#luckView2 \.bank-screen-title\s*\{/.test(css), 'luckView2 should override the screen title color (red theme)');
assert(/#bankPlayerGrid,\s*#quizPlayerGrid,\s*#luckPlayerGrid\s*\{[\s\S]*?overflow-y:\s*auto;/.test(css), 'luck player grid should share the bank/quiz vertical scroll container');
assert(/#luckView2 \.bank-reset-btn\s*\{[\s\S]*?background:\s*#c0392b;/.test(css), 'luck reset button should use the red luck theme');
assert(/#luckView2 \.team-group\s*\{/.test(css), 'luckView2 should override shared main card colors (red theme)');
assert(/#luckView2 \.team-group-header\s*\{/.test(css), 'luckView2 should override shared main card header colors (red theme)');
assert(/#luckView2 \.bank-player-card\s*\{/.test(css), 'luckView2 should override player card colors (red theme)');
assert(/\.luck-game-stage\s*\{/.test(css), 'luck game stage container should be styled');
assert(/\.luck-game-img\s*\{/.test(css), 'luck game image should be styled');
assert(/\.luck-game-img\s*\{[\s\S]*?height:\s*320px;/.test(css), 'shared luck game image should use the same 320px display height as dice');
assert(/#luckScreen \.bank-screen-wrap\.is-luck-play-view\s*\{[\s\S]*?overflow-y:\s*auto;/.test(css), 'luck play wrapper should scroll game and result content together');
assert(/#luckScreen \.bank-screen-wrap\.is-luck-play-view::-webkit-scrollbar\s*\{\s*display:\s*none;\s*\}/.test(css), 'luck play wrapper should hide the scrollbar');
assert(/\.luck-roulette-wheel\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?clip-path:\s*circle\(50% at 50% 50%\);/.test(css), 'roulette wheel should clip away its square background');
assert(/\.luck-roulette-pointer\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*12px;/.test(css), 'roulette should have a fixed pointer at 12 o-clock');
assert(/\.luck-rps-stage\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/.test(css), 'RPS stage should render two side-by-side panels');
assert(/\.luck-rps-stage\s*\{[\s\S]*?width:\s*min\(320px, 100%\);/.test(css), 'RPS stage should use the same 320px display width as other games');
assert(/\.luck-rps-panel\s*\{[\s\S]*?height:\s*320px;/.test(css), 'RPS panels should match the shared 320px game height');
assert(/\.luck-rps-panel\s*\{[\s\S]*?background:\s*#fff;/.test(css), 'RPS hand panels should use a white background');
assert(!/\.luck-rps-panel\s*\{[^}]*border:/.test(css), 'RPS hand panels should not draw a red border');
assert(/\.luck-rps-placeholder\s*\{[\s\S]*?font-size:\s*96px;/.test(css), 'RPS placeholder should show a large ? before selection');
assert(/\.luck-choice-btns\s*\{/.test(css), 'luck choice button row should be styled');
assert(/\.luck-choice-btns \.btn:disabled\s*\{/.test(css), 'choice buttons should have a disabled state while staying visible');
assert(/\.luck-choice-btns \.btn\.is-selected\s*\{[\s\S]*?border:\s*4px solid #111;/.test(css), 'selected choice button should have a thick border');
assert(/\.luck-color-btn\s*\{/.test(css), 'luck roulette color buttons should be styled');
assert(/\.luck-dice-btn\s*\{[\s\S]*?background:\s*#fff;/.test(css), 'dice guess buttons should use a white background');
assert(/\.luck-dice-btn\s*\{[\s\S]*?color:\s*#111;/.test(css), 'dice guess buttons should use black text');
assert(/\.luck-dice-btn\s*\{[\s\S]*?border:\s*1px solid #111;/.test(css), 'dice guess buttons should have a thin black border');
assert(/#luckView6\s*\{[\s\S]*?margin-top:\s*32px;/.test(css), 'luck result panel should sit lower than the game buttons');

console.log('luck-style-theme.test.js passed');
