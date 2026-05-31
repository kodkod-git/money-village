# 경제적 잠재력 테스트 보고서 출력 화면 설계

**날짜**: 2026-06-01  
**브랜치**: `feat/test-report-screen`

## 개요

구글 스프레드시트에 저장된 설문 결과를 불러와 그룹별 보고서를 출력할 수 있는 새 스크린을 추가한다. setupScreen에서 진입하며, 비밀번호 없이 누구나 접근 가능하다.

---

## 데이터 소스

| 항목 | 값 |
|---|---|
| 스프레드시트 ID | `102DrLmocl8IPzU_qWnAUzlA9o5FX34GppEMXoE5hjw0` |
| 시트 이름 | `Smore-JFWXFqyQVv-jrE` |
| A열 | 생성일시 (timestamp) |
| B열 | 이름 |
| C열 | 나이 |
| J열 | 결과 (`"Red Group"` / `"Green Group"` / `"Orange Group"` / `"Blue Group"`) |

헤더 행(1행)은 스킵하고 2행부터 읽는다.

---

## 파일 구조 변경

| 파일 | 변경 내용 |
|---|---|
| `index.html` | setupScreen 버튼 추가, testReportScreen HTML 추가, `<script src="js/test-report.js">` 추가 |
| `js/test-report.js` | **신규** — testReportScreen 전체 로직 |
| `gas/Code.js` | `doGet`에 라우팅 1줄 추가: `if (action === 'listTestReports') return handleListTestReports_();` |
| `gas/TestReport.js` | **신규** — `SURVEY_SPREADSHEET_ID` 상수 + `handleListTestReports_()` 함수 |
| `image/reports/` | **신규 폴더** — `red.png`, `green.png`, `orange.png`, `blue.png` (4장, 사용자 제공) |

---

## 화면 구조 (testReportScreen)

```
testReportScreen
├── 헤더 바
│   ├── [← 처음으로] 버튼 → switchScreen('setupScreen')
│   ├── 제목: "📋 경제적 잠재력 테스트 보고서"
│   └── [🔄 새로고침] 버튼 → fetchTestReports() 재호출
├── 로딩 상태 표시
└── 카드 그리드 (2열)
    └── 카드 구조:
        ├── 썸네일: <img src="image/reports/{color}.png"> (object-fit:cover, height:120px, 상단 크롭)
        ├── 제목: {YYYYMMDD}_{이름}_테스트결과보고서
        └── [🖨️ 출력하기] 버튼
```

---

## 데이터 흐름

```
testReportScreen 진입
→ fetchTestReports() 호출
→ GET {SCRIPT_URL}?action=listTestReports
→ GAS TestReport.js:
    SpreadsheetApp.openById(SURVEY_SPREADSHEET_ID)
      .getSheetByName('Smore-JFWXFqyQVv-jrE')
      .getDataRange().getValues()
    → 1행 스킵, A/B/C/J열 추출
→ JSON 반환: [{ createdAt, name, age, result }, ...]
→ renderTestReportCards() 호출 → 카드 그리드 렌더링
```

---

## 보고서 출력 (이미지 오버레이 + window.print())

### 결과 → 이미지 매핑

```javascript
const REPORT_IMAGES = {
    'Red Group':    'image/reports/red.png',
    'Green Group':  'image/reports/green.png',
    'Orange Group': 'image/reports/orange.png',
    'Blue Group':   'image/reports/blue.png',
};
```

결과 값이 4개 그룹에 해당하지 않으면 카드는 렌더링하되 출력 버튼 클릭 시 "알 수 없는 그룹입니다" 알림을 표시하고 인쇄를 중단한다.

### 출력 흐름

```
printTestReport({ name, age, createdAt, result }) 호출
→ 이미지 경로 결정 (REPORT_IMAGES[result])
→ 날짜 파싱: createdAt → displayDate (YYYY-MM-DD)
→ 나이 표시: C열 값이 숫자면 "세" 접미사 추가 (예: 8 → "8세"), 이미 문자열이면 그대로 사용
→ #testReportPrintArea 내용 설정:
    <div style="position:relative">
      <img src="{imagePath}" style="width:100%; display:block;">
      <span class="tr-overlay tr-name">{name}</span>
      <span class="tr-overlay tr-age">{age}세</span>
      <span class="tr-overlay tr-date">{displayDate}</span>
    </div>
→ window.print()
→ #testReportPrintArea 내용 초기화
```

### 오버레이 CSS (초안 — 실제 이미지로 미세 조정 필요)

```css
.tr-overlay {
    position: absolute;
    font-family: inherit;
    font-size: 1.4%;   /* 이미지 너비 기준 상대 단위 */
    color: #333;
}
.tr-name  { top: 12.5%; left: 19%; }
.tr-age   { top: 12.5%; left: 52%; }
.tr-date  { top: 12.5%; left: 78%; }
```

### Print CSS

```css
@media print {
    body > *:not(#testReportPrintArea) { display: none !important; }
    #testReportPrintArea { display: block !important; }
    @page { size: A4 portrait; margin: 0; }
}
```

---

## 파일명 규칙

형식: `{YYYYMMDD}_{이름}_테스트결과보고서`  
예시: `20260526_홍길동_테스트결과보고서`

- `YYYYMMDD`: A열 생성일시에서 파싱
- 파일명은 카드 제목으로 표시 (실제 파일 저장 아님 — `window.print()` 사용)

---

## setupScreen 버튼 추가

기존 버튼들 아래에 추가:

```html
<button class="btn btn-report" style="width:100%; padding:15px; margin-bottom:20px; font-size:16px; justify-content:center; font-weight:900;"
        onclick="switchScreen('testReportScreen')">
    📋 경제적 잠재력 테스트 보고서 출력하기
</button>
```

---

## 미결 사항

- 오버레이 좌표(top/left %)는 실제 이미지 파일로 브라우저 테스트 후 확정
- `image/reports/` 폴더에 4장 이미지 파일 추가는 사용자가 직접 제공
