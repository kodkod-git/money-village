# 은행 팀 예금 우대 금리 설계 문서

**날짜**: 2026-05-14  
**브랜치**: feat/advanced-mode  
**대상 파일**: `js/bank.js`, `index.html`

---

## 1. 배경 및 목표

현재 은행 예금 기능은 팀/개인 탭이 동일한 `_bank.completed` 상태를 공유하여 동기화 문제가 발생한다. 또한 팀전 전용 우대 금리가 없다.

**목표**:
- 팀 예금과 개인 예금을 완전 독립 분리
- 팀전 시 우대 금리 설정 추가 (기본: 단기 1.5배, 중기 2.0배, 장기 2.5배)
- 팀 예금 진행 상태를 뱃지로 표시 (`[0/2]`, `[1/2]`, `[2/2]`)
- 팀원 전체 신청 완료 시 총 이자를 N분의 1로 균등 분배

---

## 2. 상태(State) 구조 변경

### 기존
```javascript
const _bank = {
    settings: { long: 2.0, mid: 1.5, short: 1.2 },
    completed: {},   // { [playerIdx]: { type } } — 팀/개인 혼용
    viewMode: 'team'
};
```

### 변경 후
```javascript
const _bank = {
    // 개인 배율 (기존)
    settings: { long: 2.0, mid: 1.5, short: 1.2 },

    // 팀 우대 배율 (신규)
    teamSettings: { long: 2.5, mid: 2.0, short: 1.5 },

    // 개인 예금 완료 추적 (기존 completed 대체)
    indivCompleted: {},
    // { [playerIdx]: { type: 'long'|'mid'|'short', amount: Number } }

    // 팀 예금 추적 (신규)
    teamDeposits: {},
    // {
    //   [team_name]: {
    //     type: 'long'|'mid'|'short' | null,   // 팀 공유 예금 종류
    //     members: { [playerIdx]: Number }       // 신청 완료된 팀원별 원금
    //   }
    // }

    viewMode: 'team',
    // ... 기타 기존 필드
};
```

---

## 3. 모달(배율 설정) UI 변경

팀전일 때(`_bank.players.some(p => p.team_name)`) 팀 우대 금리 섹션을 추가 표시한다.

### 레이아웃
```
[개인 이자 배율]              [팀 우대 금리]  ← 팀전 시에만 표시
단기 [－] 1.2배 [＋]         단기 [－] 1.5배 [＋]
중기 [－] 1.5배 [＋]         중기 [－] 2.0배 [＋]
장기 [－] 2.0배 [＋]         장기 [－] 2.5배 [＋]
```

### 함수 변경
- `bankAdjustRatio(type, delta)` → `bankAdjustRatio(type, delta, isTeam)` 파라미터 추가
- `_bankSyncRatioUI()` → 두 섹션 모두 동기화
- localStorage 저장: `mv_bank_settings`에 `teamSettings`도 포함

---

## 4. 플레이어 그리드 뱃지 (View 2)

### 팀 탭
- 팀 카드 헤더에 뱃지 표시: `[0/2]`, `[1/2]`, `[2/2]`
- 팀원 중 신청 완료된 인원 수 = `Object.keys(teamDeposits[team].members).length`
- `[2/2]` 상태: 팀 카드 전체 `team-done` 클래스 (기존 동작 유지)

### 개인 탭
- 개인 카드에 ✓ 표시: `indivCompleted[idx]`가 존재하면 완료 처리
- 기존 개인 완료 표시 로직 유지하되 `completed` 대신 `indivCompleted` 참조

---

## 5. 예금 신청 폼 (View 3) 팀 탭 동작

### 예금 종류 공유 (Type Sync)
- 팀원 1이 "장기" 선택 → `teamDeposits[team_name].type = 'long'` 저장
- 팀원 2가 폼을 열면 → `teamDeposits[team_name].type`을 읽어 "장기" 미리 선택
- 팀원 2가 종류를 변경하면 → 팀 전체 type 업데이트

### 미리보기 계산 (실시간)
```
팀 합산 원금 = Σ(teamDeposits[team].members의 완료된 금액들) + 현재 폼 입력 금액
팀 배율     = teamSettings[선택된 type]
팀 합산 만기 = 팀 합산 원금 × 팀 배율
```

**표시**: `"N,NNN원 → N,NNN원"` (팀 풀 기준)

예시:
- 팀원 1 완료(1,000원) + 팀원 2 입력 중(2,000원), 중기 2.0배
- 미리보기: `3,000원 → 6,000원`

- 팀원 1만 완료(1,000원), 팀원 2가 폼을 열었을 때 입력 전
- 미리보기: `1,000원 → 2,000원` (완료된 1,000원 + 현재 입력값 0원)

---

## 6. View 4 (신청 완료 화면) 팀 탭 동작

팀 탭에서 신청 완료 후 View 4는 다음을 표시한다:

| 항목 | 표시 내용 |
|---|---|
| 예금 종류 | 팀이 선택한 종류 (예: 중기 ⏳) |
| 예금자 | 본인 닉네임 |
| 내 원금 | 본인이 신청한 금액 |
| 팀 진행 상태 | 뱃지 (예: [1/2] — 아직 미완료) |
| 팀 합산 미리보기 | 현재까지의 합산 원금 → 합산 만기 |
| 각자 예상 보상 | 팀 완료 시 받을 이자 (현재 기준 예상값) |

**[2/2] 완료 시**: View 4에서 확정 보상(1인당 이자)을 표시하고, 다음 학생 버튼 제공.  
**[1/2] 미완료 시**: "나머지 팀원이 신청하면 보상이 확정됩니다" 안내 문구 표시.

---

## 7. 보상 저장 로직

### 트리거 조건
팀원 전체 신청 완료 시점: `Object.keys(teamDeposits[team].members).length === teamSize`

### 계산
```javascript
const totalPrincipal = Object.values(teamDeposits[team].members).reduce((a, b) => a + b, 0);
const ratio = _bank.teamSettings[teamDeposits[team].type];
const totalMatured = totalPrincipal * ratio;
const totalInterest = totalMatured - totalPrincipal;
const perMemberReward = Math.floor(totalInterest / teamSize);  // 1원 단위 내림
```

### 저장
팀원 전체에 `sbSaveDepositReward(gameId, nickname, perMemberReward)` 호출.

미완료 상태(1/2 등)에서는 DB 저장 없음. 뱃지만 업데이트.

---

## 8. 영향받는 함수 목록

| 함수 | 변경 유형 | 설명 |
|---|---|---|
| `bankAdjustRatio(type, delta)` | 수정 | `isTeam` 파라미터 추가 |
| `_bankSyncRatioUI()` | 수정 | 팀 배율 섹션 동기화 추가 |
| `bankStep1Complete()` | 수정 | `teamSettings` 로드/초기화 추가 |
| `_bankRenderPlayerList()` | 수정 | `indivCompleted`/`teamDeposits` 기반으로 뱃지 렌더링 |
| `bankSelectPlayer(idx)` | 수정 | 팀 탭이면 팀 type 미리 선택 |
| `bankPickType(t)` | 수정 | 팀 탭이면 `teamDeposits[team].type` 업데이트 |
| `_bankUpdatePreview()` | 수정 | 팀 탭이면 팀 합산 원금 기준 미리보기 |
| `bankStep2Submit()` | 수정 | 팀/개인 분기, 팀 완료 시 N분의 1 보상 저장 |
| `_bankLoad()` | 수정 | `teamSettings` localStorage 복원 |

---

## 9. HTML 변경 사항

### 모달 (`#bankModal`)
- 팀 우대 금리 카드 섹션 추가 (3개 배율 조절 UI)
- `id="bankTeamRatioSection"` - JS로 팀전 시에만 표시

### 플레이어 카드 (View 2)
- 팀 카드 헤더에 뱃지 span 추가: `<span class="team-badge">[0/2]</span>`

### 미리보기 박스 (View 3)
- 팀 탭 시 "팀 합산 원금 → 팀 합산 만기" 포맷으로 표시 (기존 개인 포맷과 동일 엘리먼트 재사용)

---

## 10. 미결 사항 없음

- 팀 크기: 퀴즈 로직과 동일하게 `Object.keys(teamDeposits[team].members).length`와 팀 실제 인원 수(`_bank.players.filter(p => p.team_name === team).length`) 비교로 처리
- 1원 미만 소수점: `Math.floor`로 내림 처리
- 팀원 중도 취소: 현재 버전에서는 취소 기능 없음 (기존 정책 유지)
