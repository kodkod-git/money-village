# 주사위 눈금 맞추기 — 3D 모델 연출 설계

## 배경

행운(luck) 미니게임의 주사위 눈금 맞추기는 현재 `image/luck/dice_spin.gif`(회전 연출용 GIF)와 `image/luck/dice_face_1~6.png`(결과 정적 이미지)로 구현되어 있다 (`docs/superpowers/plans/2026-07-08-luck-page.md` Task 14). 사용자가 실제 3D 다이스 모델(GLB 파일)을 확보하면서, GIF+정적 이미지 방식 대신 3D 모델이 실제로 해당 눈금 방향으로 회전하며 멈추는 연출로 교체하기로 했다.

## 목표

- 3D 모델(GLB)이 화면에서 계속 회전(굴러가는 연출) → 멈춤 클릭 시 정확한 눈금이 위를 향하도록 감속하며 회전 정지 → 잠시 대기 후 결과 화면 전환
- 결과의 정확성은 100% 보장되어야 한다 (평면 이미지 폴백 없이, 모델 자체가 곧 결과 화면이므로)
- 기존 RPS/룰렛 엔진의 공유 정리(cleanup) 아키텍처(`_luckResetGameImg()`)를 그대로 재사용해 동일한 리소스 누수 버그가 세 번째로 재발하지 않도록 한다

## 아키텍처

### 라이브러리

`<model-viewer>` (Google 웹 컴포넌트)를 CDN으로 로드한다:

```html
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
```

기존 `html2pdf.js`, Kakao SDK, Supabase JS와 동일하게 CDN `<script>` 태그 패턴을 따른다. 빌드 스텝이 없는 이 프로젝트 구조에 맞다.

### DOM 구조

`index.html`의 `#luckView5` 안에 기존 `#luckGameImg`(`<img>`)와 같은 자리에 새 엘리먼트를 추가한다:

```html
<model-viewer id="luckDiceModel" class="luck-game-img" src="image/luck/dice_spin.glb"
    style="display:none;" disable-zoom>
</model-viewer>
```

- 평소에는 `display:none`으로 숨겨져 있다가, 주사위 게임이 시작될 때만 표시된다
- RPS/룰렛 게임 중에는 `#luckGameImg`(기존 `<img>`)만 쓰고 `#luckDiceModel`은 숨겨진 채로 유지
- 주사위 게임 중에는 반대로 `#luckGameImg`를 숨기고 `#luckDiceModel`을 표시

### 자산

- `image/luck/dice_spin.glb` — 사용자가 추후 직접 저장소에 추가 (Claude가 생성 불가능한 실제 3D 아트 자산)
- 기존 `image/luck/dice_spin.gif`, `image/luck/dice_face_1.png` ~ `dice_face_6.png`는 더 이상 쓰이지 않으므로 삭제한다 (Task 15에서 임시로 만든 placeholder였음)

## 눈금-방향 매핑 보정(calibration)

GLB 지오메트리만 파싱해서 "어느 면이 6인지"를 자동으로 신뢰성 있게 알아내는 것은 불안정하다 (텍스처/재질 정보까지 파싱해야 하고, 오차 위험이 있음). 대신 사람이 눈으로 직접 확인하는 1회성 보정 절차를 거친다:

1. GLB 파일이 저장소에 추가되면, 임시 디버그 페이지(저장소에 커밋하지 않음, scratchpad에 생성)를 만들어 `<model-viewer>`의 마우스 오빗(orbit) 컨트롤로 모델을 자유롭게 회전시켜볼 수 있게 한다
2. 사람이 "지금 이 각도에서 눈금 N이 위(카메라 방향)를 향한다"를 육안으로 확인하면서, 그 순간의 회전값을 6번 기록한다
3. 기록한 6개 값을 `js/luck.js`에 상수 테이블로 하드코딩한다:

```javascript
// 사람이 육안으로 확인 후 채워 넣는 보정값 (예시 형식)
const _DICE_FACE_ORIENTATION = {
    1: '0deg 0deg 0deg',
    2: '...',
    3: '...',
    4: '...',
    5: '...',
    6: '...',
};
```

이 단계는 자동화된 red/green 사이클로 검증할 수 없다 — Task 15의 수동 QA와 같은 성격의, 사람이 한 번은 직접 눈으로 확인해야 하는 단계다. 구현 코드는 이 테이블이 채워져 있다는 전제로 작성하고, 실제 값은 GLB 파일이 도착한 뒤 별도로 채운다.

## 애니메이션 흐름

### 회전 시작 — `_luckDiceStart()`

- `#luckGameImg`를 숨기고 `#luckDiceModel`을 표시
- `requestAnimationFrame` 루프를 시작해 여러 축(X/Y/Z)의 각도를 계속 증가시키며 `#luckDiceModel`의 `orientation` 속성을 매 프레임 갱신 — "구르는" 느낌을 연출
- 루프 핸들은 `_luck.diceRollFrame`(rAF id)에 저장

### 멈춤 — `luckDiceStop()`

1. `Math.floor(Math.random() * 6) + 1`로 눈금 결정 (기존 로직 그대로 유지)
2. 구르기 rAF 루프 정지
3. 현재 각도에서 `_DICE_FACE_ORIENTATION[face]`까지 약 0.6초간 감속하며 회전하는 트윈(tween) 애니메이션 실행 (별도 rAF 루프, ease-out)
4. 트윈 종료 후 약 0.8초 정지 대기 (결과를 눈으로 확인할 시간 확보 — 기존 GIF/정적 이미지 방식은 멈춤과 동시에 화면 전환되어 결과를 거의 볼 수 없었던 문제를 함께 해결)
5. `_luckResolve(isWin, { face })` 호출 → 기존과 동일하게 View6(결과 화면)로 전환

### 정리(cleanup) 통합

기존 `_luckResetGameImg()`(RPS 타이머 누수, 룰렛 CSS 애니메이션 클래스 누수를 막기 위해 만든 공용 정리 함수, `js/luck.js`)를 확장한다:

- 주사위 구르기/정지-트윈 rAF 루프가 진행 중이면 `cancelAnimationFrame`으로 취소
- `#luckDiceModel`을 숨기고 `#luckGameImg`를 다시 표시 상태로 복원

`_luckStartGame()`이 게임을 시작할 때마다 `_luckResetGameImg()`를 무조건 호출하는 기존 구조를 그대로 활용하므로, 다른 두 게임에서 이미 검증된 패턴을 세 번째로 재사용하는 것이며 별도의 새로운 정리 로직 설계가 필요하지 않다.

## 테스트 변경

`tests/luck-games.test.js`의 기존 주사위 관련 검증 중 GIF/정적 이미지에 의존하는 항목을 교체한다:

- 제거: `image/luck/dice_spin.gif` 검증, `` `image/luck/dice_face_${face}.png` `` 검증
- 추가: `#luckDiceModel` 엘리먼트 및 `image/luck/dice_spin.glb` 참조 검증, `_DICE_FACE_ORIENTATION` 테이블 존재 검증, `_luckDiceStart`/`luckDiceStop`의 rAF 기반 구조 검증, `face === 6` 승리 조건은 그대로 유지
- 나머지 luck 관련 테스트 스위트(7개 파일)는 영향 없음 — 정적 소스 텍스트 정규식 검사 방식이라 dice 관련 3개 assertion만 교체하면 된다

## 리스크 및 미결 사항

- **GLB 파일 미도착**: 구현은 파일이 없어도 코드/테스트 작성까지는 가능하지만, `_DICE_FACE_ORIENTATION` 실제 값 채우기와 최종 시각 확인(QA)은 파일 도착 후 사람이 별도로 진행해야 한다
- **model-viewer 성능**: 매 프레임 `orientation` 속성을 갱신하는 방식이 일부 저사양 태블릿에서 버벅일 가능성이 있음 — 실기기 QA에서 확인 필요 (Task 15와 유사한 수동 QA 항목으로 남긴다)
- **보정값 재검증**: 추후 GLB 파일이 다른 버전으로 교체되면 6개 회전값을 다시 보정해야 한다는 점을 인지하고 있어야 한다
