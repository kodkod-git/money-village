const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexHtml = read('index.html');
const reportJs = read('js/report.js');

assert(
  indexHtml.includes('id="rptDonutSeparators"'),
  'donut SVG should include a separator overlay group above the colored arcs'
);
assert(
  /function\s+renderDonutSeparators/.test(reportJs),
  'report.js should render white separator strokes between donut segments'
);
assert(
  reportJs.includes("document.getElementById('rptDonutSeparators')"),
  'renderDonutSeparators should target the separator overlay group'
);
assert(
  /renderDonutSeparators\(\s*\[\s*cashPercent/.test(reportJs),
  'refreshDisplayOnly should redraw separators from the current segment percentages'
);
assert(
  /stroke['"]?,\s*['"]#fff/.test(reportJs) || /stroke="#fff"/.test(reportJs),
  'separator strokes should be white'
);
