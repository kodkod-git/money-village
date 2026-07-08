const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const indexHtml = read('index.html');
const eftiJs = read('js/efti-report.js');
const css = read('style.css');

// --- setupScreen 진입 버튼 ---
assert(
  indexHtml.includes('머니빌리지 경제적 유형 보고서'),
  'setupScreen button label should be updated to 머니빌리지 경제적 유형 보고서'
);
assert(
  indexHtml.includes('onclick="showReportHubScreen()"'),
  'setupScreen button should call showReportHubScreen()'
);

// --- reportHubScreen ---
assert(indexHtml.includes('id="reportHubScreen"'), 'reportHubScreen should exist');
assert(
  /id="reportHubScreen"[\s\S]*?onclick="showEftiReportScreen\(\)"/.test(indexHtml),
  'reportHubScreen should have a button that opens eftiReportScreen'
);
assert(
  /id="reportHubScreen"[\s\S]*?onclick="showTestReportScreen\(\)"/.test(indexHtml),
  'reportHubScreen should have a button that opens the existing testReportScreen'
);
assert(
  /id="reportHubScreen"[\s\S]*?onclick="switchScreen\('setupScreen'\)"/.test(indexHtml),
  'reportHubScreen back button should return to setupScreen'
);

// --- eftiReportScreen ---
assert(indexHtml.includes('id="eftiReportScreen"'), 'eftiReportScreen should exist');
['eftiName', 'eftiAge', 'eftiType', 'eftiDate'].forEach((id) => {
  assert(indexHtml.includes(`id="${id}"`), `eftiReportScreen should have #${id} input`);
});
assert(
  /id="eftiReportScreen"[\s\S]*?onclick="printEftiReport\(\)"/.test(indexHtml),
  'eftiReportScreen should have a print button calling printEftiReport()'
);
assert(
  /id="eftiReportScreen"[\s\S]*?onclick="switchScreen\('reportHubScreen'\)"/.test(indexHtml),
  'eftiReportScreen back button should return to reportHubScreen'
);

// --- testReportScreen 뒤로가기 변경 (setupScreen이 아닌 reportHubScreen으로) ---
assert(
  /id="testReportScreen"[\s\S]*?onclick="switchScreen\('reportHubScreen'\)"/.test(indexHtml),
  'testReportScreen back button should now return to reportHubScreen instead of setupScreen'
);

// --- script include ---
assert(
  indexHtml.includes('<script src="js/efti-report.js"></script>'),
  'js/efti-report.js should be included as a script'
);

// --- CSS ---
assert(css.includes('.efti-form-input'), 'style.css should define .efti-form-input for the EFTI form');

// --- js/efti-report.js 로직 ---
assert(/function\s+showReportHubScreen\s*\(/.test(eftiJs), 'showReportHubScreen should be defined');
assert(/function\s+showEftiReportScreen\s*\(/.test(eftiJs), 'showEftiReportScreen should be defined');
assert(/function\s+resetEftiReportForm\s*\(/.test(eftiJs), 'resetEftiReportForm should be defined');
assert(/function\s+printEftiReport\s*\(/.test(eftiJs), 'printEftiReport should be defined');
assert(
  /image\/efti\/\$\{efti\}\.png/.test(eftiJs),
  'printEftiReport should build the background image path from image/efti/{EFTI}.png'
);
assert(
  eftiJs.includes('class="tr-overlay efti-report-name"') &&
    eftiJs.includes('class="tr-overlay efti-report-age"') &&
    eftiJs.includes('class="tr-overlay efti-report-date"'),
  'printEftiReport should use EFTI-only overlay position classes so test report positions are unchanged'
);
assert(
  !eftiJs.includes('class="tr-overlay tr-name"') &&
    !eftiJs.includes('class="tr-overlay tr-age"') &&
    !eftiJs.includes('class="tr-overlay tr-date"'),
  'printEftiReport should not reuse the test report overlay position classes'
);
assert(
  /\.efti-report-name\s*\{\s*top:\s*8\.8%;\s*left:\s*17\.5%;\s*\}/.test(css) &&
    /\.efti-report-age\s*\{\s*top:\s*8\.8%;\s*left:\s*47\.5%;\s*\}/.test(css) &&
    /\.efti-report-date\s*\{\s*top:\s*8\.8%;\s*left:\s*78\.5%;\s*\}/.test(css),
  'style.css should move only the EFTI report name/age/date overlays upward'
);
assert(/window\.print\(\)/.test(eftiJs), 'printEftiReport should call window.print()');

const printFnBody = eftiJs.split(/function\s+printEftiReport\s*\(/)[1] || '';
assert(
  /resetEftiReportForm\(\)/.test(printFnBody),
  'printEftiReport should reset the form after printing so the next entry starts blank'
);
assert(
  /alert\(/.test(printFnBody),
  'printEftiReport should validate required fields with an alert before printing'
);
assert(
  /new Image\(\)/.test(printFnBody) &&
    printFnBody.indexOf('new Image()') < printFnBody.indexOf('window.print()'),
  'printEftiReport should preload the background image before calling window.print(), ' +
    'otherwise large EFTI images can render blank in the print preview (race condition)'
);

console.log('efti-report-screen.test.js OK');
