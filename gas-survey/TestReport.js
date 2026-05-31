// [경제적 잠재력 테스트 보고서] 독립 Google Apps Script 프로젝트
// 이 파일은 gas/ (머니빌리지 메인 프로젝트)와 별도 GAS 프로젝트로 배포한다.
// 배포 후 웹앱 URL을 js/config.js의 SURVEY_SCRIPT_URL에 입력한다.

const SURVEY_SPREADSHEET_ID = '102DrLmocl8IPzU_qWnAUzlA9o5FX34GppEMXoE5hjw0';
const SURVEY_SHEET_NAME     = 'Smore-JFWXFqyQVv-jrE';

function doGet(e) {
  const action   = String((e && e.parameter && e.parameter.action)   || '').trim();
  const callback = String((e && e.parameter && e.parameter.callback) || '').replace(/[^a-zA-Z0-9_]/g, '');

  let result;
  if (action === 'listTestReports') {
    result = buildListTestReports_();
  } else {
    result = { success: false, code: 'INVALID_ACTION' };
  }

  const json = JSON.stringify(result);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function buildListTestReports_() {
  let ss;
  try {
    ss = SpreadsheetApp.openById(SURVEY_SPREADSHEET_ID);
  } catch (err) {
    return { success: false, code: 'SPREADSHEET_ACCESS_ERROR', reports: [] };
  }

  const sh = ss.getSheetByName(SURVEY_SHEET_NAME);
  if (!sh) return { success: false, code: 'SHEET_NOT_FOUND', reports: [] };

  const data = sh.getDataRange().getValues();
  const tz   = Session.getScriptTimeZone();
  const reports = [];

  for (let i = 1; i < data.length; i++) {
    const row     = data[i];
    const rawDate = row[0];
    const name    = String(row[1] || '').trim();
    const age     = String(row[2] || '').trim();
    const result  = String(row[9] || '').trim();

    if (!name && !result) continue;

    let createdAt = '';
    try {
      if (rawDate) createdAt = Utilities.formatDate(new Date(rawDate), tz, 'yyyy-MM-dd');
    } catch (_) {}

    reports.push({ createdAt, name, age, result });
  }

  return { success: true, reports };
}
