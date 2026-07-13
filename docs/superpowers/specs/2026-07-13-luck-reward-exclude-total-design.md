# luckReward를 총자산 계산에서 제외

## 1. 배경 / 문제

행운(luck) 게임에서 이긴 학생은 상금을 그 자리에서 실물 현금으로 지급받는다. 계수(counting) 화면에서
직원이 학생이 들고 있는 실제 지폐를 세어 `manualCash`에 입력하므로, 행운 상금은 이미 `manualCash`에
포함된다. 그런데 현재 총자산 공식은 `manualCash`와 별개로 `p.luckReward`를 한 번 더 더하고 있어
**이중 계산**이 발생한다.

`depositReward`/`questReward`는 실물 현금으로 지급되지 않는 순수 보너스 항목이라 총자산에 더하는 것이
맞지만, `luckReward`는 성격이 다르다.

## 2. 설계

총자산(`p.total`) 계산 공식에서 `+ (p.luckReward || 0)` 항만 제거한다. 대상은 6곳:

| 파일 | 위치 |
|---|---|
| `js/app.js` | `applyInputsToPlayer` — `base` 계산 |
| `js/app.js` | `recalculateAllRankings` — `base` 계산 |
| `js/report.js` | `refreshDisplayOnly` — `base` 계산 |
| `js/report.js` | 과거 게임 리로드 후 재계산 (advanced/rich_vessel 분기) |
| `js/report.js` | 과거 게임 리로드 후 재계산 (basic 분기) |

**유지되는 것 (변경 없음):**
- `luck_state` / `luck_history` 테이블, `game_individual.luck_reward` 컬럼 — 스키마 변경 없음
- `sbSaveLuckReward` / `sbGetRewardsByGameId` 등 저장·조회 로직 — 그대로 `p.luckReward`를 채움 (기록용)
- `js/luck.js`의 실시간 획득 배지(`luck-earned-badge`, 플레이어 목록에 `+32,000원` 표시) — `p.total`과
  무관하게 `_luck.earnedRewards`를 직접 참조하므로 영향 없음
- `js/report.js`의 보상 fetch/저장/과거 게임 복원 로직 (`p.luckReward = ...` 대입 자체) — 값 자체는
  계속 로드·저장하되, 총자산 공식에서만 더하지 않음

## 3. 영향 범위

- 총자산/순위(`rankIndiv`, `rankTeam`, `teamTotal`)가 낮아지는 학생: 이전에 행운 게임에서 상금을
  받은 적이 있는 학생. 이중 계산이 제거되므로 정확한 값으로 보정된다.
- 신규 게임(luckReward가 아직 없는 게임)은 영향 없음.
- DB 스키마/마이그레이션 변경 없음.

## 4. 테스트

기존 `tests/luck-reward-integration.test.js`가 "총자산 공식에 luckReward 포함"을 검증하고 있으므로,
이 검증을 반대로(= 포함되지 않아야 함) 수정한다.
