# 경제적 유형 보고서(EFTI) 출력 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** setupScreen에서 진입하는 보고서 선택 화면(reportHubScreen)을 신설하고, 그 아래에 이름/나이/EFTI/날짜를 직접 입력해 EFTI 유형별 배경 이미지 위에 즉시 출력하는 신규 화면(eftiReportScreen)을 추가한다. 기존 "경제적 잠재력 테스트 보고서"(testReportScreen) 기능은 변경하지 않는다.

**Architecture:** 순수 정적 HTML/CSS/JS (빌드 없음). `index.html`에 새 `<div class="screen">` 두 개를 추가하고, 새 `js/efti-report.js`에서 화면 전환·폼 리셋·출력 로직을 담당한다. 출력은 기존 `js/test-report.js`의 `printTestReport()` 패턴(이미지 위에 `.tr-overlay` span 오버레이 → `window.print()`)을 그대로 재사용한다.

**Tech Stack:** Vanilla JS, HTML, CSS. 테스트는 이 저장소의 기존 관례대로 Node.js `assert` 기반 정적 검사 스크립트(`tests/*.test.js`, `node tests/x.test.js`로 개별 실행 — Jest 등 프레임워크 없음).

---

## 사전 확인 사항 (이미 확인 완료)

- `js/app.js`에 `EFTI_OPTIONS` 배열이 이미 정의되어 있고 (`"-"` + 16종), 클래식 `<script>` 태그로 로드되므로 이후 로드되는 `js/efti-report.js`에서 별도 import 없이 바로 사용 가능하다 (기존 `js/setup.js`가 동일한 방식으로 사용 중).
- 날짜 기본값은 이 저장소 전반에서 `new Date().toISOString().slice(0, 10)` 패턴을 사용한다 (`js/setup.js:471` 등).
- 테스트는 `node tests/<파일명>.test.js`로 개별 실행하며, `assert()` 실패 시 stack trace와 함께 non-zero exit code로 종료한다.

---

## Task 1: `image/efti/` 폴더 스캐폴딩

**Files:**
- Create: `image/efti/.gitkeep`

- [ ] **Step 1: 폴더와 placeholder 파일 생성**

```bash
mkdir -p image/efti
touch image/efti/.gitkeep
```

- [ ] **Step 2: 커밋**

```bash
git add image/efti/.gitkeep
git commit -m "chore: scaffold image/efti folder for EFTI report backgrounds"
```

(실제 16종 이미지 `FAEN.png` ~ `PTSC.png`는 사용자가 추후 직접 추가한다. 이 태스크는 폴더 존재만 보장한다.)

---

## Task 2: 실패하는 정적 테스트 작성

**Files:**
- Test: `tests/efti-report-screen.test.js`

이 저장소는 DOM 실행 없이 `index.html`/`js/*.js`/`style.css` 소스 문자열을 정규식·`includes()`로 검사하는 방식의 테스트를 사용한다 (`tests/donut-separator.test.js`, `tests/fame-awards.test.js` 참고). 동일한 패턴을 따른다.

- [ ] **Step 1: 테스트 파일 작성**

```javascript
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
  eftiJs.includes('class="tr-overlay tr-name"') &&
    eftiJs.includes('class="tr-overlay tr-age"') &&
    eftiJs.includes('class="tr-overlay tr-date"'),
  'printEftiReport should reuse the existing tr-overlay/tr-name/tr-age/tr-date classes'
);
assert(
  !eftiJs.includes('tr-overlay tr-efti'),
  'EFTI code should only drive the background image, not appear as a text overlay'
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

console.log('efti-report-screen.test.js OK');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/efti-report-screen.test.js`
Expected: FAIL — `js/efti-report.js`가 아직 없으므로 `read()`에서 `ENOENT: no such file or directory` 에러로 즉시 실패한다.

---

## Task 3: `index.html` — setupScreen 버튼 변경 + reportHubScreen/eftiReportScreen 마크업 추가

**Files:**
- Modify: `index.html:58-60` (setupScreen 버튼)
- Modify: `index.html` (`testReportScreen` 뒤로가기 버튼, 현재 `<button class="bank-back-btn" onclick="switchScreen('setupScreen')">←</button>` — `testReportScreen` 진입 지점 바로 아래 있는 것)
- Modify: `index.html` (`testReportScreen` div 바로 앞에 `reportHubScreen`/`eftiReportScreen` 추가)
- Modify: `index.html` (스크립트 태그 목록)

- [ ] **Step 1: setupScreen 버튼 텍스트/onclick 변경**

기존:
```html
            <button class="btn btn-primary" style="width:100%; padding:15px; margin-bottom:20px; font-size:16px; justify-content:center; font-weight:900;" onclick="showTestReportScreen()">
                📋 경제적 잠재력 테스트 보고서
            </button>
```

변경 후:
```html
            <button class="btn btn-primary" style="width:100%; padding:15px; margin-bottom:20px; font-size:16px; justify-content:center; font-weight:900;" onclick="showReportHubScreen()">
                📋 머니빌리지 경제적 유형 보고서
            </button>
```

- [ ] **Step 2: `testReportScreen`의 뒤로가기 버튼 대상 변경**

기존 (`testReportScreen` 헤더 안):
```html
                <button class="bank-back-btn" onclick="switchScreen('setupScreen')">←</button>
                <div class="bank-screen-title">📋 경제적 잠재력 테스트 보고서</div>
```

변경 후:
```html
                <button class="bank-back-btn" onclick="switchScreen('reportHubScreen')">←</button>
                <div class="bank-screen-title">📋 경제적 잠재력 테스트 보고서</div>
```

- [ ] **Step 3: `testReportScreen` div 바로 앞에 `reportHubScreen`/`eftiReportScreen` 추가**

`<!-- 경제적 잠재력 테스트 보고서 화면 -->` 주석 바로 앞에 아래를 삽입:

```html
    <!-- 보고서 선택 화면 -->
    <div id="reportHubScreen" class="screen">
        <div class="bank-screen-wrap">
            <div class="bank-screen-header">
                <button class="bank-back-btn" onclick="switchScreen('setupScreen')">←</button>
                <div class="bank-screen-title">📋 머니빌리지 경제적 유형 보고서</div>
            </div>
            <div style="padding:24px;">
                <button class="btn btn-primary" style="width:100%; padding:15px; margin-bottom:16px; font-size:16px; justify-content:center; font-weight:900;" onclick="showEftiReportScreen()">
                    🧭 경제적 유형 보고서
                </button>
                <button class="btn btn-primary" style="width:100%; padding:15px; font-size:16px; justify-content:center; font-weight:900;" onclick="showTestReportScreen()">
                    📋 경제적 잠재력 테스트 보고서
                </button>
            </div>
        </div>
    </div>

    <!-- 경제적 유형 보고서 입력 화면 -->
    <div id="eftiReportScreen" class="screen">
        <div class="bank-screen-wrap">
            <div class="bank-screen-header">
                <button class="bank-back-btn" onclick="switchScreen('reportHubScreen')">←</button>
                <div class="bank-screen-title">🧭 경제적 유형 보고서</div>
            </div>
            <div class="efti-form-wrap">
                <label class="efti-form-label">이름</label>
                <input id="eftiName" class="efti-form-input" type="text" placeholder="이름을 입력하세요">

                <label class="efti-form-label">나이</label>
                <input id="eftiAge" class="efti-form-input" type="number" placeholder="나이를 입력하세요">

                <label class="efti-form-label">EFTI</label>
                <select id="eftiType" class="efti-form-input"></select>

                <label class="efti-form-label">날짜</label>
                <input id="eftiDate" class="efti-form-input" type="date">

                <button class="btn btn-success" style="width:100%; padding:15px; margin-top:20px; font-size:16px; justify-content:center; font-weight:900;" onclick="printEftiReport()">
                    🖨️ 출력하기
                </button>
            </div>
        </div>
    </div>

```

- [ ] **Step 4: `js/efti-report.js` 스크립트 태그 추가**

기존:
```html
<script src="js/test-report.js"></script>
```

변경 후:
```html
<script src="js/test-report.js"></script>
<script src="js/efti-report.js"></script>
```

- [ ] **Step 5: 테스트 실행 (여전히 실패해야 정상)**

Run: `node tests/efti-report-screen.test.js`
Expected: FAIL — 이제 `index.html` 관련 assert들은 통과하지만, `js/efti-report.js` 파일 자체가 없어서 여전히 `ENOENT`로 실패한다. (Task 5에서 파일 생성 후 통과 확인)

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "feat: add report hub and EFTI report screen markup"
```

---

## Task 4: `style.css` — `eftiReportScreen` 폼 스타일 추가

**Files:**
- Modify: `style.css` (기존 `/* [화면 테스트보고서] */` 섹션 바로 뒤)

- [ ] **Step 1: CSS 추가**

`.tr-overlay { ... }` 정의 블록(약 1752번째 줄, `#testReportPrintArea { display: none; }` 앞) 바로 앞에 아래 섹션을 추가한다:

```css
        /* [화면 유형보고서] */
        .efti-form-wrap { padding: 24px; max-width: 420px; margin: 0 auto; }
        .efti-form-label { display: block; margin: 14px 0 6px; font-weight: 700; color: #333; font-size: 14px; }
        .efti-form-input { width: 100%; box-sizing: border-box; padding: 10px 14px; font-size: 15px; border: 1.5px solid #c0c0c0; border-radius: 8px; outline: none; font-family: inherit; }
        .efti-form-input:focus { border-color: #1565c0; }
```

- [ ] **Step 2: 테스트 실행 (여전히 실패해야 정상)**

Run: `node tests/efti-report-screen.test.js`
Expected: FAIL — CSS assert는 통과하지만 `js/efti-report.js`가 없어 여전히 ENOENT.

- [ ] **Step 3: 커밋**

```bash
git add style.css
git commit -m "feat: add form styles for EFTI report screen"
```

---

## Task 5: `js/efti-report.js` 구현 — 테스트 통과시키기

**Files:**
- Create: `js/efti-report.js`

- [ ] **Step 1: 파일 작성**

```javascript
// [경제적 유형 보고서] EFTI 기반 즉시 출력 보고서

function showReportHubScreen() {
    switchScreen('reportHubScreen');
}

function showEftiReportScreen() {
    switchScreen('eftiReportScreen');
    populateEftiTypeOptions();
    resetEftiReportForm();
}

function populateEftiTypeOptions() {
    const select = document.getElementById('eftiType');
    if (select.options.length) return;
    EFTI_OPTIONS.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
    });
}

function resetEftiReportForm() {
    document.getElementById('eftiName').value = '';
    document.getElementById('eftiAge').value = '';
    document.getElementById('eftiType').value = '-';
    document.getElementById('eftiDate').value = new Date().toISOString().slice(0, 10);
}

function printEftiReport() {
    const name = document.getElementById('eftiName').value.trim();
    const age  = document.getElementById('eftiAge').value.trim();
    const efti = document.getElementById('eftiType').value;
    const date = document.getElementById('eftiDate').value;

    if (!name) { alert('이름을 입력해주세요'); return; }
    if (!age)  { alert('나이를 입력해주세요'); return; }
    if (efti === '-') { alert('EFTI 유형을 선택해주세요'); return; }

    const imagePath = `image/efti/${efti}.png`;

    const area = document.getElementById('testReportPrintArea');
    area.innerHTML = `
        <div style="position:relative; display:inline-block; width:100%;">
            <img src="${imagePath}" style="width:100%; display:block;">
            <span class="tr-overlay tr-name">${name}</span>
            <span class="tr-overlay tr-age">${age}세</span>
            <span class="tr-overlay tr-date">${date}</span>
        </div>
    `;

    document.body.classList.add('printing-test-report');
    window.print();
    document.body.classList.remove('printing-test-report');
    area.innerHTML = '';

    resetEftiReportForm();
}
```

- [ ] **Step 2: 테스트 실행해서 통과 확인**

Run: `node tests/efti-report-screen.test.js`
Expected: PASS — 콘솔에 `efti-report-screen.test.js OK` 출력.

- [ ] **Step 3: 커밋**

```bash
git add js/efti-report.js
git commit -m "feat: implement EFTI type report input, print, and reset logic"
```

---

## Task 6: `CLAUDE.md` 문서 업데이트

**Files:**
- Modify: `CLAUDE.md` (Architecture 표, JS 파일 구조 표)

- [ ] **Step 1: "Architecture: 8-Screen SPA" 표에 행 추가**

`| \`testReportScreen\` | \`js/test-report.js\` | 경제적 잠재력 테스트 결과 조회 |` 행 다음에 아래 두 행을 추가한다:

```markdown
| `reportHubScreen` | `js/efti-report.js` | 보고서 선택 화면 (유형 보고서 / 잠재력 테스트 보고서) |
| `eftiReportScreen` | `js/efti-report.js` | 이름/나이/EFTI/날짜 직접 입력 → EFTI 배경 이미지로 즉시 출력 |
```

(표 헤더가 "8-Screen SPA"이지만 화면이 10개로 늘어나는 것은 기존 문서 관례상 문제 없음 — 표 제목은 그대로 두고 행만 추가한다.)

- [ ] **Step 2: "JS 파일 구조" 표에 행 추가**

`| \`js/test-report.js\` | testReportScreen — JSONP로 설문 결과 로드 |` 행 다음에 아래 행을 추가한다:

```markdown
| `js/efti-report.js` | reportHubScreen / eftiReportScreen — EFTI 직접 입력 즉시 출력 보고서 |
```

- [ ] **Step 3: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: document report hub and EFTI report screen in CLAUDE.md"
```

---

## Task 7: 수동 브라우저 검증

이 저장소는 빌드 없이 `index.html`을 직접 여는 정적 사이트이며 Chrome이 필요하다 (Web Serial API). 정적 텍스트 테스트는 마크업/로직의 존재를 확인할 뿐 실제 클릭 흐름을 검증하지 않으므로, 아래 절차를 브라우저(Chrome)에서 직접 수행해 확인한다.

- [ ] **Step 1: `index.html`을 Chrome에서 연다.**

- [ ] **Step 2: setupScreen에서 "📋 머니빌리지 경제적 유형 보고서" 버튼을 클릭 → `reportHubScreen`(선택 화면)으로 이동하는지 확인.**

- [ ] **Step 3: "🧭 경제적 유형 보고서" 버튼 클릭 → `eftiReportScreen`으로 이동, 4개 입력칸이 보이고 날짜 칸에 오늘 날짜가 기본으로 채워져 있는지 확인.**

- [ ] **Step 4: 이름/나이를 비워둔 채 "출력하기" 클릭 → alert가 뜨는지 확인. EFTI를 "-"로 둔 채 클릭 → alert가 뜨는지 확인.**

- [ ] **Step 5: 이름/나이/EFTI(임의 값)/날짜를 채우고 "출력하기" 클릭 → 인쇄 미리보기 대화상자가 뜨는지 확인 (배경 이미지는 아직 `image/efti/` 폴더에 실제 파일이 없으므로 깨진 이미지로 보이는 것이 정상 — 사용자가 나중에 16장을 추가하면 해결됨). 인쇄 대화상자를 닫은 뒤 폼이 빈 값(날짜만 오늘)으로 초기화되는지 확인.**

- [ ] **Step 6: `eftiReportScreen`에서 뒤로가기 → `reportHubScreen`으로 돌아오는지, 거기서 다시 뒤로가기 → `setupScreen`으로 돌아오는지 확인.**

- [ ] **Step 7: `reportHubScreen`에서 "📋 경제적 잠재력 테스트 보고서" 버튼 클릭 → 기존 `testReportScreen`이 정상 동작하는지 확인. 그 화면의 뒤로가기 버튼이 `reportHubScreen`으로 돌아오는지 확인 (기존에는 setupScreen으로 갔던 부분).**

이 태스크는 코드 변경이 없으므로 커밋하지 않는다. 문제가 발견되면 관련 Task로 돌아가 수정 후 재검증한다.

---

## Self-Review 결과 (계획 작성 시 확인 완료)

1. **스펙 커버리지**: 네비게이션 구조(Task 3), 입력 폼(Task 3/5), 이미지 경로 규칙(Task 1/5), 검증+즉시출력+미저장(Task 5), 출력 후 폼 초기화(Task 5), 문서 갱신(Task 6) — 스펙의 모든 항목에 대응하는 태스크가 존재한다.
2. **Placeholder 스캔**: 코드/커맨드 블록에 TBD·TODO 없음.
3. **타입/이름 일관성**: `showReportHubScreen`, `showEftiReportScreen`, `resetEftiReportForm`, `printEftiReport`, `populateEftiTypeOptions` 함수명이 Task 2 테스트와 Task 5 구현 전반에서 동일하게 사용됨. DOM id(`eftiName`/`eftiAge`/`eftiType`/`eftiDate`)도 Task 3 마크업과 Task 5 코드에서 동일.
