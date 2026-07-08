const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const testReportJs = fs.readFileSync(path.join(root, 'js/test-report.js'), 'utf8');
const fetchBody = testReportJs.split(/function\s+fetchTestReports\s*\(\)\s*\{/)[1].split(/\n\}/)[0];

assert(
  /function\s+removeJsonpScript\s*\(\)\s*\{[\s\S]*document\.body\.contains\(script\)[\s\S]*document\.body\.removeChild\(script\)[\s\S]*\}/.test(fetchBody),
  'fetchTestReports should remove the JSONP script only when it is still attached to document.body'
);

assert(
  (fetchBody.match(/document\.body\.removeChild\(script\);/g) || []).length === 1,
  'fetchTestReports should remove the JSONP script only inside the guarded cleanup helper'
);

assert(
  (fetchBody.match(/removeJsonpScript\(\);/g) || []).length >= 3,
  'timeout, success callback, and script.onerror should all use the safe JSONP cleanup helper'
);

console.log('test-report-jsonp-cleanup.test.js OK');
