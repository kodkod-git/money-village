# dashboard.html 파일 분리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `dashboard.html` (~3,084줄)의 CSS와 JavaScript를 별도 파일로 분리하여 가독성을 높인다.

**Architecture:** `<style>` 블록 → `style.css`, `<script>` 블록 → `js/app.js` + 화면별 JS 파일 6개. 빌드 도구 없이 `<link>`/`<script src>` 태그로 참조. 전역 변수 공유 방식을 유지하므로 로드 순서가 의존성 순서가 된다.

**Tech Stack:** 순수 HTML/CSS/JavaScript, 빌드 도구 없음, html2pdf.js (CDN), Web Serial API

---

## 파일 맵

| 파일 | 역할 | 원본 위치 |
|---|---|---|
| `style.css` | 전체 CSS | `dashboard.html` 8~615줄 `<style>` 내용 |
| `js/app.js` | 전역 상태·상수·공유 헬퍼 | `<script>` 내 공통 코드 |
| `js/setup.js` | setupScreen 로직 + 시민권자 등록 | `<script>` 내 setup 관련 함수 |
| `js/counting.js` | countingScreen 로직 | `<script>` 내 counting 관련 함수 |
| `js/report.js` | reportScreen + PDF 업로드 | `<script>` 내 report/PDF 관련 함수 |
| `js/fame.js` | fameScreen + 명예의 전당 | `<script>` 내 fame 관련 함수 |
| `js/arduino.js` | Web Serial API 연결 | `<script>` 내 Arduino 관련 코드 |
| `dashboard.html` | HTML 마크업 + 로드 태그 | 기존 파일 수정 |

---

## Task 1: style.css 생성

**Files:**
- Create: `style.css`
- Modify: `dashboard.html`

- [ ] **Step 1: style.css 파일 생성**

`dashboard.html` 9~614줄(즉, `<style>` 여는 태그 다음 줄부터 `</style>` 닫는 태그 직전 줄)의 내용을 그대로 복사하여 `style.css`로 저장한다.

- [ ] **Step 2: dashboard.html의 `<style>` 블록을 `<link>` 태그로 교체**

`dashboard.html` 8~615줄을 아래 한 줄로 교체한다:

```html
    <link rel="stylesheet" href="style.css">
```

- [ ] **Step 3: 브라우저 검증**

`dashboard.html`을 Chrome에서 열어 확인:
- 화면 레이아웃·색상·버튼 스타일이 이전과 동일한가
- 개발자 도구 Network 탭에서 `style.css` 200 OK 확인
- Console에 오류 없음

---

## Task 2: js/app.js 생성

**Files:**
- Create: `js/app.js`

`js/app.js`에는 다른 모든 파일이 의존하는 전역 상태·상수·헬퍼를 담는다. **이 파일이 가장 먼저 로드**되어야 한다.

- [ ] **Step 1: js/ 디렉터리 생성 후 js/app.js 작성**

`dashboard.html` `<script>` 블록에서 아래 내용을 추출하여 `js/app.js`에 작성한다.

추출할 코드 범위 (원본 줄 번호 기준):
- 1079~1119줄: 전역 변수 선언 (`currentMode`, `players`, `viewingPlayerIndex`, `activeCountingIndex`, `customLogoData`, `loadedDate`, `fameIndivData`, `fameTeamData`, `isSampleMode`, `nameInputsVisible`, `citizenListData`, `isSavingDrive`)
- 1094줄: `SCRIPT_URL` 상수
- 1096~1103줄: `stockInfo` 객체
- 1104~1111줄: `TRAITS` 배열
- 1112~1118줄: `EFTI_OPTIONS` 배열
- 1120~1123줄: `initTraitsState()` 함수
- 1125~1129줄: `window.onload` (initStockConfig, initCitizenForm, applyNameLengthBindings 호출)
- 1131~1138줄: `switchScreen(id)` 함수
- 1494~1495줄: `initAssets()` 함수
- 1601~1619줄: `applyInputsToPlayer(p, prefix)` 함수
- 1669~1689줄: `recalculateAllRankings()` 함수
- 2295~2299줄: `formatFolderDate(d)` 함수
- 2307~2313줄: `waitForRenderFrame()` 함수
- 2406줄: `const NAME_MAX_LEN = 5;`
- 2408~2453줄: `sanitizeLimitedText()`, `sanitizeNickname()`, `bindMaxLenInput()`, `applyNameLengthBindings()` 함수
- 2455~2460줄: `confirmResetSession()` 함수
- 2965~2966줄: `calcCashFromBills(a)`, `calcStock(a)` 함수
- 2989~2995줄: `getFormattedDate()` 함수
- 2926~2963줄: `runSample(mode)`, `randP(n, t)` 함수

파일 구조:
```javascript
// [전역 상태]
let currentMode = 'individual';
let players = [];
// ... (원본 변수 선언 그대로)

// [상수]
const SCRIPT_URL = "...";
const stockInfo = { ... };
const TRAITS = [ ... ];
const EFTI_OPTIONS = [ ... ];
const NAME_MAX_LEN = 5;

// [초기화]
function initTraitsState(){ ... }
function initAssets(){ ... }

window.onload = function() { ... };

// [화면 전환]
function switchScreen(id){ ... }

// [공유 헬퍼]
function applyInputsToPlayer(p, prefix){ ... }
function recalculateAllRankings(){ ... }
function calcCashFromBills(a){ ... }
function calcStock(a){ ... }
function formatFolderDate(d){ ... }
function getFormattedDate(){ ... }
function waitForRenderFrame(){ ... }
function sanitizeLimitedText(value, maxLen){ ... }
function sanitizeNickname(value, maxLen){ ... }
function bindMaxLenInput(input, sanitizer){ ... }
function applyNameLengthBindings(root){ ... }
function confirmResetSession(){ ... }

// [샘플]
function runSample(mode){ ... }
function randP(n, t){ ... }
```

- [ ] **Step 2: 아직 dashboard.html은 수정하지 않음**

현 단계에서는 `dashboard.html`의 `<script>` 블록을 그대로 유지한다. JS 파일들을 모두 준비한 후 Task 8에서 한 번에 교체한다.

---

## Task 3: js/setup.js 생성

**Files:**
- Create: `js/setup.js`

- [ ] **Step 1: js/setup.js 작성**

`dashboard.html` `<script>` 블록에서 아래 함수들을 추출하여 `js/setup.js`에 작성한다.

추출할 함수 (원본 줄 번호 기준):
- 1140~1146줄: `initStockConfig()`
- 1147~1159줄: `resetNameInputsUI()`
- 1161~1182줄: `selectMode(m)`
- 1183~1215줄: `generateInputs()`
- 1217~1256줄: `syncTeamUiToConfig()`
- 1258~1279줄: `toggleNameInputs()`
- 1280~1285줄: `afterGenerateInputsUI()`
- 1286~1293줄: `buildCitizenOptions()`
- 1294~1315줄: `makeInp(lbl, realName, nickname, team)`
- 1316~1339줄: `applyCitizenToRow(btn)`
- 1340~1404줄: `startGame()`
- 1405~1435줄: `addTeam(teamName, focus)`
- 1436~1441줄: `removeTeam(teamSection)`
- 1442~1456줄: `addMember(teamSection, focus)`
- 1457~1468줄: `removeMember(teamSection)`
- 1469~1476줄: `renumberMembers(teamSection)`
- 1477~1484줄: `syncTeamCountInput()`
- 1485~1493줄: `normalizeTeamNames()`
- 2316~2333줄: `initCitizenForm()`
- 2334~2346줄: `toggleCitizenPanel()`
- 2347~2351줄: `setCitizenFormErrorInline(msg)`
- 2352~2365줄: `setCitizenSubmitLoadingInline(isLoading)`
- 2366~2372줄: `resetCitizenFormInline()`
- 2373~2377줄: `openCitizenModal()`
- 2378~2381줄: `closeCitizenModal()`
- 2382~2387줄: `handleCitizenBackdrop(e)`
- 2388~2400줄: `resetCitizenForm(clearError)`
- 2401~2407줄: `setCitizenFormError(msg)`
- 2462~2476줄: `setCitizenSubmitLoading(isLoading)`
- 2477~2554줄: `submitCitizenRegistration()`
- 2555~2626줄: `submitCitizenRegistrationInline()`
- 2742~2772줄: `fetchCitizenList()`
- 2773~2790줄: `renderCitizenTable(rows)`
- 2791~2799줄: `refreshCitizenSelectOptions()`
- 2800~2815줄: `filterCitizenTable()`
- 2918~2925줄: `loadLogo(event)`
- 3039~3062줄: `clampTeamConfigInput(el, min, max)`
- 3066~3081줄: `DOMContentLoaded` 이벤트 바인딩 (팀 개수, 팀원 수, 개인전 인원 변경 리스너)

---

## Task 4: js/counting.js 생성

**Files:**
- Create: `js/counting.js`

- [ ] **Step 1: js/counting.js 작성**

추출할 함수 (원본 줄 번호 기준):
- 1496~1510줄: `renderSidebar()`
- 1511~1532줄: `selectCountingPlayer(i)`
- 1533~1555줄: `updateDash()`
- 1593~1600줄: `updateManualOnCounting()`
- 1620~1637줄: `saveAndNextCountingPlayer()`
- 1638~1660줄: `initStockGrid(id, sm, isCountingScreen)` ← report.js에서도 호출되므로 전역 함수로 유지
- 2967~2988줄: `renderTraitGridCounting()`
- 2997~3003줄: `toggleTrait(key)`

---

## Task 5: js/report.js 생성

**Files:**
- Create: `js/report.js`

- [ ] **Step 1: js/report.js 작성**

추출할 함수 (원본 줄 번호 기준):
- 1556~1592줄: `renderPlayStyleReport(p)`
- 1661~1668줄: `finishGame()`
- 1691~1736줄: `showReport(idx)`
- 1737~1747줄: `updatePlayerNickname()`
- 1748~1758줄: `updatePlayerRealName()`
- 1759~1768줄: `updatePlayerEfti()`
- 1769~1785줄: `updateTeamName()`
- 1786~1795줄: `manualUpdate()`
- 1796~1806줄: `updateRankUI(p)`
- 1807~1856줄: `updateTop3List()`
- 1857~1865줄: `makeTop3Html(i, name, total)`
- 1866~1877줄: `setDonutSegment(el, percent, offsetPercent)`
- 1878~1881줄: `clearDonutSegment(el)`
- 1882~1922줄: `refreshDisplayOnly(p)`
- 1923줄: `prevPlayer()`
- 1924줄: `nextPlayer()`
- 1927~1984줄: `downloadPDF(type)`
- 1985~2042줄: `getPdfBase64FromElement(areaId, filename)`
- 2044~2125줄: `uploadPdfToDrive()`
- 2126~2182줄: `uploadFamePdfToDrive()`
- 2183줄: `printReport()`
- 2184줄: `printFame()`
- 2188~2294줄: `saveToDrive()`
- 2301~2306줄: `buildReportPdfFileName(p, index)`
- 2640~2698줄: `promptAndLoadPastAssets()`

---

## Task 6: js/fame.js 생성

**Files:**
- Create: `js/fame.js`

- [ ] **Step 1: js/fame.js 작성**

추출할 함수 (원본 줄 번호 기준):
- 2627~2639줄: `showFameScreen()`
- 2699~2741줄: `fetchFameData()`
- 2816~2842줄: `loadFameSamples(alertMsg)`
- 2843~2851줄: `renderFame()`
- 2852~2900줄: `renderRankingTable(data, tableId, isTeam)`
- 2902~2916줄: `setSpecialAwards(data)`

---

## Task 7: js/arduino.js 생성

**Files:**
- Create: `js/arduino.js`

- [ ] **Step 1: js/arduino.js 작성**

추출할 코드 (원본 줄 번호 기준):
- 3004줄: `let port, reader;` 변수 선언
- 3005~3015줄: `connectArduino()` 함수
- 3016줄: `document.getElementById('connectBtn').addEventListener('click', connectArduino);`
- 3018~3038줄: `readLoop()` 함수

**주의:** 원본에서 `connectBtn` 이벤트 바인딩(3016줄)은 스크립트 최상위 레벨에 있다. 별도 파일로 분리하면 HTML이 파싱되기 전에 실행될 수 있으므로 `DOMContentLoaded` 내부로 이동한다:

```javascript
let port, reader;

async function connectArduino() {
    // 원본 3005~3014줄 내용 그대로
}

async function readLoop() {
    // 원본 3018~3037줄 내용 그대로
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectBtn').addEventListener('click', connectArduino);
});
```

---

## Task 8: dashboard.html 정리

**Files:**
- Modify: `dashboard.html`

이 태스크에서 `dashboard.html`의 인라인 `<script>` 블록 전체를 제거하고 외부 파일 참조로 교체한다.

- [ ] **Step 1: `<script>` 블록(1078~3082줄) 전체를 외부 스크립트 태그 6개로 교체**

1078줄의 `<script>` 여는 태그부터 3082줄의 `</script>` 닫는 태그까지 전부 삭제하고, 아래 내용으로 교체한다:

```html
<script src="js/app.js"></script>
<script src="js/setup.js"></script>
<script src="js/counting.js"></script>
<script src="js/report.js"></script>
<script src="js/fame.js"></script>
<script src="js/arduino.js"></script>
```

- [ ] **Step 2: 최종 `dashboard.html` `<head>` 확인**

`<head>` 섹션이 아래 구조인지 확인한다:

```html
<head>
    <meta charset="UTF-8">
    <title>머니빌리지 통합 관리 시스템</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
    <link rel="stylesheet" href="style.css">
</head>
```

`</body>` 직전은 아래 구조:

```html
    <script src="js/app.js"></script>
    <script src="js/setup.js"></script>
    <script src="js/counting.js"></script>
    <script src="js/report.js"></script>
    <script src="js/fame.js"></script>
    <script src="js/arduino.js"></script>
</body>
```

---

## Task 9: 브라우저 최종 검증

**Files:** 없음 (읽기 전용 검증)

- [ ] **Step 1: Chrome에서 dashboard.html 열기**

`dashboard.html`을 Chrome으로 직접 열기 (파일 프로토콜 `file://`). 개발자 도구(F12) → Console 탭 열기.

- [ ] **Step 2: 네트워크 탭 확인**

개발자 도구 Network 탭에서 모든 파일이 로드되는지 확인:
- `style.css` — 200 OK
- `js/app.js` — 200 OK
- `js/setup.js` — 200 OK
- `js/counting.js` — 200 OK
- `js/report.js` — 200 OK
- `js/fame.js` — 200 OK
- `js/arduino.js` — 200 OK

**주의:** `file://` 프로토콜에서는 Network 탭에 상태 코드가 표시되지 않을 수 있다. 대신 파일 이름이 목록에 뜨는지 확인한다.

- [ ] **Step 3: Console에서 ReferenceError 없음 확인**

Console에 `ReferenceError: xxx is not defined` 또는 `is not a function` 오류가 없어야 한다. 오류 발생 시 해당 함수가 어느 파일에도 포함되지 않은 것이므로 Task 2~7을 재검토한다.

- [ ] **Step 4: 기능 동작 확인**

아래 기능을 순서대로 확인한다:

1. **setupScreen:** 개인전 모드 선택 → 인원 수 조정 → 명단 입력하기 클릭 → 참가자 이름 입력 → 게임 시작
2. **countingScreen:** 참가자 선택 → 현금 입력 → 주식 수량 입력 → 다음으로 저장
3. **reportScreen:** 순위 표시 확인 → 다른 참가자로 이동(이전/다음) → PDF 다운로드(로컬 저장)
4. **fameScreen:** 샘플 데이터 로드 버튼 클릭 → Top 10 개인전·Top 5 팀전 렌더링 확인

- [ ] **Step 5: 팀전 모드 확인**

setupScreen에서 팀전 모드 선택 → 팀 추가·삭제 → 게임 시작 → countingScreen에서 팀원별 계수 확인

---

## 최종 파일 구조 (완료 후)

```
money-village/
├── dashboard.html      (~200줄, HTML 마크업만)
├── style.css           (~607줄, CSS 전체)
├── js/
│   ├── app.js          (전역 상태·상수·공유 헬퍼)
│   ├── setup.js        (setupScreen + 시민권자 등록)
│   ├── counting.js     (countingScreen)
│   ├── report.js       (reportScreen + PDF)
│   ├── fame.js         (fameScreen)
│   └── arduino.js      (Web Serial API)
└── docs/
    └── superpowers/
        ├── specs/2026-04-10-file-split-design.md
        └── plans/2026-04-10-file-split.md
```
