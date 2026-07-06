const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

assert(
  /#bankScreen \.bank-screen-wrap,\s*#quizView2 > \.bank-screen-wrap\s*\{[\s\S]*height:\s*calc\(100vh - 48px\);[\s\S]*height:\s*calc\(100dvh - 48px\);/.test(css),
  'activity wrapper should provide a 100vh fallback before 100dvh for older iPad Safari'
);

assert(
  /\.bank-player-grid\s*\{[\s\S]*grid-auto-rows:\s*auto;[\s\S]*align-content:\s*start;/.test(css),
  'activity grid rows should use intrinsic height instead of stretching rows with 1fr'
);

assert(
  !/grid-auto-rows:\s*minmax\(max-content,\s*1fr\)/.test(css),
  'activity grid should not stretch implicit rows with minmax(max-content, 1fr)'
);

assert(
  /#bankPlayerGrid,\s*#quizPlayerGrid\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*overflow-y:\s*auto;[\s\S]*-webkit-overflow-scrolling:\s*touch;/.test(css),
  'bank and quiz player grids should share touch-friendly internal scrolling'
);

assert(
  /#bankView2,\s*#quizView2\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;[^}]*\}/.test(css),
  'activity list views should reserve fixed header/tab/actions areas around the scrollable card list'
);

assert(
  /\.player-tab-bar\s*\{[^}]*flex:\s*0 0 auto;[^}]*position:\s*relative;[^}]*z-index:\s*2;[^}]*\}/.test(css),
  'team/personal tab bar should never be clipped or covered by the card list'
);

assert(
  /#bankPlayerGrid,\s*#quizPlayerGrid\s*\{[^}]*padding:\s*12px 0 10px;/.test(css),
  'card lists should start below the tab bar with enough visual separation'
);
