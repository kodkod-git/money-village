# 행운(Luck) 페이지 설계

- 원본 기획: `proposal/20260708_luck_page.md`
- 브랜치: `main`에서 새 브랜치 분기하여 작업

## 1. 개요

가위바위보 / 룰렛 색깔 맞추기 / 주사위 눈금 맞추기 3가지 미니게임으로 구성된 "행운" 화면.
플레이어는 배팅액(계산용 숫자, 실제 자산에서 차감되지 않음)을 정하고 게임에서 이기면
배팅액 × 게임별 보상 배수를 획득한다. 참가 횟수 제한과 쿨다운이 없어 같은 플레이어가
반복 플레이할 수 있다.

## 2. 진입 & 초기 설정

- 메인 페이지(`setupScreen`)에 `🍀 머니빌리지 행운` 버튼 추가. 은행 버튼과 퀴즈 버튼 사이에 위치.
  - `<button class="btn btn-luck" style="width:100%; padding:15px; margin-bottom:20px; font-size:16px; justify-content:center; font-weight:900;" onclick="openLuckModal()">🍀 머니빌리지 행운</button>`
  - `style.css`에 `.btn-luck { background: <red>; color:#fff; }` 추가 (기존 `.btn-bank`/`.btn-quiz`와 동일한 라인 근방, `style.css:818-819` 부근)
- `luckModal` (신규): 은행/퀴즈 모달 View 1과 동일한 날짜/분반(게임 회차) 선택 UI 재사용
  - 회차 선택 후 보상 배수 스테퍼 3개 노출: 가위바위보(기본 4배), 룰렛(기본 5배), 주사위(기본 7배)
  - "설정 완료" 클릭 → 기존 `sbGetLuckState`로 저장된 값이 있으면 불러오고, 없으면 기본값으로 `sbUpsertLuckState(gameId, {...})` 저장 → `sbGetPlayersByGameId`로 플레이어 로드 → `switchScreen('luckScreen')`

## 3. 화면 흐름 & UI

테마 색상: 빨강. 은행/퀴즈와 동일한 `bank-screen-wrap` / `bank-screen-header` 구조를 그대로 재사용하되 다음이 다르다:
- 우측 상단 "보상:-" 배지 없음
- 팀/개인 탭(`player-tab-bar`) 없음 — 항상 개인 뷰만 존재 (`renderActivityPlayerList`를 팀 데이터 없이 호출)

화면 단계 (모두 `luckScreen` 내부에서 `_luckShowView(n)`으로 전환, 은행의 View2~4 패턴과 동일):

1. **View 2 (플레이어 목록)**: `luckPlayerGrid`. 카드에는 닉네임 + 누적 획득액(`+32,000원`, 0이면 표시 생략). 하단 "마감" 버튼 + 전체 초기화 버튼.
2. **View 3 (게임 선택)**: 플레이어 카드 클릭 시 진입. 가위바위보 / 룰렛 / 주사위 3개 버튼.
3. **View 4 (배팅 신청서)**: 게임 선택 후 진입. 은행 예금 신청서(View 3)와 동일한 스테퍼 UI(−만/−천/+천/+만) + "배팅액 × 배수 = 획득 예정액" 미리보기 → "배팅 완료" 버튼
4. **View 5 (게임 플레이)**: 선택된 게임 화면 (섹션 4).
5. 결과 확인 후 "다른 학생 배팅 접수" 버튼 → View 2로 복귀. 참가 제한이 없으므로 같은 플레이어를 즉시 재선택 가능.

## 4. 게임 메커닉 & 이미지 에셋

공통 규칙: **버튼 클릭 순간 `Math.random()`으로 결과를 확정**하고, 그 결과에 대응하는 정적 이미지로 즉시 `src`를 교체한다. 애니메이션과 실제 승패가 항상 일치하도록 보장.

이미지는 `image/luck/`에 위치하며, `image/efti/`와 마찬가지로 사용자가 직접 준비해 추가한다 (코드는 경로만 참조).

### 가위바위보
- 상단 `<img>`가 0.2초 간격 `setInterval`로 `rps_scissors.png` / `rps_rock.png` / `rps_paper.png` 3장을 `src` 교체하며 순환
- 하단 가위/바위/보 3개 버튼 클릭 → 그 순간 상단 이미지를 클릭값으로 고정(플레이어의 패), 동시에 컴퓨터 패를 랜덤 결정
- 표준 가위바위보 승패 규칙 적용: 이겼을 때만 보상 획득, 지거나 비기면 실패

### 룰렛 색깔 맞추기
- 상단 `roulette_wheel.png`가 CSS `transform: rotate()` 애니메이션으로 빠르게 회전
- 하단 빨강/파랑/노랑/초록 4개 버튼 클릭 → 그 순간 4색 중 랜덤 당첨색 결정 → 회전 애니메이션을 해당 색 각도로 스냅 정지
- 클릭한 색과 당첨색이 일치할 때만 보상 획득

### 주사위 눈금 맞추기
- 평소엔 상단 `<img>`가 `dice_spin.gif`(회전 연출용) 재생
- "멈춤" 버튼 클릭 → 그 순간 1~6 랜덤 결정 → `<img>` src를 `dice_face_1.png` ~ `dice_face_6.png` 중 해당 값으로 즉시 교체 (gif → 정적 이미지)
- 6이 나오면 보상 획득, 아니면 실패

### 필요 이미지 에셋 목록
`rps_scissors.png`, `rps_rock.png`, `rps_paper.png`, `roulette_wheel.png`, `dice_spin.gif`, `dice_face_1.png` ~ `dice_face_6.png` (총 11개 파일)

## 5. 데이터 모델 (Supabase)

### `luck_state` (신규 테이블)
| 컬럼 | 설명 |
|---|---|
| `game_id` | PK / conflict key |
| `rps_multiplier` | 가위바위보 보상 배수 (기본 4) |
| `roulette_multiplier` | 룰렛 보상 배수 (기본 5) |
| `dice_multiplier` | 주사위 보상 배수 (기본 7) |
| `updated_at` | 자동 갱신 |

### `luck_history` (신규 테이블)
| 컬럼 | 설명 |
|---|---|
| `id` | 자동증가 PK |
| `game_id` | 게임 ID |
| `user_id` | 플레이어 |
| `luck_type` | `rps` \| `roulette` \| `dice` |
| `amount` | 배팅액 |
| `matured_amount` | 획득액 (패배 시 0) |
| `is_win` | 승패 여부 |
| `created_at` | 플레이 시각 |

한 플레이어가 여러 번 플레이할 수 있으므로 **upsert 없이 매 플레이 INSERT**. 은행의 `round_num`, 퀴즈의
`game_id,user_id` 같은 충돌 키 개념이 없다 — 누적 획득액은 `SUM(matured_amount)`로 클라이언트에서 계산.

### `game_individual` 테이블 변경
- `luck_reward` 컬럼 신규 추가 (기존 `deposit_reward`, `quest_reward`와 동일한 역할)

### `js/supabase-client.js` 신규 함수 (기존 `sbBank*`/`sbQuiz*` 네이밍 컨벤션 그대로)
- `sbGetLuckState(gameId)` / `sbUpsertLuckState(gameId, fields)`
- `sbGetLuckHistory(gameId)` — 게임의 전체 플레이 기록 조회
- `sbInsertLuckHistory(gameId, userId, luckType, amount, maturedAmount, isWin)`
- `sbDeleteLuckHistory(gameId)` — 전체 초기화용
- `sbSaveLuckReward(gameId, userId, amount)` — `game_individual.luck_reward`에 누적 저장 (기존 `sbSaveDepositReward`/`sbSaveQuestReward`와 동일 패턴)

## 6. 상태 관리 & 최종 자산 반영

- **`js/luck.js`** 신규 파일. `_luck` 전역 객체로 은행/퀴즈와 동일한 구조 유지:
  `gameId`, `gameDate`, `sectionNum`, `multipliers{rps,roulette,dice}`, `players[]`,
  `currentPlayerIdx`, `selectedGame`, `bet.amount`, `earnedRewards{}` (플레이어별 누적 획득액 캐시)
- **`player` 객체에 `luckReward` 필드 추가** — 게임 종료 시(`finishGame()` → `recalculateAllRankings()`)
  기존 `depositReward`/`questReward`와 동일하게 최종 자산 합계에 가산되어 순위에 반영
- **다중 태블릿 동기화**: 은행/퀴즈와 동일하게 `_luckStartSync()`/`_luckStopSync()`가 3초 주기로
  `luck_state` + `luck_history`를 재조회해 로컬 상태(`earnedRewards`, 카드 표시용 누적액)를 재계산.
  `switchScreen()`에서 시작/중지되도록 연결
- **전체 초기화**: `luckReset()` → `sbDeleteLuckHistory(gameId)` + 모든 플레이어 `luckReward`를 0으로
  재계산·저장 (은행 `bankReset()` / 퀴즈 `quizReset()`과 동일 패턴). 개별 플레이 취소 기능은 만들지 않음
  (누적 획득액 개념이라 "이 한 건만 취소"가 의미 없음)
- 참가 횟수 제한/쿨다운 로직 없음 — 퀴즈의 `cooldowns{}` / `progress{}` 캡 메커니즘은 이식하지 않음

## 7. CSS 컨벤션

- 은행(`bank-screen-wrap` 초록 테마, `style.css:1279-1329`)과 퀴즈(보라 테마, `style.css:1232-1277`)의
  in-screen 오버라이드 패턴을 그대로 따라 `#luckView2 .bank-player-card`, `#luckView2 .bank-screen-title`
  등에 빨강 계열 색상을 적용
- 새 스타일 블록은 최근 추가된 화면들(`testReportScreen`/`eftiReportScreen`)의 `[화면 이름]` 브래킷
  주석 컨벤션을 따름: `/* [화면 행운] */`

## 8. 범위 밖 (Out of scope)

- 개별 플레이 취소/되돌리기 기능
- 참가 횟수 제한, 쿨다운 타이머
- 실제 자산(manualCash 등) 차감/배팅
- GAS(`gas/Code.js`) 연동 — 전부 Supabase 직접 연동으로 처리
