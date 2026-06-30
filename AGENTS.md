# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Language

Respond in Korean.

## Project Overview

**Money Village (머니빌리지)** is a Korean financial literacy educational game management system.
`index.html`이 메인 HTML 뼈대이며, CSS는 `<style>` 태그에 내장, JavaScript는 `js/` 디렉토리의 개별 파일로 분리되어 있다.

## Running the App

No build step required. Open `index.html` directly in a browser. Chrome is required for the Web Serial API (Arduino integration).

## Architecture: 8-Screen SPA

화면은 `switchScreen(id)`로 전환되며, 한 번에 하나의 `<div class="screen">`만 표시된다:

| Screen ID | JS 파일 | Purpose |
|---|---|---|
| `setupScreen` | `js/setup.js` | 게임 설정, 플레이어/팀 등록, 시민권자 DB |
| `countingScreen` | `js/counting.js` | 플레이어별 실시간 자산 입력 |
| `reportScreen` | `js/report.js` | 최종 순위, 개인 자산 보고서, PDF 출력 |
| `fameScreen` | `js/fame.js` | 명예의 전당 — Supabase에서 불러온 역대 순위 |
| `adminScreen` | `js/admin.js` | 비밀번호 인증 후 진입, 퀴즈 정답 관리 |
| `bankScreen` | `js/bank.js` | 은행 예금 시뮬레이터 (3라운드) |
| `quizScreen` | `js/quiz.js` | OX 퀴즈 퀘스트 |
| `testReportScreen` | `js/test-report.js` | 경제적 잠재력 테스트 결과 조회 |

## Code Organization

### JS 파일 구조

| 파일 | 역할 |
|---|---|
| `js/app.js` | 전역 상태, 공통 헬퍼, `switchScreen`, `window.onload` |
| `js/setup.js` | setupScreen 로직 (시민권자 CRUD, 게임 설정) |
| `js/counting.js` | countingScreen 로직 |
| `js/report.js` | reportScreen 로직, PDF 생성·업로드 |
| `js/fame.js` | fameScreen 로직 |
| `js/admin.js` | adminScreen 로직 (퀴즈 정답 이미지) |
| `js/bank.js` | bankScreen 로직 (예금 3라운드) |
| `js/quiz.js` | quizScreen 로직 (OX 퀴즈) |
| `js/test-report.js` | testReportScreen — JSONP로 설문 결과 로드 |
| `js/arduino.js` | Web Serial API Arduino 연동 |
| `js/supabase-client.js` | 브라우저용 Supabase `sb*` 함수 전체 |
| `js/supabase-api.js` | (참조용) Node.js 환경 Supabase 래퍼 — 프로덕션에서 미사용 |
| `js/config.js` | `SCRIPT_URL`, `SURVEY_SCRIPT_URL`, `KAKAO_APP_KEY` |
| `js/config.example.js` | config.js 템플릿 |

CSS는 `index.html`의 `<style>` 태그 안에 번호 섹션으로 구성:
`/* [N] section name */` (e.g., `/* [1] 공통 스타일 */`, `/* [화면 2] 계수 */`)

## Key Global State (`js/app.js`)

| 변수 | 설명 |
|---|---|
| `players[]` | 플레이어 객체 배열 (중앙 데이터 구조) |
| `currentMode` | `'individual'` \| `'team'` |
| `currentGameVariant` | `'basic'` \| `'advanced'` \| `'rich_vessel'` |
| `activeCountingIndex` | countingScreen에서 현재 활성 플레이어 인덱스 |
| `viewingPlayerIndex` | reportScreen에서 표시 중인 플레이어 인덱스 |
| `stockInfo` | 주식 가격·색상 (ticker 키) |
| `estateInfo` | 부동산 가격·색상 (advanced/rich_vessel 전용) |
| `citizenListData[]` | Supabase에서 불러온 시민권자 목록 |
| `isSampleMode` | 샘플 데이터 — Drive/Supabase 업로드 차단 |
| `isSavingDrive` | 이중 저장 방지 잠금 |
| `loadedDate` | 과거 게임 재편집 시 설정되는 날짜 |
| `customLogoData` | fameScreen 커스텀 로고 base64 |

## Player Object Shape

```javascript
{
  id, nickname, realName, name, efti, team, teamId, gameId,
  assets: {
    // basic: 현금 권종 + 주식
    "100","500","1000","5000","10000","50000",
    "SASUNG","LGI","SKEI","CACAO","HYUNDE","NABER",
    // advanced/rich_vessel: 현금 권종 + 부동산
    "GAONGAEMI","NURIGOYANGI","DAMIWONSUNGI","MARUSURI","CHORONGBUNGI","HANIYUWOO"
  },
  total, rankIndiv, rankTeam, teamTotal,
  manualCash, diligenceReward, questReward, depositReward,
  traits: { diligent, saving, invest, career, luck, adventure },      // basic only
  successFactors: { financial_management, communication,              // advanced/rich_vessel only
                    critical_thinking, global_economy,
                    credit_trust, entrepreneurship }
}
```

`name`은 fallback. 표시는 `nickname`, 실명은 `realName`을 우선 사용.

## Game Variants

| Variant | 설명 | 자산 유형 | 특성 |
|---|---|---|---|
| `basic` | 기본 (초등생 대상) | 주식 (`stockInfo`) | `traits` 6종 |
| `advanced` | 심화 | 부동산 (`estateInfo`) | `successFactors` 6종 |
| `rich_vessel` | 부자의그릇 (성인 대상) | 부동산 (`estateInfo`) | `successFactors` 6종, `user_type='adult'` |

## Stock Tickers (basic)

| Ticker | Korean analogue | Default price |
|---|---|---|
| `SASUNG` | Samsung | 1,500 |
| `LGI` | LG | 600 |
| `SKEI` | SK | 1,600 |
| `CACAO` | Kakao | 4,000 |
| `HYUNDE` | Hyundai | 6,000 |
| `NABER` | Naver | 7,000 |

## Estate Tickers (advanced / rich_vessel)

| Ticker | 이름 | Default price |
|---|---|---|
| `GAONGAEMI` | 가온개미 단독주택 | 10,000 |
| `NURIGOYANGI` | 누리고양이 단독주택 | 10,000 |
| `DAMIWONSUNGI` | 다미원숭이 다세대주택 | 10,000 |
| `MARUSURI` | 마루수리 다세대주택 | 10,000 |
| `CHORONGBUNGI` | 초롱부엉이 아파트 | 10,000 |
| `HANIYUWOO` | 하늬여우 아파트 | 10,000 |

## Traits System (basic)

Six boolean personality traits stored in `player.traits`:

| Key | Emoji | King title |
|---|---|---|
| `diligent` | 👷 | 성실왕 |
| `saving` | 🏦 | 저축왕 |
| `invest` | 📈 | 투자왕 |
| `career` | 🎓 | 커리어왕 |
| `luck` | 🍀 | 행운왕 |
| `adventure` | ⚔️ | 모험왕 |

## Success Factors (advanced / rich_vessel)

Six boolean factors stored in `player.successFactors`:

| Key | Emoji | Name |
|---|---|---|
| `financial_management` | 🪙 | 재정관리능력 |
| `communication` | 💬 | 의사소통 및 협상능력 |
| `critical_thinking` | 🤔 | 비판적 사고와 문제 해결 능력 |
| `global_economy` | 💡 | 글로벌경제이해력 |
| `credit_trust` | 🤝 | 신용과 신뢰 |
| `entrepreneurship` | 🏢 | 기업가정신 |

## EFTI Classification

17개 옵션 (`"-"` 포함): `FAEN`, `FAEC`, `FASN`, `FASC`, `FTEN`, `FTEC`, `FTSN`, `FTSC`, `PAEN`, `PAEC`, `PASN`, `PASC`, `PTEN`, `PTEC`, `PTSN`, `PTSC`. Stored as `player.efti`.

## Backend Integration

### Supabase (메인 데이터베이스)

모든 게임 데이터는 Supabase로 처리한다. 브라우저 클라이언트는 `js/supabase-client.js`의 `sb*` 함수로 접근.
`SUPABASE_URL`과 `SUPABASE_ANON_KEY`는 `index.html` 인라인에 설정.

#### Supabase 테이블

| Table | 용도 | Conflict Key |
|---|---|---|
| `users` | 시민권자 마스터 (`user_type`: child\|adult) | `nickname` |
| `game_info` | 게임 메타 (date, variant, section_num) | `game_id` |
| `game_individual` | 개인 게임 기록 (quest_reward, deposit_reward 포함) | `game_id,nickname` |
| `game_team` | 팀 게임 기록 | `team_id` |
| `stock_price` | 주가 기록 (basic) | `game_id` |
| `stock_balance` | 주식 보유량 (basic) | `game_id,nickname` |
| `cash_balance` | 현금 권종별 보유량 | `game_id,nickname` |
| `traits` | 개성 특성 (basic) | `game_id,nickname` |
| `estate_price` | 부동산 가격 (advanced/rich_vessel) | `game_id` |
| `estate_balance` | 부동산 보유량 (advanced/rich_vessel) | `game_id,nickname` |
| `success_factors` | 성공요소 (advanced/rich_vessel) | `game_id,nickname` |
| `bank_state` | 은행 게임 설정 상태 | `game_id` |
| `bank_history` | 예금 내역 | `game_id,nickname,round_num,is_team` |
| `quiz_state` | 퀴즈 보상 설정 상태 | `game_id` |
| `quiz_history` | 퀴즈 정답 내역 | `game_id,nickname` |

### GAS (Google Apps Script)

엔드포인트: `js/config.js`의 `SCRIPT_URL` (= `SURVEY_SCRIPT_URL` — 동일 프로젝트)

| Action | Method | Purpose |
|---|---|---|
| `uploadPDF` | POST | base64 PDF를 Google Drive에 업로드 |
| `listTestReports` | GET (JSONP) | 설문 스프레드시트에서 테스트 결과 목록 조회 |

- `uploadPDF` `category: "asset_report"` → `ASSET_FOLDER_ID`, 링크 공유 설정
- `uploadPDF` `category: "hall_of_fame"` → `HALL_FOLDER_ID`
- POST body: `Content-Type: text/plain;charset=utf-8` + JSON
- GAS 소스: `gas/Code.js` / clasp 설정: `gas/.clasp.json`

### clasp 배포 방법

```bash
# 최초 1회 설치 및 로그인 (사용자가 직접)
npm install -g @google/clasp
clasp login

# 이후 배포는 Codex가 직접 실행 (gas/ 디렉토리에서)
cd gas && clasp push --force
```

## 배포 규칙

- **GAS 코드** (`gas/Code.js`): `gas/` 디렉토리에서 `clasp push --force`로 직접 배포. `.gitignore`에 등록되어 GitHub에는 올라가지 않음.
- **나머지 코드** (`index.html`, `js/` 등): 변경 후 반드시 `git push origin main`으로 GitHub에 반영.

## Citizen Registration

Two registration UIs exist in `setupScreen`:
- **Modal form** (`#citizenModal`) — citizen DB 탭에서 열림
- **Inline form** — setupScreen에 내장

모두 Supabase(`sbRegisterCitizen` in `js/supabase-client.js`)를 호출하며, `_nick()` / `_text()`로 입력값 정제.
`user_type`: 기본 `'child'`, `rich_vessel` 게임 시작 시 `'adult'`로 upsert.

## Bank System (`js/bank.js`)

3라운드 예금 시뮬레이터. 각 라운드별 예금 유형(`long`/`mid`/`short`)과 이자율 설정 가능.
- 설정은 `localStorage('mv_bank_settings')`에 영속화
- Supabase: `bank_state` (이자율 설정), `bank_history` (예금 내역)
- 보상(`depositReward`)은 게임 종료 시 `player.depositReward`에 반영

## Quiz System (`js/quiz.js`)

variant × type별 OX 퀴즈 이미지 + 정답 관리. 개인/팀 탭 분리.
- `image/quiz/<variant>/<type>_quiz<N>.png` 구조
- Supabase: `quiz_state` (보상 설정), `quiz_history` (결과)
- 보상(`questReward`)은 게임 종료 시 `player.questReward`에 반영

## Admin System (`js/admin.js`)

SHA-256 비밀번호 인증 후 `adminScreen` 진입. 퀴즈 정답 이미지를 variant별로 표시.
- 정답 이미지: `image/answers/<variant>/<type>_answer<N>.png`

## Test Report Screen (`js/test-report.js`)

경제적 잠재력 설문(Smore) 결과를 JSONP로 GAS에서 불러와 표시.
`SURVEY_SCRIPT_URL?action=listTestReports&callback=<fn>` 호출.

## Arduino Integration

Web Serial API (115200 baud), 개행 구분 JSON:
```json
{"type": "10000", "count": 3}
```
`type`: 권종(`"10000"`) 또는 주식 ticker(`"SASUNG"`). 숫자 type → `calcCashFromBills()`로 `manualCash` 재계산.

## Game Lifecycle

```
selectMode() → generateInputs() → startGame() → sbInitGame()
  → selectCountingPlayer() [loop] → saveAndNextCountingPlayer()
  → finishGame() → recalculateAllRankings() → showReport()
  → saveToDrive() [Supabase 명예의전당] / uploadPdfToDrive() [GAS PDF]
```

## Key Helper Functions

- `calcStock(assets)` / `calcActiveAsset(assets)` — 주식 or 부동산 총합 계산
- `calcCashFromBills(assets)` — 권종별 합계로 현금 계산
- `recalculateAllRankings()` — 전 플레이어 `rankIndiv`, `rankTeam`, `teamTotal` 재계산
- `applyInputsToPlayer(p, prefix)` — DOM 입력값(prefix `'cnt'`|`'rpt'`)을 player 객체에 동기화
- `switchScreen(id)` — 화면 전환 + 인쇄 대상 `.report-paper` 지정
- `sbInitGame(gameId, mode, players, ...)` — 게임 시작 시 Supabase 전 테이블 초기화
- `sbSaveGameResult(data)` — 게임 결과 Supabase 저장
- `sbLoadHallOfFame()` — 명예의 전당 데이터 조회 (game_variant 포함)

## PDF Export

`html2pdf.js`로 클라이언트에서 PDF 생성. 입력 필드는 캡처 전 `<span>`으로 교체.
- 개인 자산 보고서: GAS `uploadPDF` (category: `asset_report`) → Google Drive
- 명예의 전당 PDF: GAS `uploadPDF` (category: `hall_of_fame`) → Google Drive
- `isSampleMode` 시 업로드 차단.
