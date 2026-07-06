const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexHtml = read('index.html');
const fameJs = read('js/fame.js');

assert(
  indexHtml.includes('id="indivDiligenceCol"') &&
    indexHtml.includes('id="indivDiligenceHeader"'),
  'fame individual table should make the diligence column/header addressable'
);

assert(
  /const hideDiligence = currentFameVariant === 'rich_vessel';/.test(fameJs),
  'fame renderer should detect rich_vessel when toggling diligence column visibility'
);

assert(
  /if \(currentFameVariant !== 'rich_vessel'\) \{[\s\S]*item\.diligence_reward[\s\S]*\}/.test(fameJs),
  'rich_vessel individual rows should omit the diligence_reward cell'
);

assert(
  /const colSpan = isTeam \? 4 : \(currentFameVariant === 'rich_vessel' \? 7 : 8\);/.test(fameJs),
  'empty rich_vessel individual fame rows should use a 7-column colspan'
);
