# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Respond in Korean.

## Project Overview

**Money Village (머니빌리지)** is a Korean financial literacy educational game management system. It is a **monolithic single-file HTML5 application** — the entire app lives in `index.html` (~3,083 lines) with embedded CSS and JavaScript.

## Running the App

No build step required. Open `index.html` directly in a browser. Chrome is required for the Web Serial API (Arduino integration).

## Architecture: Four-Screen SPA

The app renders one of four `<div>` screens at a time, toggled by `switchScreen(id)`:

| Screen ID | Purpose |
|---|---|
| `setupScreen` | Game configuration, player/team registration, citizen DB |
| `countingScreen` | Real-time asset input per player (cash + stocks + traits) |
| `reportScreen` | Final rankings, per-player asset report, PDF export |
| `fameScreen` | Hall of Fame — historical rankings pulled from Google Drive |

## Code Organization

CSS and JS are divided into numbered sections using comments:
- CSS: `/* [N] section name */` (e.g., `/* [1] 공통 스타일 */`, `/* [화면 2] 계수 */`)
- JS: `// [N] section name` (e.g., `// [1] 데이터 및 설정`, `// [7] 명예의 전당 로직`)

## Key Global State

- `players[]` — Array of player objects (central data structure)
- `currentMode` — `'individual'` or `'team'`
- `activeCountingIndex` — Which player is active in `countingScreen`
- `viewingPlayerIndex` — Which player is displayed in `reportScreen`
- `stockInfo` — Stock prices and colors keyed by ticker
- `citizenListData[]` — Pre-registered citizens fetched from Google Drive
- `isSampleMode` — Prevents sample game data from uploading to real backend
- `isSavingDrive` — Concurrency lock to prevent double Drive uploads
- `loadedDate` — Set when loading a past game for re-editing

## Player Object Shape

```javascript
{
  id, nickname, realName, name, efti, team,
  assets: { "100","500","1000","5000","10000","50000", "SASUNG","LGI","SKEI","CACAO","HYUNDE","NABER" },
  total, rankIndiv, rankTeam, teamTotal,
  manualCash, diligenceReward,
  traits: { diligent, saving, invest, career, luck, adventure }
}
```

`name` is a generic fallback; prefer `nickname` (display) and `realName` (legal name) where available.

## Stock Tickers

| Ticker | Korean analogue | Default price |
|---|---|---|
| `SASUNG` | Samsung | 1,500 |
| `LGI` | LG | 600 |
| `SKEI` | SK | 1,600 |
| `CACAO` | Kakao | 4,000 |
| `HYUNDE` | Hyundai | 6,000 |
| `NABER` | Naver | 7,000 |

Prices are editable in `setupScreen` via `conf_<TICKER>` inputs and persisted in `stockInfo`.

## Traits System

Six boolean personality traits stored in `player.traits`:

| Key | Emoji | King title |
|---|---|---|
| `diligent` | 👷 | 성실왕 |
| `saving` | 🏦 | 저축왕 |
| `invest` | 📈 | 투자왕 |
| `career` | 🎓 | 커리어왕 |
| `luck` | 🍀 | 행운왕 |
| `adventure` | ⚔️ | 모험왕 |

## EFTI Classification

16 student type codes used for citizen registration: combinations of `F/P`, `A/T`, `E/T`, `N/C` (e.g., `FAEN`, `PTSC`). Stored as `player.efti`.

## Backend Integration

All server communication goes to a single Google Apps Script endpoint:

```javascript
const SCRIPT_URL = "https://script.google.com/macros/s/.../exec";
```

Supported `action` values:

| Action | Method | Purpose |
|---|---|---|
| `uploadPDF` | POST | Upload base64 PDF to Google Drive |
| `saveGameResult` | POST | Save game result to Hall of Fame DB |
| `registerCitizen` | POST | Add a new citizen to the Users master sheet |
| `deleteCitizen` | POST | Remove a citizen from the Users sheet |
| `saveStockValue` | POST | Save stock prices for a game session |
| `saveUserBalance` | POST | Save per-user stock holdings |
| `syncSmoreEFTI` | POST | Update a user's EFTI type |
| `listCitizens` | GET | Fetch all registered citizens |
| `loadAssetsByDate` | GET | Load a past game session by date |
| `loadUserBalance` | GET | Fetch a user's stock holdings by nickname+gameId |

All POST requests use `Content-Type: text/plain;charset=utf-8` with a JSON body (required by Apps Script CORS restrictions).

## Google Apps Script Backend

GAS 소스코드 위치: `gas/Code.js`
clasp 설정 파일: `gas/.clasp.json` (scriptId 설정 필요)

### Sheets

| Sheet | 용도 | Key 컬럼 |
|---|---|---|
| `Users` | 시민권자 마스터 | B열 nickname |
| `Individual` | 개인 게임 기록 | H열 key (날짜\|닉네임) |
| `Team` | 팀 게임 기록 | E열 key (날짜\|팀명\|총자산) |
| `Stock` | 게임별 주가 기록 | A열 gameId |
| `Balance` | 유저별 주식 보유량 | I열 key (gameId\|닉네임) |

### clasp 배포 방법

```bash
# 최초 1회 설치 및 로그인 (사용자가 직접)
npm install -g @google/clasp
clasp login

# 이후 배포는 Claude가 직접 실행 (gas/ 디렉토리에서)
cd gas && clasp push --force
```

`gas/.clasp.json`의 `scriptId`는 GAS 에디터 → 프로젝트 설정 → 스크립트 ID에서 확인.

## 배포 규칙

- **GAS 코드** (`gas/Code.js`): `gas/` 디렉토리에서 `clasp push --force`로 직접 배포. `.gitignore`에 등록되어 있어 GitHub에는 올라가지 않음.
- **나머지 코드** (`index.html`, `js/`, `css/` 등): 변경 후 반드시 `git push origin main`으로 GitHub에 반영.

## Citizen Registration

There are two registration UIs that both call `action: "registerCitizen"`:
- **Modal form** (`#citizenModal`) — opened from the citizen DB tab in `setupScreen`
- **Inline form** — embedded directly in the `setupScreen` layout

Both use `sanitizeNickname()` for nicknames and `sanitizeLimitedText()` for real names.

## Arduino Integration

The hardware cash counter connects via Web Serial API at 115200 baud. It sends newline-delimited JSON:
```json
{"type": "10000", "count": 3}
```
`type` is either a bill denomination (e.g., `"10000"`) or a stock ticker (e.g., `"SASUNG"`). Numeric types trigger `calcCashFromBills()` to recompute `manualCash`.

## Game Lifecycle

```
selectMode() → generateInputs() → startGame()
  → selectCountingPlayer() [loop] → saveAndNextCountingPlayer()
  → finishGame() → recalculateAllRankings() → showReport()
  → saveToDrive() [Hall of Fame] / uploadPdfToDrive() [PDF reports]
```

## Key Helper Functions

- `calcStock(assets)` — computes total stock value from `assets` object
- `calcCashFromBills(assets)` — computes cash total from bill-denomination keys
- `recalculateAllRankings()` — recomputes `rankIndiv`, `rankTeam`, `teamTotal` for all players
- `applyInputsToPlayer(p, prefix)` — syncs DOM inputs (prefix `'cnt'` or `'rpt'`) into a player object
- `sanitizeNickname(str)` — strips special characters and whitespace
- `switchScreen(id)` — shows the target screen and marks the correct `.report-paper` for print

## PDF Export

PDFs are generated client-side via `html2pdf.js`. Inputs are replaced with `<span>` elements before capture to ensure correct rendering. The base64 output is POST'd to Apps Script. `isSampleMode` blocks uploads.
