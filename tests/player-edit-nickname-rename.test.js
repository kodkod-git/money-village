const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const setupJs = read('js/setup.js');
const countingJs = read('js/counting.js');

// Bug: renaming a player's nickname in the counting-screen edit modal used to look up
// the existing player object by the NEW nickname value, which never matched the map
// (keyed by the OLD nickname), so a brand new player object with empty assets replaced
// the original one and previously entered assets disappeared from the screen.

assert(
  /function makeInp\(lbl, realName = '', nickname = '', team='', origNickname = ''\)/.test(setupJs),
  'makeInp should accept the original nickname so edit rows can be traced back to their player'
);
assert(
  /data-orig-nickname="\$\{origNickname\}"/.test(setupJs),
  'each edit row should carry the original nickname as a data attribute'
);

assert(
  countingJs.includes("makeInp(`참가자 ${i + 1}`, p.realName || p.name || '', p.nickname || '', '', p.nickname || '')"),
  'individual player edit rows should be tagged with their original nickname'
);
assert(
  countingJs.includes("makeInp(`참가자 ${j + 1}`, p.realName || p.name || '', p.nickname || '', '', p.nickname || '')"),
  'team member edit rows should be tagged with their original nickname'
);

assert(
  /const origNickname = row\.dataset\.origNickname \|\| '';\s*\n\s*const existing = existingMap\[origNickname\] \|\| existingMap\[nickname\];/.test(countingJs),
  'individual edit save should look up the existing player by original nickname, not the edited one'
);

const teamLookupMatches = countingJs.match(/const existing = existingMap\[origNickname\] \|\| existingMap\[nickname\];/g) || [];
assert(teamLookupMatches.length === 2, 'both individual and team edit save paths should match players by original nickname');

assert(
  /existing\.realName = realName; existing\.name = realName; existing\.id = i;\s*\n\s*existing\.nickname = nickname;/.test(countingJs),
  'saving individual edits should actually apply the renamed nickname to the existing player'
);
assert(
  /existing\.realName = realName; existing\.name = realName;\s*\n\s*existing\.nickname = nickname;/.test(countingJs),
  'saving team edits should actually apply the renamed nickname to the existing player'
);
