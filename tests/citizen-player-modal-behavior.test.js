const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexHtml = read('index.html');
const setupJs = read('js/setup.js');
const countingJs = read('js/counting.js');

assert(
  /id="gameStep3"[\s\S]*class="btn btn-citizen btn-mini"[\s\S]*openCitizenMgmtModal\(\)/.test(indexHtml),
  'game-start participant entry step should expose a citizen management button'
);

assert(
  /id="playerEditModal"[\s\S]*class="btn btn-citizen btn-mini"[\s\S]*openCitizenMgmtModal\(\)/.test(indexHtml),
  'counting-screen player edit modal should expose a citizen management button'
);

assert(
  setupJs.includes("row.dataset.loadedCitizen = 'true';"),
  'loading a citizen into a row should mark the real-name/nickname fields as locked'
);

assert(
  setupJs.includes('function handleLockedCitizenNameEdit'),
  'locked loaded-citizen name fields should show the citizen-management guidance alert'
);

assert(
  /await _syncPlayerEditsToDb\(oldPlayers, newPlayers\);[\s\S]*closePlayerEditModal\(true\);/.test(countingJs),
  'applying player edits should wait for DB sync before closing the modal'
);

assert(
  /row\.dataset\.userId = p\.userId \|\| '';\s*\n\s*lockLoadedCitizenNameFields\(row\);/.test(countingJs),
  'existing participants in the counting edit modal should have real-name/nickname locked immediately'
);

assert(
  /wrapper\.dataset\.teamId = members\.find\(p => p\.teamId\)\?\.teamId \|\| '';/.test(countingJs),
  'team edit sections should preserve the original team_id when the modal opens'
);

assert(
  /const teamId = teamSec\.dataset\.teamId \|\| \('T' \+ Math\.random\(\)\.toString\(36\)\.substr\(2, 8\)\.toUpperCase\(\)\);/.test(countingJs),
  'saving a renamed team should reuse the section team_id instead of looking it up by the edited team name'
);

assert(
  countingJs.includes('function addEditMember') &&
    /addMember\(teamSection, false\);[\s\S]*lockLoadedCitizenNameFields\(row\);/.test(countingJs),
  'new team members added from the counting edit modal should also have name fields locked'
);
