# 관리자 모드 설계

**날짜:** 2026-05-18  
**브랜치:** feat/advanced-mode

## 목표

setupScreen의 관리자 버튼을 통해 비밀번호 인증 후 별도의 어두운 테마 관리자 화면(adminScreen)에 진입. 현재는 퀴즈 답안 확인 기능을 제공하며, 추후 기능 추가가 가능한 네비게이션 구조를 갖는다.

## 화면 구조

```
setupScreen
  └─ ⚙️ 관리자 버튼 (setup-card 오른쪽 상단, position:absolute)
       ↓ 클릭
  다크 비밀번호 모달 (SHA-256 검증)
       ↓ 성공
adminScreen (5번째 SPA 화면)
  ├─ 컨트롤 바: "🔐 관리자 모드" 제목 + [🏠 처음으로] 버튼
  ├─ 기능 네비 바: [📋 퀴즈 답안] (추가 기능 슬롯)
  ├─ variant 탭: [기본] [심화] [부자의그릇]
  └─ 콘텐츠 영역
       └─ 퀴즈 답안 뷰어
            ├─ 👥 팀전 문제 (카드 2개)
            └─ 👤 개인전 문제 (카드 2개)
```

## 비밀번호 인증

- 기존 페이지 인증과 동일한 SHA-256 해시 사용: `f1e8d7d4dbad359476ea3786d3bcb02ba1909934fcfe059f3580edaeacead4db`
- 커스텀 다크 모달에서 `<input type="password">` 입력
- 실패 시 모달 내 인라인 에러 메시지 표시 ("비밀번호가 올바르지 않습니다")
- 성공 시 모달 닫고 `switchScreen('adminScreen')` 호출

## 테마

- 배경: `#1a1a2e` (짙은 네이비)
- 카드/패널: `#16213e`
- 강조색: `#e94560` (레드 포인트)
- 텍스트: `#eee`
- body에 `.admin-mode` 클래스를 토글해 전체 테마 적용

## 기능 네비게이션

`currentAdminMenu` 상태 변수 (초기값: `'quiz-answers'`).  
네비 탭 클릭 시 해당 콘텐츠 영역으로 전환. 현재는 `'quiz-answers'` 하나만 구현.

## 퀴즈 답안 뷰어

### variant 탭

기본 / 심화 / 부자의그릇 — `currentAdminVariant` 상태 변수로 관리.

### 이미지 매핑

JS 설정 객체 `ADMIN_ANSWERS`로 관리 (variant별 확장 용이):

```js
const ADMIN_ANSWERS = {
  basic: {
    team:   ['images/answers/answer1.png', 'images/answers/answer2.png'],
    indiv:  ['images/answers/answer3.png', 'images/answers/answer4.png']
  },
  advanced: {
    team:   ['images/answers/answer1.png', 'images/answers/answer2.png'],
    indiv:  ['images/answers/answer3.png', 'images/answers/answer4.png']
  },
  rich_vessel: {
    team:   ['images/answers/answer1.png', 'images/answers/answer2.png'],
    indiv:  ['images/answers/answer3.png', 'images/answers/answer4.png']
  }
};
```

### 카드 레이아웃

```
[ 👥 팀전 문제 ]
┌────────────────┐  ┌────────────────┐
│  answer1.png   │  │  answer2.png   │
│  (썸네일)      │  │  (썸네일)      │
└────────────────┘  └────────────────┘

[ 👤 개인전 문제 ]
┌────────────────┐  ┌────────────────┐
│  answer3.png   │  │  answer4.png   │
│  (썸네일)      │  │  (썸네일)      │
└────────────────┘  └────────────────┘
```

- 카드: 둥근 테두리, 다크 배경, 이미지 썸네일 표시
- 호버: 밝아지는 효과
- 더블클릭: `window.open(imagePath, '_blank')` 로 새 탭에서 원본 이미지 열기

## 상태 관리

```js
let currentAdminMenu    = 'quiz-answers';  // 기능 네비
let currentAdminVariant = 'basic';         // variant 탭
```

`showAdminScreen()` 호출 시 두 상태 모두 초기값으로 리셋.

## 변경 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `index.html` | 관리자 버튼, 비밀번호 모달, adminScreen HTML 추가 |
| `js/admin.js` (신규) | 비밀번호 검증, 탭 전환, 이미지 렌더링, `ADMIN_ANSWERS` 설정 |
| `style.css` | 다크 테마, 비밀번호 모달, 이미지 카드 스타일 |
| `images/answers/` | answer1~4.png 위치 (사용자가 직접 배치) |

## adminScreen 진입/퇴장

- **진입**: 비밀번호 모달 성공 → `switchScreen('adminScreen')` + `showAdminScreen()`
- **퇴장**: "처음으로" 버튼 → `switchScreen('setupScreen')`
- **퇴장 시 body에서 `.admin-mode` 클래스 제거** (테마 복구)
