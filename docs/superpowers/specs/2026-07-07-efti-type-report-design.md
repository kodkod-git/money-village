# 경제적 유형 보고서(EFTI) 출력 화면 설계

**날짜**: 2026-07-07
**브랜치**: `feat/efti-type-report`

## 개요

기존 "경제적 잠재력 테스트 보고서"(구글시트 기반, `js/test-report.js`)는 그대로 유지하고,
사용자가 이름/나이/EFTI/날짜를 직접 입력해 EFTI 유형별 배경 이미지 위에 즉시 출력하는
"경제적 유형 보고서" 기능을 신규 추가한다. 저장 없이 입력 → 즉시 출력만 수행한다.

---

## 네비게이션 구조

```
setupScreen
  └─ "📋 머니빌리지 경제적 유형 보고서" 버튼 → showReportHubScreen()
        │
        ▼
reportHubScreen (신규, 선택 화면)
  ├─ "🧭 경제적 유형 보고서" 버튼      → showEftiReportScreen()
  ├─ "📋 경제적 잠재력 테스트 보고서" 버튼 → showTestReportScreen()
  └─ [← 뒤로가기] → switchScreen('setupScreen')
        │                                    │
        ▼                                    ▼
eftiReportScreen (신규)              testReportScreen (기존, 변경 없음)
  └─ [← 뒤로가기]                       └─ [← 뒤로가기] 대상 변경:
     → switchScreen('reportHubScreen')     switchScreen('setupScreen')
                                            → switchScreen('reportHubScreen')
```

- setupScreen의 기존 버튼(`onclick="showTestReportScreen()"`, 텍스트 "📋 경제적 잠재력 테스트 보고서")을
  텍스트 "📋 머니빌리지 경제적 유형 보고서", `onclick="showReportHubScreen()"`으로 변경한다.
- `reportHubScreen`은 `setupScreen`과 동일한 카드형 버튼 레이아웃(`bank-screen-wrap`/`bank-screen-header` 톤)을
  재사용하는 단순 선택 화면이다. 신규 카드 스타일은 만들지 않는다.

---

## 파일 구조 변경

| 파일 | 변경 내용 |
|---|---|
| `index.html` | setupScreen 버튼 텍스트/onclick 변경, `reportHubScreen`/`eftiReportScreen` `<div class="screen">` 추가, `testReportScreen`의 뒤로가기 onclick 대상 변경, `<script src="js/efti-report.js">` 추가 |
| `js/efti-report.js` | **신규** — `showReportHubScreen()`, `showEftiReportScreen()`, `resetEftiReportForm()`, `printEftiReport()` |
| `style.css` | 필요 시 `reportHubScreen`용 최소 레이아웃 스타일만 추가 (오버레이/출력 CSS는 기존 `.tr-*` 재사용, 신규 CSS 없음) |
| `image/efti/` | **신규 폴더** — `.gitkeep` + 16개 배경 이미지(`FAEN.png` ~ `PTSC.png`, 사용자가 추후 직접 추가) |
| `CLAUDE.md` | "8-Screen SPA" 표에 `reportHubScreen`/`eftiReportScreen` 행 추가, JS 파일 구조 표에 `js/efti-report.js` 행 추가 |

---

## 화면 구조 (eftiReportScreen)

```
eftiReportScreen
├── 헤더 바 (bank-screen-header 재사용)
│   ├── [← 뒤로가기] 버튼 → switchScreen('reportHubScreen')
│   └── 제목: "🧭 경제적 유형 보고서"
└── 입력 폼
    ├── 이름 (text, id="eftiName")
    ├── 나이 (number, id="eftiAge")
    ├── EFTI (select, id="eftiType") — EFTI_OPTIONS(js/app.js에 기존 정의된 16종 + "-") 그대로 재사용
    ├── 날짜 (date, id="eftiDate") — 기본값 new Date().toISOString().slice(0,10) (기존 gameDate 관례와 동일)
    └── [🖨️ 출력하기] 버튼 → printEftiReport()
```

`showEftiReportScreen()`은 화면 전환 시마다 `resetEftiReportForm()`을 호출해 폼을 초기 상태(이름/나이 공란,
EFTI "-", 날짜는 오늘)로 만든다.

---

## 출력 로직 (printEftiReport)

```
printEftiReport() 호출
→ 입력값 읽기: name, age, efti, date
→ 검증:
    - name 비어있으면 alert("이름을 입력해주세요") 후 중단
    - age 비어있으면 alert("나이를 입력해주세요") 후 중단
    - efti === '-' 이면 alert("EFTI 유형을 선택해주세요") 후 중단
→ 이미지 경로: `image/efti/${efti}.png`
→ #testReportPrintArea 내용 설정 (기존 printTestReport()와 동일한 마크업/클래스 재사용):
    <div style="position:relative; display:inline-block; width:100%;">
      <img src="{imagePath}" style="width:100%; display:block;">
      <span class="tr-overlay tr-name">{name}</span>
      <span class="tr-overlay tr-age">{age}세</span>
      <span class="tr-overlay tr-date">{date}</span>
    </div>
→ document.body.classList.add('printing-test-report')
→ window.print()
→ document.body.classList.remove('printing-test-report')
→ area.innerHTML = ''
→ resetEftiReportForm() 호출 (다음 사람 입력을 위해 초기화)
```

- 기존 `#testReportPrintArea`, `.tr-overlay`/`.tr-name`/`.tr-age`/`.tr-date` 클래스, `printing-test-report`
  print CSS를 그대로 재사용한다. 신규 CSS는 추가하지 않는다.
- 저장(구글시트/Supabase)은 하지 않는다 — 입력 → 즉시 출력만 수행하는 일회성 기능이다.
- EFTI 값은 배경 이미지 선택에만 사용하고, 텍스트로는 오버레이하지 않는다.

---

## 미결 사항

- 오버레이 좌표(top/left %, 기존 `.tr-name`/`.tr-age`/`.tr-date` 값 재사용)는 실제 16종 이미지가
  기존 4종 테스트 보고서 이미지와 레이아웃이 다를 경우 브라우저 테스트 후 조정 필요
- `image/efti/` 폴더에 16장 이미지 파일(`FAEN.png` ~ `PTSC.png`) 추가는 사용자가 직접 제공
