# dashboard.html 파일 분리 설계

**날짜:** 2026-04-10  
**대상 파일:** `dashboard.html` (~3,083줄)  
**목표:** 가독성 향상을 위해 CSS·JS를 별도 파일로 분리. 빌드 도구 없이 브라우저에서 직접 실행 가능한 구조 유지.

---

## 최종 파일 구조

```
money-village/
├── dashboard.html       ← HTML 마크업만 남김
├── style.css            ← 기존 <style> 블록 전체
└── js/
    ├── app.js           ← 전역 상태, 상수, 공유 헬퍼
    ├── setup.js         ← setupScreen 로직
    ├── counting.js      ← countingScreen 로직
    ├── report.js        ← reportScreen + PDF 업로드
    ├── fame.js          ← fameScreen + 명예의 전당
    └── arduino.js       ← Web Serial API 연결
```

---

## dashboard.html 변경 사항

- `<style>` 블록 전체 제거 → `<link rel="stylesheet" href="style.css">` 로 대체
- `<script>` 블록 전체 제거 → 아래 `<script src>` 태그들로 대체 (순서 중요)

```html
<link rel="stylesheet" href="style.css">
...
<!-- </body> 직전 -->
<script src="js/app.js"></script>
<script src="js/setup.js"></script>
<script src="js/counting.js"></script>
<script src="js/report.js"></script>
<script src="js/fame.js"></script>
<script src="js/arduino.js"></script>
```

로드 순서가 의존성 순서: `app.js`의 전역 변수를 나머지 파일들이 참조하므로 반드시 첫 번째로 로드.

---

## 각 JS 파일 내용

### `js/app.js` — 전역 상태·상수·공유 헬퍼

**전역 변수:**
- `currentMode`, `players[]`, `viewingPlayerIndex`, `activeCountingIndex`
- `customLogoData`, `loadedDate`, `fameIndivData`, `fameTeamData`
- `isSampleMode`, `nameInputsVisible`, `citizenListData`, `isSavingDrive`
- `SCRIPT_URL` (Apps Script 엔드포인트)

**상수:**
- `stockInfo` (6개 종목, 가격·색상)
- `TRAITS` (6개 특성 배열)
- `EFTI_OPTIONS` (16개 타입)

**공유 헬퍼 함수:**
- `switchScreen(id)` — 화면 전환
- `recalculateAllRankings()` — 순위 재계산
- `calcStock(assets)` — 주식 평가액 계산
- `calcCashFromBills(assets)` — 현금 합산
- `initAssets()` — 빈 자산 객체 생성
- `initTraitsState()` — 빈 특성 객체 생성
- `applyInputsToPlayer(p, prefix)` — DOM → player 동기화
- `sanitizeNickname(str)` — 닉네임 정제
- `sanitizeLimitedText(str)` — 일반 텍스트 정제
- `formatFolderDate(date)`, `getFormattedDate()` — 날짜 포맷
- `applyNameLengthBindings(root)` — 이름 길이 제한 바인딩
- `waitForRenderFrame()` — PDF 렌더링 대기 유틸
- `window.onload`, `DOMContentLoaded` 이벤트 바인딩

### `js/setup.js` — setupScreen

- `selectMode(m)`, `generateInputs()`, `startGame()`
- `addTeam()`, `addMember()`, `renumberMembers()`
- `syncTeamCountInput()`, `syncTeamUiToConfig()`
- `normalizeTeamNames()`, `makeInp()`
- `afterGenerateInputsUI()`, `toggleNameInputs()`
- `loadLogo(event)`, `initStockConfig()`
- `fetchCitizenList()`, `renderCitizenTable()`, `filterCitizenTable()`
- `refreshCitizenSelectOptions()`
- `submitCitizenRegistration()`, `submitCitizenRegistrationInline()`
- `openCitizenModal()`, `closeCitizenModal()`, `handleCitizenBackdrop()`
- `resetCitizenForm()`, `resetCitizenFormInline()`
- `setCitizenFormError()`, `setCitizenFormErrorInline()`
- `setCitizenSubmitLoading()`, `setCitizenSubmitLoadingInline()`
- `initCitizenForm()`

### `js/counting.js` — countingScreen

- `startCounting()`, `selectCountingPlayer(i)`
- `updateDash()`, `updateManualOnCounting()`
- `saveAndNextCountingPlayer()`
- `initStockGrid(id, sm, isCountingScreen)`
- `renderTraitGridCounting()`, `toggleTrait(key)`
- `clampTeamConfigInput(el, min, max)`

### `js/report.js` — reportScreen + PDF

- `finishGame()`, `showReport(idx)`
- `manualUpdate()`, `updateRankUI(p)`, `refreshDisplayOnly(p)`
- `updatePlayerNickname()`, `updatePlayerRealName()`
- `updatePlayerEfti()`, `updateTeamName()`
- `renderPlayStyleReport(p)`
- `updateTop3List()`
- `getPdfBase64FromElement(areaId, fileName)`
- `uploadPdfToDrive()`, `uploadFamePdfToDrive()`
- `saveToDrive()`
- `promptAndLoadPastAssets()`
- `buildReportPdfFileName(p, i)`

### `js/fame.js` — fameScreen

- `showFameScreen()`
- `fetchFameData()`
- `renderFame()`, `renderRankingTable(data, tableId, isTeam)`
- `setSpecialAwards(data)`
- `loadFameSamples(alertMsg)`

### `js/arduino.js` — Arduino / Web Serial

- `port`, `reader` 변수
- `connectArduino()`
- `readLoop()`
- `#connectBtn` 클릭 이벤트 바인딩

---

## 스코프 외 (변경하지 않음)

- HTML 마크업 구조 변경 없음
- 함수명·변수명 변경 없음 (전역 공유 방식 유지)
- `html2pdf.js`, `pretendard` 등 외부 CDN 참조 유지
- 앱 동작 변경 없음 — 순수 파일 분리만 수행

---

## 위험 요소

| 위험 | 대응 |
|---|---|
| 로드 순서 오류 (app.js 이전에 다른 파일 로드) | `<script>` 태그 순서 명시, app.js 최우선 |
| `arduino.js`의 `document.getElementById('connectBtn').addEventListener` — DOM 준비 전 실행 | `DOMContentLoaded` 내부로 이동 |
| 함수 누락 (어떤 파일에도 포함되지 않는 함수) | 분리 후 브라우저 콘솔에서 `ReferenceError` 확인 |
