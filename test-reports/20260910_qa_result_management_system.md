# 머니빌리지 통합관리시스템 QA 결과 리포트 (2026-09-10)

> 대상 제안서: `proposal/20260910_qa_simulation_proposal_management_system.md` (테스트 모드 미사용 개정판)
> 신규 기능 제안서: 없음 (전체 기준선 회귀 QA)

---

## 0. ⚠️ 정리(Cleanup) 현황 — 최우선 확인 항목

| 항목 | 값 |
|---|---|
| 생성한 QA 게임 game_id | **`6e998112`** (basic, individual, 4인, is_test=false, 2026-09-10 · 02분반) |
| Supabase 정리 | **✅ 완료** — `sbDeleteGame` + `sbDeleteLuckHistory` 실행 후 16개 테이블 전수 스윕에서 `luck_state` 1건 잔존 확인 → 수동 `_sb.from('luck_state').delete()`로 제거. 최종 재검증: 전 테이블 0건. |
| 등록한 QA 시민권자 | `QA1`/`QA2`/`QA3`/`QA4` (실명 QA일·QA이·QA삼·QA사, is_citizen=true) |
| `sbDeleteCitizen` 정리 | **✅ 완료** — 4명 삭제, `users` 테이블 QA 로우 0건 재확인 |
| HoF 엔트리 수 | 정리 후 52건(기준선 복원 확인) |
| **Drive 수동 삭제 필요 파일** | **1건 — 아래 목록. 사용자가 직접 삭제해야 함 (자동 삭제 불가)** |

### Drive 수동 삭제 필요 파일 (사용자가 직접 삭제)

| 파일명 | 폴더(category) | 업로드 시각(UTC) | 링크 |
|---|---|---|---|
| `20260910_최종순위.pdf` | 자산리포트(`asset_report` → ASSET_FOLDER_ID) | 2026-09-10 07:55:50Z (KST 16:55) | https://drive.google.com/file/d/1dLZ0gR3WSUhMpXCAgvxhEpsCwuzvPP4j/view |

> ⚠️ 파일명에 QA 식별자가 없음(날짜+"최종순위"만) — 같은 날짜의 실제 요약 PDF와 구분 불가. 위 **정확한 링크로 삭제** 권장. GAS(`gas/Code.js`)에 파일 삭제 액션이 없어 자동 정리 불가(§2.2-4). 개인별 자산리포트/명예의전당 PDF는 프로덕션 오염 최소화를 위해 **드라이브 업로드를 실행하지 않고 로컬 생성(base64)만 검증**함.

### 세션 시작 시점 관찰
- QA 시작 전 이미 `2026-09-10` 날짜에 게임 1건 존재: `game_id=20dfb225`, 2인, 팀전, basic, `is_test=false`, 참가자명 `참가자1/참가자2`. 이전 QA 세션 정리 누락으로 추정되나 실제 운영 데이터일 가능성도 배제 못 해 **이번 세션에서 건드리지 않음**. (§7 이슈로도 기록)
- Hall of Fame 개인 엔트리 수(기준선): 52 → 정리 후 52 복원
- 전체 게임 날짜 수: 12 (2026-09-18, 2026-09-10 포함) — QA 게임은 기존 2026-09-10에 02분반으로 추가되어 날짜 수 불변

---

## 1. 테스트 환경

| 항목 | 값 |
|---|---|
| 테스트 일시 | 2026-09-10 |
| 환경 | 로컬 정적 서버 (patched) — `http://localhost:8899` |
| 서버 비고 | `index.html`의 사이트 비밀번호 게이트(`prompt()`)가 자동화(Claude in Chrome) 렌더러를 정지시켜, QA 전용 Node 서버가 `/`·`/index.html` 응답에서 `checkAuth()`를 no-op으로 패치. 실제 `index.html` 파일·프로덕션 배포 무변경. |
| Supabase | 프로덕션 `tsegahxwrpldpwldwwfh.supabase.co` (schema: `management`) |
| 테스트 변형 | basic (주 대상) + advanced/rich_vessel 스팟체크 |
| adminScreen / Arduino / 실제 Drive 업로드 정리 | §범위 제외 (제안서 1장) |

---

> **수정 상태 (2026-09-10, 같은 세션):** S-1 / B-1 / B-2 / L-1 / L-2 코드 수정 완료 — §8 참조. S-2는 QA 문서(제안서) 관행 사항이라 코드 변경 없음. L-3(행운 패배 시 luck_reward 음수)은 부스 실시간 배지의 의도된 순손익 표시라 변경 없음.

## 2. 정적 코드 리뷰로 사전 확인된 이슈

| # | 심각도 | 요약 |
|---|---|---|
| S-1 | 높음(격상: 중간→높음) | `sbDeleteGame(gameId)` 삭제 테이블 목록에 `luck_history`/`luck_state` 누락. `js/supabase-client.js:905-913`. **브라우저에서 라이브 재현**: `sbDeleteGame('6e998112')` 실행 후 14개 대상 테이블은 모두 0건이 됐으나 `luck_history`·`luck_state`는 각각 1건 잔존. UI "과거 게임 삭제"(`confirmDeletePastGame`, `js/report.js:1227`)도 `sbDeleteGame`만 호출하므로 동일. **추가 발견**: 제안서가 안내하는 우회책 `sbDeleteLuckHistory(gameId)`는 `luck_history`만 지우고 **`luck_state`는 지우지 않음**(`js/luck.js:866`). 즉 `luck_state`를 정리하는 함수가 코드 어디에도 없음 → 행운 부스를 쓴 게임은 삭제 후에도 `luck_state` 1행이 영구 고아로 남음. |
| S-2 | 정보 | `_nick()`(`supabase-client.js:26`)이 닉네임을 「문자·숫자만, 5자」로 절단. `QA_테스트1` 같은 접두어 규칙은 5자 초과분이 잘려 다수 참가자가 동일 닉네임(`QA테스트`)으로 충돌 → QA 참가자는 `QA1`~`QA4`처럼 5자 이내 고유값 사용 필요. 제안서 2.1의 `QA_` 접두어 지침과 실제 제약이 상충. |

### 브라우저 검증으로 새로 발견한 이슈

| # | 심각도 | 화면/기능 | 요약 |
|---|---|---|---|
| B-1 | **높음** | 은행 관리자 · 데이터 초기화 | `bankReset()`(`js/bank.js:658`)가 `sbDeleteBankHistory`로 `bank_history`만 지우고 **`game_individual.deposit_reward`는 0으로 되돌리지 않음**. 초기화 후에도 이전 예금 보상이 남아 결과 발표 시 최종 자산·명예의 전당에 유령 보상이 합산됨. 대조: `quizReset()`(`quiz.js:633`)·`luckReset()`(`luck.js:342`)는 보상을 명시적으로 0으로 리셋함. 재현: QA1 예금 신청(보상 30,000) → 은행 데이터 초기화 → `bank_history` 0건이나 `deposit_reward` 30,000 잔존. |
| B-2 | 낮음 | 은행 관리자 · 라운드 전환 | `bankAdvanceRound()`/`bankGoBackRound()`가 `sbUpsertBankState({current_round})`를 await 없이 발사하고, 동시에 3초 폴링(`_bankMergeRemoteState`)이 `_bank.currentRound = remoteRound`로 로컬 상태를 DB값으로 덮음. 확인 대화상자를 무시하고 라운드를 초 단위로 연속 전환하면 전환 1건이 유실됨(1→2→3→4 시도가 3에서 멈춤). 실제로는 각 전환마다 네이티브 confirm이 있어 사람이 이 속도로 조작하기 어려움 → 낮음. |
| L-1 | 중간 | 행운 · 플레이어 배팅 금액 | `luckSelectPlayer()`가 `_luck.bet`을 초기화하지 않음. A 참가자가 14,000원 배팅 후, 다음 참가자 B를 선택하면 **B의 배팅 시작값이 14,000원으로 이월**됨(재현 확인). 대조: 은행 `bankSelectPlayer()`는 해당 참가자 본인의 이전 금액 또는 0으로 복원. 키오스크에서 참가자가 빠르게 교대하는 상황이라 오배팅 위험. 배팅 확정에 확인 단계도 없음. |
| L-2 | 낮음(현장) / QA제약 | 행운 · 주사위·룰렛·가위바위보 애니메이션 | 주사위 결과 판정(`luckDiceStop`→`settle`)이 `requestAnimationFrame` 루프에 의존. 해당 탭이 **백그라운드면 rAF가 멈춰 결과가 확정되지 않고**(`_luckResolve` 미실행 → `luck_history`/`luck_reward` 미기록) 배팅만 "제출"된 상태로 방치됨. 룰렛은 `setTimeout`(1.4s)이라 백그라운드에서도 동작, 가위바위보는 즉시 동기 판정이라 안전. 현장 아이패드는 항상 포그라운드이므로 field 영향은 작으나, 운영자가 앱 전환 시 배팅이 붕 뜰 수 있음. (이 제약으로 QA 자동화에서 주사위·룰렛의 승패 로직은 부분 검증) |

---

## 3. 테스트 수행 방식 / 커버리지 한계

- Claude in Chrome으로 실제 브라우저(로컬 patched 서버)에서 조작·검증. 화면 전환·모달 열기는 앱의 실제 onclick 함수를 호출하고, 입력·클릭·상태는 DOM·스크린샷·Supabase 실데이터로 확인.
- **네이티브 `confirm`/`alert`/`prompt`**: 페이지 로드 직후 `window.confirm/alert/prompt`를 자동 승인·로깅용으로 오버라이드(제안서 8장). 실제로 뜬 문구는 모두 캡처해 각 항목에 기록. (초기에 오버라이드 전 "닫기"를 잘못 눌러 렌더러가 1회 정지 → 사용자가 수동 해제)
- **탭 구성**: 메인 진행자 탭 + 부스 탭. 완전 동시 4탭 상시 운영 대신, 은행은 부스탭+진행자탭 2탭으로 크로스탭 폴링을 검증하고, 퀴즈·행운은 부스탭 단독으로 기능 검증(폴링 병합 로직은 동일 코드 경로).
- **부분 검증 항목**: (a) 행운 주사위/룰렛 애니메이션 승패 — 백그라운드 탭 rAF 정지(L-2)로 자동화 한계, 가위바위보로 보상 흐름 검증. (b) PDF "출력"(`window.print`) — 자동화에서 프린트 다이얼로그 위험으로 미실행, 생성 파이프라인(base64)까지만 검증. (c) 콘솔 에러 스트림 — 확장 콘솔 추적이 이 세션에서 안정적으로 캡처되지 않아, JS 반환값·네트워크 상태코드·dialog 로그로 대체 확인(치명 에러 미발견).
- advanced/rich_vessel은 게임 생성 없이 UI 스위칭만 스팟체크(프로덕션 오염 최소화).

---

## 4. 4장 체크리스트 결과 (페르소나별 Pass/Fail/Skip)

### 4.1 메인 진행자

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 게임설정 · 변형 전환 | **Pass** | 모달 2단계에서 basic→"📈 주식 가격 설정", 6종 티커(SASUNG/LGI/SKEI/CACAO/HYUNDE/NABER); advanced→"부동산 가격 설정", 6종(가온개미 단독주택 등). countingScreen에서도 basic은 주식 6종+traits(성실왕 등), 표시 정상. |
| 2 | 주식/부동산 가격설정 | **Pass** | 기본가(SASUNG 1,500 등 CLAUDE.md 값) 로드. 계수화면 주식수량×가격이 리포트 총자산에 정확 반영(QA1 SASUNG 10개=15,000). |
| 3 | 명단입력 / 시민권자 관리 | **Pass** | 인라인 등록폼: 빈 값 제출→"실명을 입력해주세요" 인라인 에러(DB호출 없음). QA1~QA4 등록 성공(is_citizen=true). 중복 닉네임(QA1 재등록)→"이미 존재하는 닉네임입니다" 차단. |
| 4 | 시민권자 불러오기 | **Pass** | 명단행 콤보에서 QA1~QA4 검색·선택→"불러오기"로 실명/닉네임/EFTI 자동 채움(QA1=FAEN, 나머지 "-"), 이름 필드 잠금(loadedCitizen). 코드상 미일치 시 "일치하는 시민권자를 찾을 수 없습니다" alert(applyCitizenToRow). |
| 5 | 테스트 모드 OFF로 게임 시작 | **Pass** | 모달 기본값 "실제"(비테스트) 선택 확인. 개인전·basic·4인으로 시작 → `game_id=6e998112` 생성, countingScreen 전환, `players[]` 4명·userId 배정 확인. |
| 6 | 자산 입력 | **Pass** | 참가자별 현금/성실활동금/주식수량/traits 입력, "저장 후 다음" 이동. QA사는 값 비운 채 통과 가능(total 0). 이전 참가자로 복귀 시 입력값·trait 버튼 상태 복원(QA1: 50000/10000/SASUNG10/성실왕·투자왕). |
| 7 | 결과 발표 | **Pass** | 종료확인 모달(인페이지) → 순위 재계산. rankIndiv 정확: QA일75k(1)·QA이55k(2)·QA삼32k(3)·QA사0(4). |
| 8 | 자산리포트 결과 확인 | **Pass** | reportScreen 개인 리포트(1/4), 닉네임·실명·EFTI·총자산·현금비중 도넛·주식 포트폴리오 모두 입력값과 일치. 공식 라벨 "현금+주식+성실활동금+예금+퀘스트"(행운 제외). |
| 9 | 자산리포트 PDF / 드라이브 저장 | **Pass** | `getPdfBase64FromElement` ~450KB PDF 정상 생성(input→span 치환 동작). "드라이브 저장"(결과 요약) 실제 실행 → GAS `uploadPDF` POST 200, `fileUrl` 반환, "✅ 드라이브에 저장됐습니다". **업로드 파일 = §0 Drive 목록**. |
| 10 | 게임 불러오기 | **Pass**(주의) | 은행/퀴즈/행운 모달의 과거게임 목록에 QA 게임이 "02분반 QA일,QA이,QA삼,QA사"로 노출, 🧪 태그 없음(테스트 모드 미사용이므로 정상). preview_names로 식별해 선택. → **실제 운영 게임과 시각적으로 동일**, 오선택 방지책은 이름 확인뿐(제안서 인지 사항). |
| 11 | 자산 수정 | **Skip(부분)** | 불러오기 후 `countingScreen` 재편집 경로는 통합 시나리오(§5-5)에서 신규 게임 계수로 대체 검증. 참가자 명단 수정(`applyPlayerEdits`) 미실시. |
| 12 | 명예의 전당 확인 | **Pass** | 결과 발표 직후 HoF 개인 엔트리 52→56, QA1~QA4(game_id 6e998112) 노출. **정리(`sbDeleteGame`) 후 52로 복원, QA 엔트리 사라짐** — "테스트 모드 없이도 정리 후 사라진다"는 개정 체크포인트 충족. |
| 13 | 명예의 전당 PDF/드라이브 | **Skip** | 프로덕션 Drive 오염 최소화를 위해 명예의전당 PDF 업로드 미실행. 코드 경로는 자산리포트 업로드와 동일(§4.1-9에서 GAS 200 확인). |
| 14 | 잠재력 테스트 / EFTI 유형 보고서 | **Pass** | `testReportScreen`: Smore 설문결과 JSONP 로드 성공(20260829_손예림… 목록). `eftiReportScreen`: 빈 이름/나이 → "이름을 입력해주세요"/"나이를 입력해주세요" alert. **두 기능 모두 게임 데이터(Supabase)와 무관** — JSONP·이미지 오버레이만 사용, 정리 대상 아님 확인. |

### 4.2 은행 관리자

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 이자배율설정 | **Pass** | 장기 2.0→3.0, 단기 1.2→1.5 조정 → `localStorage.mv_bank_settings` 및 Supabase `bank_state` 양쪽 저장 확인. |
| 2 | 라운드 관리 | **Pass**(B-2 참고) | 1→2 전진, 2→1 복귀(스냅샷 복원), 2→3→4(종료) 모두 정상. confirm 문구 확인. 단, 확인 무시 초고속 연속 전환 시 1건 유실(B-2, 낮음). |
| 3 | 은행진행현황 확인 | **Pass** | 진행자 탭 은행화면에서 부스 탭의 QA1/QA2 신청이 "신청완료"로 표시. 부스탭 QA3 신청 후 진행자탭이 **3초 폴링으로 ~5초 내 자동 반영**. |
| 4 | 데이터 초기화 | **Fail (B-1)** | confirm 표시·`bank_history` 삭제·라운드 1 복귀·**다른 게임(20dfb225) 미영향**은 정상. 그러나 `game_individual.deposit_reward`가 0으로 리셋되지 않음 → 유령 보상(B-1, 높음). |
| 5 | 마감 | **Pass** | 3라운드에서 "예금 신청 종료" → round 4, 버튼 "종료됨" 비활성, 참가자 카드 `is-disabled`. |

### 4.3 퀴즈 관리자

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 보상설정 | **Pass** | 개인 보상 100,000원 → `quiz_state.indiv_reward` 저장. |
| 2 | 퀴즈진행현황 확인 | **Pass** | QA1 [2/2] 완료·QA2 오답(쿨다운) 상태가 `quiz_history`(indiv_progress / indiv_failed_at)에 기록, 목록 배지 반영. |
| 3 | 데이터 초기화 | **Pass** | confirm 표시, `quiz_history` 삭제 **및 `quest_reward` 전원 0 리셋**(B-1과 달리 정상 처리). |
| 4 | 마감 | **Pass** | confirm, `quiz_state.is_closed=true`, 버튼 "마감됨" 비활성. |

### 4.4 행운 관리자

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 보상설정 | **Pass** | 기본 배수 가위바위보 4 / 룰렛 5 / 주사위 7 — **제안서 명시값과 정확히 일치**. 주사위 7→10 조정 → `luck_state.dice_multiplier` 저장. |
| 2 | 행운진행현황 확인 | **Pass** | QA1 RPS 승(+40,000) 배지, `luck_history`(luck_type/amount/matured_amount/is_win) 기록 확인. |
| 3 | 데이터 초기화 | **Pass** | "이전에 기록되었던 모든 데이터가 삭제됩니다" confirm, `luck_history` 삭제 **및 `luck_reward` 전원 0 리셋**(정상). |
| 4 | 마감 | **Pass** | "행운 게임을 마감합니다…" confirm, `luck_state.is_closed=true`, 버튼 "마감됨" 비활성. |

### 4.5 게임 플레이어 (부스 공용 화면)

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | (은행) 개인 예금 신청 | **Pass** | QA1 10,000원 장기 → 미리보기 "10,000원 → 💰 30,000원"(×3.0), `bank_history` amt10000/matured30000, `game_individual.deposit_reward`=30000. 팀 모드는 미검증(개인전 게임). |
| 2 | (은행) 신청내역 삭제 | **Pass** | `bankResetEntry` → confirm, `bank_history` 해당 행 삭제, `deposit_reward` 재계산(0), 재신청 가능. |
| 3 | (은행) 라운드별 상태 확인 | **Pass(부분)** | 진행자탭 폴링이 라운드 전환을 반영(`current_round`). 참가자 카드의 라운드별 이전 신청 표시는 팀 모드 위주 로직이라 개인전에서 부분 확인. |
| 4 | (퀴즈) 풀이 / 정오답 / 재응시 | **Pass** | QA1 basic/indiv Q1·Q2 정답(`_QUIZ_CONFIG` answers 대로) → "맞았습니다! 🎉", progress 1→2, `quest_reward` 200,000(2×100,000). QA2 오답 → "틀렸습니다!", 재도전 버튼, `indiv_failed_at` 기록(쿨다운). |
| 5 | (퀴즈) 풀이 현황 확인 | **Pass** | 목록 배지 [2/2]/쿨다운/오답 상태 표시. |
| 6 | (행운) 게임 진행 | **Pass(부분)** | 가위바위보: 배팅 UI(예금 신청서와 유사) → 승패 즉시 동기 판정 정상(강제 승리 시 40,000 지급). 주사위/룰렛: 백그라운드 탭 rAF 정지(L-2)로 자동화 판정 불가 — 코드상 룰렛=setTimeout, 주사위=rAF settle. |
| 7 | (행운) 베팅 결과 확인 | **Pass**(설계 상이 주의) | 승리 시 `matured=bet×배수` 지급, 패배 시 결과화면 "0원". 단 `game_individual.luck_reward`는 패배 시 **-bet 만큼 감산**되어 누적(예: 14,000 배팅 패→ luck_reward -14,000). 제안서 "졌을 때 미지급(0)" 기대와 다르나, **행운 보상은 총자산 계산에서 의도적으로 제외**(§6 참고)되어 순위 영향 없음. |

---

## 5. 5장 통합 시나리오 결과

실제 행사 흐름(시민권자 등록 → 명단 → 게임 시작 → 부스 3종 운영·참가자 조작 → 진행자 계수 → 마감 → 결과 발표 → 정리)을 basic 개인전으로 재현.

| 단계 | 결과 |
|---|---|
| 1. 진행자: 시민권자 등록·불러오기·게임 시작(테스트 모드 OFF) | Pass — `game_id 6e998112` 기록 |
| 2~3. 부스 3종 설정 + 참가자 조작 | Pass — 은행(QA1/2/3 예금), 퀴즈(QA1 [2/2], QA2 오답), 행운(QA1 RPS 승) |
| 4. 진행자 탭 실시간 진행현황 | Pass — 3초 폴링으로 크로스탭 반영 확인(은행) |
| 5. 게임 불러오기 → 계수 입력 | Pass(부분) — 신규 게임 계수로 검증(불러오기 재편집은 §4.1-11 Skip) |
| 6. 부스 마감 | Pass — 은행/퀴즈/행운 각 마감, 신규 참여 차단 |
| 7. **결과 발표 — 부스 보상 최종 합산** | **핵심 검증**: `total = 현금 + 주식 + 성실활동금 + deposit_reward + quest_reward` 정확 합산 확인. QA일 = 75,000(계수) + 30,000(예금) + 200,000(퀴즈) = **305,000** ✓. QA이 = 55,000 + 60,000 = 115,000 ✓. **행운 보상은 합산되지 않음(설계 의도, §6).** ⚠️ QA삼은 예금 보상 15,000이 `bank_history` 없이 total(47,000)·HoF에 반영 — **B-1(은행 초기화 후 유령 보상)의 실제 파급을 통합 흐름에서 확인**. |
| 8. PDF/드라이브 + 명예의 전당 노출 | Pass — 요약 PDF Drive 업로드(GAS 200), HoF에 QA 게임 노출(정리 후 소멸 확인) |
| 9. 정리 | Pass(수동 보정) — `sbDeleteGame` + `sbDeleteLuckHistory` 후 `luck_state` 1건 잔존 → 수동 삭제. citizen 4명 삭제. 전 테이블·HoF·목록 재확인 클린. Drive 1파일 수동 삭제 필요. |

---

## 6. 신규 기능 스펙 대비 구현 상태 / 제안서-구현 불일치

신규 기능 제안서는 첨부되지 않았으나, QA 중 **제안서 기대치와 현재 구현이 다른 지점**을 발견:

- **행운 보상의 총자산 합산**: 제안서 §4.5-7·§5-7은 "행운 보상이 최종 자산에 정확히 합산되는지"를 기대. 그러나 `docs/superpowers/specs/2026-07-13-luck-reward-exclude-total-design.md`에 따라 **행운 상금은 현장에서 실물 현금 지급 → 계수 시 `manualCash`에 이미 포함되므로 이중계산 방지를 위해 총자산 공식에서 의도적으로 제외**됨(`app.js`·`report.js` 6곳). `luck_reward` 컬럼은 기록용으로만 유지. → 제안서 기대치를 현재 설계에 맞게 갱신 필요(행운은 deposit/quest와 달리 합산 안 함).

---

## 7. 발견 이슈 전체 목록 (7장 형식)

| 역할 | 화면/기능 | 재현 경로 | 기대 동작 | 실제 동작 | 심각도 | 비고 |
|---|---|---|---|---|---|---|
| 공통/정리 | `sbDeleteGame` | 행운 부스 사용 게임에서 `sbDeleteGame(gid)` 실행 후 전 테이블 스윕 | 해당 게임의 모든 테이블 행 삭제 | `luck_history`·`luck_state` 잔존. `sbDeleteLuckHistory`도 `luck_state`는 미삭제 → `luck_state` 정리 함수가 코드에 없음 | **높음** (정리 관련 → 격상) | `js/supabase-client.js:905`, `js/luck.js:866`. UI "과거 게임 삭제"도 동일 |
| 은행 관리자 | 데이터 초기화 | QA1 예금(보상 30,000) → 은행 데이터 초기화 → 결과 발표 | `deposit_reward`도 0으로 리셋 | `bank_history`만 삭제, `deposit_reward` 30,000 잔존 → 최종 total·HoF에 유령 합산(QA삼 통합 흐름에서 확인) | **높음** | `js/bank.js:658` `bankReset()`. `quizReset`/`luckReset`엔 보상 리셋 있음 |
| 행운 플레이어 | 배팅 금액 이월 | QA2 14,000원 배팅 후 QA3 선택 | 새 참가자 배팅 시작값 0(또는 본인 이전값) | QA3 배팅 시작값 14,000원으로 이월(`_luck.bet` 미초기화) | 중간 | `js/luck.js` `luckSelectPlayer`. 은행 `bankSelectPlayer`는 본인값/0 복원 |
| 행운 플레이어 | 주사위/룰렛 애니 판정 | 부스 탭이 백그라운드일 때 주사위 배팅·정지 | 결과 확정·기록 | `luckDiceStop`의 rAF settle 루프가 백그라운드 탭에서 멈춰 `_luckResolve` 미실행 → `luck_history`/`luck_reward` 미기록, 배팅만 제출 상태 | 낮음(현장) | `js/luck.js:783`. 룰렛(setTimeout)·가위바위보(동기)는 안전 |
| 은행 관리자 | 라운드 전환 | confirm 무시 초고속 연속 전환 1→2→3→4 | round 4 도달 | round 3에서 멈춤(미await `sbUpsertBankState` + 3초 폴링의 `current_round` 역덮어쓰기 경합) | 낮음 | `js/bank.js` `bankAdvanceRound`. confirm이 있어 실사용 재현성 낮음 |
| 행운 플레이어 | 베팅 결과(패배) | 배팅 후 패배 | "미지급"(0) | `luck_reward` 누적값이 -bet 만큼 감산(음수 가능) | 낮음(정보) | 총자산에서 제외되어 순위 무영향(§6). 기록·HoF 표시상 음수 노출 가능성 |
| 진행자 | 게임 불러오기 목록 | 세션 시작 시 2026-09-10 조회 | — | QA 시작 전 이미 `game_id 20dfb225`(참가자1/2, 2인 팀전, is_test=false) 존재 — 이전 QA 정리 누락 추정. **이번 세션 미변경** | 정보 | 실제 운영 데이터일 가능성도 있어 미삭제. 사용자 확인 권장 |
| 인프라 | `index.html` 비밀번호 게이트 | 자동화 도구로 페이지 로드 | — | 최상단 인라인 `prompt()`가 렌더러를 동기 정지시켜 Claude in Chrome이 스크린샷·JS·네트워크 조회 전부 불가. 세션 1회 완전 정지(사용자 수동 해제) | 정보(QA 인프라) | QA 시 게이트 우회 서버 필요. 실사용엔 정상 보안 기능 |

### Pass 요약
- 시민권자 CRUD·검증, 게임 생성/계수/순위/리포트, PDF 생성, GAS Drive 업로드(200), HoF 노출·정리 후 소멸, 은행/퀴즈/행운 설정 저장·진행현황·3초 크로스탭 폴링·마감, 퀴즈 정오답·쿨다운, 행운 가위바위보 판정·보상, EFTI/잠재력 보고서 독립성, admin 비밀번호 게이트 — 모두 정상.

### 콘솔/네트워크
- Supabase REST 호출 전부 200. GAS `uploadPDF` POST 200. 치명적 JS 에러 미발견(단, 확장 콘솔 스트림 캡처 불안정 — §3 참고).

---

## 8. 수정 내역 (2026-09-10, 동일 세션)

| 이슈 | 파일 | 변경 |
|---|---|---|
| **S-1** | `js/supabase-client.js` `sbDeleteGame` | 삭제 테이블 목록에 `'luck_history'`, `'luck_state'` 추가. 이제 게임 삭제(UI "과거 게임 삭제" 포함)가 행운 데이터까지 정리. `sbDeleteLuckHistory`는 `luckReset()`이 설정(`luck_state`)은 보존해야 하므로 의도적으로 그대로 둠. |
| **B-1** | `js/bank.js` `bankReset()` | `bank_history` 삭제 후 `_bank.players` 전원에 대해 `sbSaveDepositReward(gameId, user_id, 0)` 호출 추가 (`quizReset`/`luckReset`과 동일 패턴). 초기화 후 유령 예금 보상 제거. |
| **L-1** | `js/luck.js` `luckSelectPlayer()` | 참가자 선택 시 `_luck.selectedGame = null`, `_luck.bet = { amount: _LUCK_DEFAULT_BET }`로 초기화. 새 상수 `_LUCK_DEFAULT_BET = 1000` 도입, `_luck` 초기값도 이 상수 사용. 이전 참가자 배팅/게임 선택이 다음 참가자로 이월되지 않음. |
| **L-2** | `js/luck.js` `luckDiceStop()` | 결과 확정(`_luckResolve`)을 rAF `settle` 루프 밖의 `setTimeout(duration+50)`으로 이동. rAF는 시각 애니메이션만 담당. 탭이 백그라운드여도 배팅이 정상 확정됨. 룰렛은 이미 `setTimeout`, 가위바위보는 동기라 변경 불필요. |
| **B-2** | `js/bank.js` `bankAdvanceRound()`·`bankGoBackRound()`·`_bankMergeRemoteState` | 두 함수를 `async`로 바꿔 `sbUpsertBankState({current_round})`를 `await`. 라운드 변경 시 `_bank._roundChangedAt` 타임스탬프 기록, 폴링 병합은 최근(2.5초 내) 로컬 변경이 있으면 stale 원격 라운드로 되돌리지 않음. |

- **변경 없음(의도된 동작)**: S-2(QA 문서 관행), L-3(행운 패배 시 `luck_reward` 음수 — 부스 실시간 순손익 배지의 의도된 표시, 총자산에서 제외됨), `index.html` 비밀번호 게이트(정상 보안 기능), `game_id 20dfb225`(운영 데이터 가능성 — 사용자 판단).
- **회귀 테스트**: `tests/qa-20260910-fixes.test.js` 추가 (5개 수정 전부 검증). 전체 스위트 PASS 15 / FAIL 3(기존 실패 `efti-report-screen`·`fame-awards`·`fame-rich-vessel-columns` — style.css/명예의전당 마크업, 이번 수정과 무관).
- **라이브 브라우저 재검증 (2026-09-10, 검증용 게임 `665a3b32` / 시민권자 `QAV1`·`QAV2` 생성 후 정리)**:
  - **B-1 PASS** — QAV1 예금(deposit_reward 30,000) → `bankReset()` → `bank_history` 0건 **및 `deposit_reward` 전원 0** 확인.
  - **S-1 PASS** — 게임에 `bank_*`/`luck_history`/`luck_state` 데이터 심은 뒤 `sbDeleteGame('665a3b32')` → 16개 테이블 전수 스윕 **orphan 0건** (`luck_history`·`luck_state` 포함 전부 삭제).
  - 검증용 게임·시민권자 정리 완료, HoF 52 불변, Drive 신규 업로드 없음.
  - L-1 / L-2 / B-2는 자동화 타이밍 제약으로 정적·테스트 검증만 (코드 변경 단순).
