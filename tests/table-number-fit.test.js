const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const fameJs = read('js/fame.js');
const reportJs = read('js/report.js');
const css = read('style.css');

const numericCellPatterns = [
  [/class="asset-col[^"]*">\$\{Number\(item\.total\)\.toLocaleString\(\)\}/, 'fame individual/team total'],
  [/class="sub-asset-col">\$\{\(Number\(item\.cash\)[\s\S]*?\.toLocaleString\(\)\}/, 'fame cash'],
  [/class="sub-asset-col">\$\{\(Number\(item\.stock\)[\s\S]*?\.toLocaleString\(\)\}/, 'fame stock/estate'],
  [/class="sub-asset-col">\$\{\(Number\(item\.deposit_reward\)[\s\S]*?\.toLocaleString\(\)\}/, 'fame deposit'],
  [/class="sub-asset-col">\$\{\(Number\(item\.quest_reward\)[\s\S]*?\.toLocaleString\(\)\}/, 'fame quest'],
  [/class="sub-asset-col">\$\{\(Number\(item\.diligence_reward\)[\s\S]*?\.toLocaleString\(\)\}/, 'fame diligence'],
  [/class="asset-col[^"]*">\$\{Number\(p\.total\)\.toLocaleString\(\)\}/, 'summary individual total'],
  [/class="sub-asset-col">\$\{cash\.toLocaleString\(\)\}/, 'summary cash'],
  [/class="sub-asset-col">\$\{assetVal\.toLocaleString\(\)\}/, 'summary asset'],
  [/class="sub-asset-col">\$\{deposit\.toLocaleString\(\)\}/, 'summary deposit'],
  [/class="sub-asset-col">\$\{quest\.toLocaleString\(\)\}/, 'summary quest'],
  [/class="sub-asset-col">\$\{diligence\.toLocaleString\(\)\}/, 'summary diligence'],
  [/class="asset-col[^"]*">\$\{t\.total\.toLocaleString\(\)\}/, 'summary team total'],
];

for (const [pattern, label] of numericCellPatterns) {
  assert(
    !pattern.test(fameJs) && !pattern.test(reportJs),
    `${label} should render through fitNumber() so long values can shrink inside the column`
  );
}

assert(css.includes('.fit-number'), 'style.css should define the fit-number wrapper');
const assetTopRule = css.match(/\.asset-col\.top\s*\{[^}]*\}/);
assert(assetTopRule, 'style.css should define .asset-col.top');
assert(
  /font-size:\s*19px/.test(assetTopRule[0]),
  'top asset values should use the same base size as other numeric cells'
);

const appJs = read('js/app.js');
assert(
  appJs.includes('data-number-digits'),
  'fitNumber() should expose digit length so the containing table can be scaled consistently'
);
assert(
  appJs.includes('applyTableNumberScale'),
  'app.js should include a helper that applies compact numeric sizing to the whole table'
);
assert(
  /ranking-table--compact-numbers/.test(css),
  'style.css should define a table-level compact number mode'
);

assert(
  fameJs.includes("applyTableNumberScale('indivTableBody')"),
  'fame individual table should apply table-level number scaling after render'
);
assert(
  !fameJs.includes("applyTableNumberScale('teamTableBody')"),
  'fame team table total asset column should keep the normal number size'
);

assert(
  reportJs.includes("applyTableNumberScale('summaryIndivTableBody')"),
  'summary individual table should apply table-level number scaling after render'
);
assert(
  !reportJs.includes("applyTableNumberScale('summaryTeamTableBody')"),
  'summary team table total asset column should keep the normal number size'
);
assert(
  fameJs.includes('team-asset-col'),
  'fame team total asset cells should use the centered team-asset-col class'
);
assert(
  reportJs.includes('class="asset-col team-asset-col'),
  'summary team total asset cells should use the centered team-asset-col class'
);
assert(
  /\.team-asset-col[\s\S]*\.team-asset-col \.fit-number[\s\S]*\{[^}]*text-align:\s*center/.test(css),
  'team total asset column should be centered'
);
