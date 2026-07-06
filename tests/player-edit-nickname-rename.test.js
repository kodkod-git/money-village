const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const countingJs = read('js/counting.js');

// Bug: renaming a player's nickname in the counting-screen edit modal used to look up
// the existing player object by nickname TEXT, which never matched after a rename (the
// map was keyed by the OLD nickname), so a brand new player object with empty assets
// replaced the original one and previously entered assets disappeared from the screen.
//
// Fix: identity is now tracked via the player's stable user_id (uuid), stamped onto each
// edit row as a data-user-id attribute, so a nickname change never breaks the lookup.

assert(
  countingJs.includes("row.dataset.userId = p.userId || '';"),
  'individual and team player edit rows should be tagged with the player\'s stable user_id'
);

assert(
  /const rowUserId = row\.dataset\.userId \|\| '';\s*\n\s*const existing = rowUserId \? existingByUserId\[rowUserId\] : null;/.test(countingJs),
  'edit save should look up the existing player by user_id, not by nickname text'
);

const userIdLookupMatches = countingJs.match(/const existing = rowUserId \? existingByUserId\[rowUserId\] : null;/g) || [];
assert(userIdLookupMatches.length === 2, 'both individual and team edit save paths should match players by user_id');

assert(
  /existing\.realName = realName; existing\.name = realName; existing\.id = i;\s*\n\s*existing\.nickname = nickname;/.test(countingJs),
  'saving individual edits should actually apply the renamed nickname to the existing player'
);
assert(
  /existing\.realName = realName; existing\.name = realName;\s*\n\s*existing\.nickname = nickname;/.test(countingJs),
  'saving team edits should actually apply the renamed nickname to the existing player'
);

// The sync-to-DB step must patch users.nickname for a renamed-but-kept player instead of
// deleting/recreating their game-table rows, so their saved assets survive the rename.
assert(
  /const nicknameChanged = _nick\(old\.nickname\) !== _nick\(p\.nickname\);/.test(countingJs),
  '_syncPlayerEditsToDb should detect a pure nickname change for kept players'
);
assert(
  /if \(nicknameChanged \|\| realNameChanged\) \{\s*\n\s*await _sb\.from\('users'\)/.test(countingJs),
  '_syncPlayerEditsToDb should patch users.nickname directly instead of touching game/asset tables when only the nickname changed'
);
