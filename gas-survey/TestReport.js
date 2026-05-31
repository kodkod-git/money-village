// [경제적 잠재력 테스트 보고서] 독립 Google Apps Script 프로젝트
// 이 파일은 gas/ (머니빌리지 메인 프로젝트)와 별도 GAS 프로젝트로 배포한다.
// 배포 후 웹앱 URL을 js/config.js의 SURVEY_SCRIPT_URL에 입력한다.

const SURVEY_SPREADSHEET_ID = '102DrLmocl8IPzU_qWnAUzlA9o5FX34GppEMXoE5hjw0';
const SURVEY_SHEET_NAME     = 'Smore-JFWXFqyQVv-jrE';

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim();

  if (action === 'listTestReports') return handleListTestReports_();

  return ContentService
    .createTextOutput(JSON.stringify({ success: false, code: 'INVALID_ACTION' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleListTestReports_() {
  let ss;
  try {
    ss = SpreadsheetApp.openById(SURVEY_SPREADSHEET_ID);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, code: 'SPREADSHEET_ACCESS_ERROR', reports: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sh = ss.getSheetByName(SURVEY_SHEET_NAME);
  if (!sh) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, code: 'SHEET_NOT_FOUND', reports: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sh.getDataRange().getValues();
  const tz   = Session.getScriptTimeZone();
  const reports = [];

  for (let i = 1; i < data.length; i++) {
    const row     = data[i];
    const rawDate = row[0];                        // A열: 생성일시
    const name    = String(row[1] || '').trim();   // B열: 이름
    const age     = String(row[2] || '').trim();   // C열: 나이
    const result  = String(row[9] || '').trim();   // J열: 결과

    if (!name && !result) continue;

    let createdAt = '';
    try {
      if (rawDate) {
        createdAt = Utilities.formatDate(new Date(rawDate), tz, 'yyyy-MM-dd');
      }
    } catch (_) {}

    reports.push({ createdAt, name, age, result });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, reports }))
    .setMimeType(ContentService.MimeType.JSON);
}
