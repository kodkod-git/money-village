const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexHtml = read('index.html');
const fameJs = read('js/fame.js');
const css = read('style.css');

assert(
  indexHtml.indexOf('awardCashName') < indexHtml.indexOf('awardDiligenceName') &&
    indexHtml.indexOf('awardDiligenceName') < indexHtml.indexOf('awardStockName'),
  'Personal Diligence King should be placed between Cash King and Stock/Estate King'
);
assert(indexHtml.includes('Personal Diligence King'), 'Diligence award title should be rendered');
assert(indexHtml.includes('awardDiligenceName'), 'Diligence award name element should exist');
assert(indexHtml.includes('awardDiligenceVal'), 'Diligence award value element should exist');
assert(indexHtml.includes('👷'), 'Diligence award should use the existing diligence icon');

assert(
  /const\s+diligenceKing\s*=\s*findPositiveAwardWinner\(data,\s*'diligence_reward'\)/.test(fameJs),
  'Diligence King should be selected by the highest positive diligence_reward'
);
assert(
  fameJs.includes("setAwardDisplay('awardDiligenceName', 'awardDiligenceVal', diligenceKing, 'diligence_reward')"),
  'Diligence award should render through shared award display logic'
);
assert(
  /function\s+findPositiveAwardWinner/.test(fameJs),
  'Awards should use shared positive-winner logic so all-zero awards stay blank'
);
assert(
  /const\s+value\s*=\s*Number\(winner\?\.\[field\]\s*\|\|\s*0\)/.test(fameJs) &&
    /value\s*>\s*0\s*\?[\s\S]*:\s*'-'/.test(fameJs),
  'Award display should leave name/value blank when the winning value is 0'
);
assert(css.includes('.hl-diligence'), 'Diligence award should have a title highlight style');
