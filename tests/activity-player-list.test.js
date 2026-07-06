const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexHtml = read('index.html');
const bankJs = read('js/bank.js');
const quizJs = read('js/quiz.js');
const css = read('style.css');

assert(fs.existsSync(path.join(root, 'js/player-list-view.js')), 'shared player list renderer should exist');

const sharedJs = read('js/player-list-view.js');
assert(/function\s+renderActivityPlayerList/.test(sharedJs), 'shared renderer should expose renderActivityPlayerList');
assert(/function\s+renderActivityTabs/.test(sharedJs), 'shared renderer should expose renderActivityTabs');
assert(/function\s+createActivityPlayerCard/.test(sharedJs), 'shared renderer should create player cards');
assert(sharedJs.includes('team-group'), 'shared renderer should own team group markup');
assert(sharedJs.includes('bank-player-card'), 'shared renderer should own player card markup');
assert(sharedJs.includes('main-card'), 'shared renderer should mark each group as a main card');
assert(sharedJs.includes('main-card-header'), 'shared renderer should mark the card header area');
assert(sharedJs.includes('main-card-body'), 'shared renderer should mark the card body area');
assert(sharedJs.includes('player-button'), 'shared renderer should mark player cards as player buttons');
assert(sharedJs.includes('gridTemplateColumns'), 'shared renderer should control individual/team grid columns');

assert(indexHtml.includes('<script src="js/player-list-view.js"></script>'), 'index.html should load shared renderer before bank/quiz modules');
assert(
  indexHtml.indexOf('js/player-list-view.js') < indexHtml.indexOf('js/bank.js') &&
    indexHtml.indexOf('js/player-list-view.js') < indexHtml.indexOf('js/quiz.js'),
  'shared renderer should load before bank.js and quiz.js'
);

assert(bankJs.includes('renderActivityTabs({'), 'bank list should use shared tab renderer');
assert(bankJs.includes('renderActivityPlayerList({'), 'bank list should use shared player list renderer');
assert(
  bankJs.includes('<span class="bank-header-tags">${typeTags}</span>'),
  'bank individual type badges should render in a dedicated header tag lane'
);
assert(!bankJs.includes('footerHtml: typeTags'), 'bank individual type badges should not render below the player card');
assert(
  /\.bank-header-tags\s*\{[\s\S]*display:\s*flex;[\s\S]*overflow-x:\s*auto;[\s\S]*white-space:\s*nowrap;/.test(css),
  'bank header type badge lane should stay on one line and scroll horizontally when crowded'
);
assert(
  /\.bank-player-grid\s*\{[^}]*--main-card-min-width:\s*280px;[^}]*--main-card-min-height:\s*160px;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(var\(--main-card-min-width\),\s*1fr\)\);[^}]*\}/.test(css),
  'personal view should use two columns that never shrink a main card below its minimum width'
);
assert(
  /\.bank-player-grid\.is-team\s*\{[^}]*grid-template-columns:\s*minmax\(var\(--main-card-min-width\),\s*1fr\);[^}]*\}/.test(css),
  'team view should use one column that never shrinks a main card below its minimum width'
);
assert(
  /\.main-card\s*\{[^}]*min-width:\s*var\(--main-card-min-width\);[^}]*min-height:\s*var\(--main-card-min-height\);[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);[^}]*\}/.test(css),
  'main cards should have stable minimum dimensions and explicit header/body rows'
);
assert(
  /\.main-card-header\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;[^}]*white-space:\s*nowrap;[^}]*\}/.test(css),
  'main card headers should scroll horizontally when badges overflow'
);
assert(
  /\.main-card-body\s*\{[^}]*display:\s*grid;[^}]*grid-auto-rows:\s*minmax\(var\(--player-button-min-height\),\s*1fr\);[^}]*\}/.test(css),
  'main card body should determine player button sizing'
);
assert(
  /\.player-button\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*min-height:\s*var\(--player-button-min-height\);[^}]*\}/.test(css),
  'player buttons should fill the size allocated by the main card body'
);
assert(!/\.bank-player-grid \.team-group-players\s*\{[^}]*flex:\s*1/.test(css), 'main card body should not stretch with flex');
assert(!/\.bank-player-grid \.team-group-players\s*\{[^}]*min-height:\s*max-content/.test(css), 'main card body should not use max-content min-height');
assert(
  /\.bank-status-type,\s*\.bank-status-pending,\s*\.bank-done-badge\s*\{[\s\S]*flex:\s*0 0 auto;[\s\S]*white-space:\s*nowrap;/.test(css),
  'bank status and type badges should not shrink or wrap'
);
assert(
  /\.team-group-header > \.bank-status-pending:first-child,\s*\.team-group-header > \.bank-done-badge:first-child\s*\{[\s\S]*overflow:\s*visible;[\s\S]*text-overflow:\s*clip;/.test(css),
  'bank status badges should not inherit first-child ellipsis behavior'
);
assert(quizJs.includes('renderActivityTabs({'), 'quiz list should use shared tab renderer');
assert(quizJs.includes('renderActivityPlayerList({'), 'quiz list should use shared player list renderer');

assert(!/function\s+_bankMakePlayerCard/.test(bankJs), 'bank should not keep a private player-card renderer');
assert(!/sortedIndiv\s*=/.test(quizJs), 'quiz should not keep a separate individual list renderer');
assert(!/sortedTeamIndiv\s*=/.test(quizJs), 'quiz should not keep a separate team-individual list renderer');
