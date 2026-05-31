# 경제적 잠재력 테스트 보고서 출력 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 스프레드시트의 설문 결과를 불러와 그룹별 보고서를 인쇄할 수 있는 testReportScreen을 추가한다.

**Architecture:** setupScreen에서 진입하는 독립 스크린(testReportScreen)을 추가한다. GAS에 별도 파일(`TestReport.js`)로 `listTestReports` 액션을 구현해 외부 스프레드시트에서 데이터를 가져온다. 프론트엔드는 `js/test-report.js`에서 카드 그리드 렌더링과 CSS 절대 위치 오버레이 인쇄를 처리한다.

**Tech Stack:** Vanilla JS, Google Apps Script, CSS absolute positioning, window.print()

**Spec:** `docs/superpowers/specs/2026-06-01-test-report-screen-design.md`

---

## 파일 구조

| 파일 | 작업 |
|---|---|
| `gas/TestReport.js` | 신규 — SURVEY_SPREADSHEET_ID 상수 + handleListTestReports_() |
| `gas/Code.js` | 수정 — doGet에 listTestReports 라우팅 1줄 추가 |
| `style.css` | 수정 — testReportScreen CSS + @media print 추가 |
| `index.html` | 수정 — setupScreen 버튼, testReportScreen HTML, script 태그 추가 |
| `js/test-report.js` | 신규 — showTestReportScreen, fetchTestReports, renderTestReportCards, printTestReport |
| `image/reports/` | 신규 폴더 — .gitkeep (이미지 4장은 사용자 직접 추가) |

---

## Task 1: 브랜치 생성 + 이미지 폴더 준비

**Files:**
- Create: `image/reports/.gitkeep`

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feat/test-report-screen
```

- [ ] **Step 2: image/reports 폴더 생성**

```bash
mkdir -p image/reports
touch image/reports/.gitkeep
```

Windows PowerShell이면:
```powershell
New-Item -ItemType Directory -Force image\reports
New-Item -ItemType File image\reports\.gitkeep
```

- [ ] **Step 3: 이미지 파일 배치 확인**

`image/reports/` 폴더에 아래 4개 파일을 직접 복사한다 (사용자 제공):
- `red.png`
- `green.png`
- `orange.png`
- `blue.png`

이 파일이 없으면 썸네일과 인쇄가 동작하지 않는다. 이후 Task에서 계속 테스트할 수 있으므로 먼저 배치해둔다.

- [ ] **Step 4: 커밋**

```bash
git add image/reports/.gitkeep
git commit -m "chore: add image/reports folder for test report templates"
```

---

## Task 2: GAS TestReport.js 작성

**Files:**
- Create: `gas/TestReport.js`

- [ ] **Step 1: gas/TestReport.js 파일 생성**

```javascript
// [테스트 보고서] 경제적 잠재력 테스트 결과 조회
const SURVEY_SPREADSHEET_ID = '102DrLmocl8IPzU_qWnAUzlA9o5FX34GppEMXoE5hjw0';
const SURVEY_SHEET_NAME     = 'Smore-JFWXFqyQVv-jrE';

function handleListTestReports_() {
  const ss = SpreadsheetApp.openById(SURVEY_SPREADSHEET_ID);
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
    const row    = data[i];
    const rawDate = row[0];  // A열: 생성일시
    const name   = String(row[1] || '').trim();   // B열: 이름
    const age    = String(row[2] || '').trim();    // C열: 나이
    const result = String(row[9] || '').trim();    // J열: 결과

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
```

- [ ] **Step 2: 커밋**

```bash
git add gas/TestReport.js
git commit -m "feat(gas): add TestReport.js with listTestReports action"
```

---

## Task 3: GAS Code.js 라우팅 추가 + 배포

**Files:**
- Modify: `gas/Code.js` (doGet 함수 내부)

- [ ] **Step 1: doGet에 라우팅 1줄 추가**

`gas/Code.js`의 `doGet` 함수에서 기존 마지막 action 라우팅 바로 아래에 추가한다.

현재 `doGet` 내부 마지막 if문:
```javascript
  if (action === 'loadUserBalance') {
```

그 위에 (또는 아래에) 다음 한 줄 추가:
```javascript
  if (action === 'listTestReports')  return handleListTestReports_();
```

위치 예시 (`gas/Code.js` 195번째 줄 근처):
```javascript
  if (action === 'listCitizens')     { ... }
  if (action === 'loadAssetsByDate') { ... }
  if (action === 'listTestReports')  return handleListTestReports_();   // ← 추가
  if (action === 'loadUserBalance')  { ... }
```

- [ ] **Step 2: clasp push로 GAS 배포**

```bash
cd gas && clasp push --force
```

Expected output:
```
└─ gas/Code.js
└─ gas/TestReport.js
└─ gas/appsscript.json
Pushed 3 files.
```

- [ ] **Step 3: 배포 후 엔드포인트 수동 검증**

브라우저 주소창에 아래 URL을 입력해 JSON이 반환되는지 확인한다 (SCRIPT_URL은 `js/config.js`에서 확인):

```
https://script.google.com/macros/s/AKfycbxvp0z-iR5DHH8xpHarAo74VmPwJR9MisQ0pJRhkjNZg8AAupmaHkuiaALzxJHcATLK/exec?action=listTestReports
```

Expected: `{"success":true,"reports":[...]}`  
오류 시: GAS 에디터 → 실행 로그 확인

- [ ] **Step 4: 커밋**

```bash
cd ..
git add gas/Code.js
git commit -m "feat(gas): route listTestReports action to TestReport.js"
```

---

## Task 4: style.css에 testReportScreen CSS 추가

**Files:**
- Modify: `style.css`

- [ ] **Step 1: style.css 맨 끝에 CSS 추가**

`style.css` 파일 끝에 아래 블록을 추가한다:

```css
/* [화면 테스트보고서] 경제적 잠재력 테스트 보고서 */
.tr-cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 16px;
}
.tr-card {
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    border: 1px solid #eee;
}
.tr-thumbnail {
    height: 120px;
    overflow: hidden;
}
.tr-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
}
.tr-card-body {
    padding: 10px 12px;
}
.tr-card-title {
    font-size: 11px;
    font-weight: 600;
    color: #444;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.tr-print-btn {
    width: 100%;
    padding: 8px;
    font-size: 12px;
    justify-content: center;
    background: #1565c0;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}
.tr-status-msg {
    padding: 40px;
    text-align: center;
    color: #888;
    grid-column: 1 / -1;
}

/* 인쇄 오버레이 */
.tr-overlay {
    position: absolute;
    color: #333;
    font-weight: 600;
    font-size: 1.5vw;
    line-height: 1;
}
.tr-name { top: 12.5%; left: 19%; }
.tr-age  { top: 12.5%; left: 52%; }
.tr-date { top: 12.5%; left: 78%; }

#testReportPrintArea { display: none; }

@media print {
    body > *:not(#testReportPrintArea) { display: none !important; }
    #testReportPrintArea {
        display: block !important;
        position: fixed;
        top: 0; left: 0;
        width: 100%;
    }
    @page { size: A4 portrait; margin: 0; }
}
```

> ⚠️ `.tr-name`, `.tr-age`, `.tr-date`의 top/left % 값은 실제 이미지로 브라우저 테스트 후 Task 8에서 조정한다.

- [ ] **Step 2: 커밋**

```bash
git add style.css
git commit -m "feat: add testReportScreen CSS and print overlay styles"
```

---

## Task 5: index.html — testReportScreen HTML + script 태그 추가

**Files:**
- Modify: `index.html`

- [ ] **Step 1: testReportScreen HTML 추가**

`index.html` 1004번째 줄 (`</div>` — `.container` 닫는 태그) 바로 앞에 추가:

```html
    <!-- 경제적 잠재력 테스트 보고서 화면 -->
    <div id="testReportScreen" class="screen">
        <div class="bank-screen-wrap">
            <div class="bank-screen-header">
                <button class="bank-back-btn" onclick="switchScreen('setupScreen')">←</button>
                <div class="bank-screen-title">📋 경제적 잠재력 테스트 보고서</div>
                <button class="btn btn-primary" style="margin-left:auto; padding:8px 14px; font-size:13px;" onclick="fetchTestReports()">🔄 새로고침</button>
            </div>
            <div id="testReportCards" class="tr-cards-grid"></div>
        </div>
    </div>
```

- [ ] **Step 2: testReportPrintArea div 추가**

`.container` 닫는 `</div>` 바로 아래(`</div>` 다음 줄)에 추가:

```html
<div id="testReportPrintArea"></div>
```

- [ ] **Step 3: script 태그 추가**

`index.html` 1021번째 줄 (`<script src="js/admin.js"></script>`) 바로 아래에 추가:

```html
<script src="js/test-report.js"></script>
```

- [ ] **Step 4: setupScreen 버튼 추가**

`index.html` setupScreen 내 기존 마지막 버튼 (`👥 머니빌리지 시민권자 관리`) 바로 아래에 추가:

```html
            <button class="btn btn-primary" style="width:100%; padding:15px; margin-bottom:20px; font-size:16px; justify-content:center; font-weight:900;" onclick="showTestReportScreen()">
                📋 경제적 잠재력 테스트 보고서 출력하기
            </button>
```

- [ ] **Step 5: 브라우저에서 빠른 확인**

`index.html`을 Chrome에서 열고:
- setupScreen에 "📋 경제적 잠재력 테스트 보고서 출력하기" 버튼이 보이는지 확인
- 버튼 클릭 시 콘솔 에러가 없는지 확인 (아직 JS 없어서 에러 예상됨 — 정상)

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "feat: add testReportScreen HTML and entry button"
```

---

## Task 6: js/test-report.js — fetch + 카드 렌더링

**Files:**
- Create: `js/test-report.js`

- [ ] **Step 1: js/test-report.js 파일 생성**

```javascript
// [테스트 보고서] 경제적 잠재력 테스트 보고서 출력

const REPORT_IMAGES = {
    'Red Group':    'red',
    'Green Group':  'green',
    'Orange Group': 'orange',
    'Blue Group':   'blue',
};

let _testReports = [];

function showTestReportScreen() {
    switchScreen('testReportScreen');
    fetchTestReports();
}

async function fetchTestReports() {
    const container = document.getElementById('testReportCards');
    container.innerHTML = '<div class="tr-status-msg">불러오는 중...</div>';

    try {
        const res  = await fetch(`${SCRIPT_URL}?action=listTestReports`);
        const data = await res.json();
        if (!data.success) throw new Error(data.code || 'FETCH_ERROR');
        _testReports = data.reports || [];
        renderTestReportCards();
    } catch (err) {
        container.innerHTML = `<div class="tr-status-msg">❌ 불러오기 실패: ${err.message}</div>`;
    }
}

function renderTestReportCards() {
    const container = document.getElementById('testReportCards');

    if (!_testReports.length) {
        container.innerHTML = '<div class="tr-status-msg">결과가 없습니다.</div>';
        return;
    }

    container.innerHTML = _testReports.map((r, i) => {
        const color   = REPORT_IMAGES[r.result];
        const dateStr = (r.createdAt || '').replace(/-/g, '');
        const title   = `${dateStr}_${r.name}_테스트결과보고서`;
        const imgSrc  = color ? `image/reports/${color}.png` : '';

        return `
            <div class="tr-card">
                <div class="tr-thumbnail">
                    ${imgSrc
                        ? `<img src="${imgSrc}" alt="${r.result}" onerror="this.parentElement.style.background='#f0f0f0'">`
                        : `<div style="height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px;">이미지 없음</div>`
                    }
                </div>
                <div class="tr-card-body">
                    <div class="tr-card-title" title="${title}">${title}</div>
                    <button class="tr-print-btn" onclick="printTestReport(${i})">🖨️ 출력하기</button>
                </div>
            </div>
        `;
    }).join('');
}
```

- [ ] **Step 2: 브라우저 테스트**

`index.html`을 Chrome에서 열고:
1. "📋 경제적 잠재력 테스트 보고서 출력하기" 버튼 클릭
2. "불러오는 중..." 메시지 확인
3. 카드 그리드가 정상 렌더링되는지 확인
4. 각 카드에 썸네일 이미지(image/reports/*.png)가 보이는지 확인
5. 콘솔에 에러 없는지 확인

- [ ] **Step 3: 커밋**

```bash
git add js/test-report.js
git commit -m "feat: add test-report.js with fetch and card rendering"
```

---

## Task 7: js/test-report.js — 출력 로직 추가

**Files:**
- Modify: `js/test-report.js`

- [ ] **Step 1: printTestReport 함수 추가**

`js/test-report.js` 파일 끝에 추가:

```javascript
function printTestReport(idx) {
    const r = _testReports[idx];
    if (!r) return;

    const color = REPORT_IMAGES[r.result];
    if (!color) {
        alert(`알 수 없는 그룹입니다: "${r.result}"\n출력을 중단합니다.`);
        return;
    }

    const ageText     = /^\d+$/.test(String(r.age).trim()) ? `${r.age}세` : r.age;
    const displayDate = r.createdAt || '';
    const imagePath   = `image/reports/${color}.png`;

    const area = document.getElementById('testReportPrintArea');
    area.innerHTML = `
        <div style="position:relative; display:inline-block; width:100%;">
            <img src="${imagePath}" style="width:100%; display:block;">
            <span class="tr-overlay tr-name">${r.name}</span>
            <span class="tr-overlay tr-age">${ageText}</span>
            <span class="tr-overlay tr-date">${displayDate}</span>
        </div>
    `;

    window.print();
    area.innerHTML = '';
}
```

- [ ] **Step 2: 브라우저 테스트**

1. 카드에서 "🖨️ 출력하기" 클릭
2. 브라우저 인쇄 대화상자가 열리는지 확인
3. 인쇄 미리보기에서 보고서 이미지 위에 이름/나이/날짜가 오버레이돼 있는지 확인
4. 인쇄 취소 후 카드 화면이 정상으로 돌아오는지 확인

- [ ] **Step 3: 커밋**

```bash
git add js/test-report.js
git commit -m "feat: add printTestReport with CSS overlay and window.print()"
```

---

## Task 8: 오버레이 좌표 조정

**Files:**
- Modify: `style.css`

- [ ] **Step 1: 인쇄 미리보기로 좌표 확인**

Chrome에서 카드 클릭 → 인쇄 미리보기 열기.  
이름/나이/날짜 텍스트가 이미지의 빈 칸과 정렬되는지 확인한다.

- [ ] **Step 2: 좌표 조정 (필요 시)**

`style.css`의 `.tr-name`, `.tr-age`, `.tr-date` top/left 값을 조정한다.

조정 기준 (이미지 크기 대비 %):
```css
.tr-name { top: ??%; left: ??%; }  /* 아이 이름: 레이블 오른쪽 */
.tr-age  { top: ??%; left: ??%; }  /* 나이: 레이블 오른쪽 */
.tr-date { top: ??%; left: ??%; }  /* 날짜: 레이블 오른쪽 */
```

font-size도 조정이 필요하면:
```css
.tr-overlay { font-size: 1.8vw; }  /* 숫자를 올려가며 테스트 */
```

- [ ] **Step 3: 4개 그룹 모두 확인**

Red / Green / Orange / Blue 각 그룹 카드를 출력 미리보기로 확인한다.  
모든 그룹에서 오버레이 위치가 동일하게 정렬되는지 확인한다 (이미지 구조가 동일하므로 동일해야 함).

- [ ] **Step 4: 커밋**

```bash
git add style.css
git commit -m "fix: calibrate test report overlay coordinates"
```

---

## Task 9: 최종 점검 + push

- [ ] **Step 1: 전체 기능 점검**

체크리스트:
- [ ] setupScreen에서 버튼 클릭 → testReportScreen 진입
- [ ] 스프레드시트에서 카드 목록 정상 로드
- [ ] 썸네일 이미지 표시 (4개 그룹)
- [ ] 카드 제목: `YYYYMMDD_이름_테스트결과보고서` 형식
- [ ] 출력하기 클릭 → 인쇄 대화상자 열림
- [ ] 인쇄 미리보기: 이름/나이/날짜 오버레이 위치 정확
- [ ] 인쇄 취소 후 카드 화면 정상 복귀
- [ ] ← 처음으로 버튼 → setupScreen 복귀
- [ ] 새로고침 버튼 → 데이터 재요청
- [ ] 알 수 없는 result값 → 알림 후 중단 (콘솔에서 직접 `printTestReport` 호출로 테스트)

- [ ] **Step 2: git push**

```bash
git push origin feat/test-report-screen
```

- [ ] **Step 3: clasp push 최종 확인**

```bash
cd gas && clasp push --force
```
