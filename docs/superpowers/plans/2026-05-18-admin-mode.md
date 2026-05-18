# 관리자 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** setupScreen에 관리자 버튼을 추가하고, 비밀번호 인증 후 어두운 테마의 adminScreen으로 진입해 퀴즈 답안 이미지를 variant별로 확인할 수 있게 한다.

**Architecture:** 새 `js/admin.js` 파일에 비밀번호 검증·상태 관리·렌더링 로직을 담는다. `index.html`에 비밀번호 모달과 adminScreen HTML을 추가하고, `style.css`에 다크 테마와 카드 스타일을 추가한다.

**Tech Stack:** Vanilla JS, Web Crypto API (SHA-256), HTML/CSS

---

## File Map

| 파일 | 변경 유형 | 책임 |
|---|---|---|
| `js/admin.js` | 신규 생성 | 비밀번호 검증, 탭 전환, 이미지 렌더링, ADMIN_ANSWERS 설정 |
| `index.html` | 수정 | 관리자 버튼, 비밀번호 모달, adminScreen, script 태그 |
| `style.css` | 수정 | 다크 테마, 모달 스타일, 이미지 카드 스타일 |

---

### Task 1: `js/admin.js` 생성

**Files:**
- Create: `js/admin.js`

- [ ] **Step 1: admin.js 파일 생성**

아래 전체 내용으로 `js/admin.js`를 생성한다:

```js
const ADMIN_HASH = 'f1e8d7d4dbad359476ea3786d3bcb02ba1909934fcfe059f3580edaeacead4db';

const ADMIN_ANSWERS = {
    basic: {
        team:  ['images/answers/answer1.png', 'images/answers/answer2.png'],
        indiv: ['images/answers/answer3.png', 'images/answers/answer4.png']
    },
    advanced: {
        team:  ['images/answers/answer1.png', 'images/answers/answer2.png'],
        indiv: ['images/answers/answer3.png', 'images/answers/answer4.png']
    },
    rich_vessel: {
        team:  ['images/answers/answer1.png', 'images/answers/answer2.png'],
        indiv: ['images/answers/answer3.png', 'images/answers/answer4.png']
    }
};

let currentAdminMenu    = 'quiz-answers';
let currentAdminVariant = 'basic';

function openAdminModal() {
    document.getElementById('adminPasswordModal').style.display = 'flex';
    document.getElementById('adminPwInput').value = '';
    document.getElementById('adminPwError').style.display = 'none';
    setTimeout(() => document.getElementById('adminPwInput').focus(), 50);
}

function closeAdminModal() {
    document.getElementById('adminPasswordModal').style.display = 'none';
}

async function _adminSha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function submitAdminPassword() {
    const input = document.getElementById('adminPwInput').value;
    const hash  = await _adminSha256(input);
    if (hash !== ADMIN_HASH) {
        document.getElementById('adminPwError').style.display = 'block';
        document.getElementById('adminPwInput').value = '';
        document.getElementById('adminPwInput').focus();
        return;
    }
    closeAdminModal();
    showAdminScreen();
}

function showAdminScreen() {
    currentAdminMenu    = 'quiz-answers';
    currentAdminVariant = 'basic';
    document.body.classList.add('admin-mode');
    switchScreen('adminScreen');
    _syncAdminNavTabs();
    _syncAdminVariantTabs();
    renderAdminQuizAnswers();
}

function exitAdminMode() {
    document.body.classList.remove('admin-mode');
    switchScreen('setupScreen');
}

function switchAdminMenu(menu) {
    currentAdminMenu = menu;
    _syncAdminNavTabs();
    renderAdminQuizAnswers();
}

function switchAdminVariant(variant) {
    currentAdminVariant = variant;
    _syncAdminVariantTabs();
    renderAdminQuizAnswers();
}

function _syncAdminNavTabs() {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.menu === currentAdminMenu);
    });
}

function _syncAdminVariantTabs() {
    document.querySelectorAll('.admin-variant-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.variant === currentAdminVariant);
    });
}

function renderAdminQuizAnswers() {
    const answers   = ADMIN_ANSWERS[currentAdminVariant];
    const container = document.getElementById('adminAnswerCards');

    const makeCards = (list, label) => list.map((src, i) => `
        <div class="admin-answer-card" ondblclick="window.open('${src}', '_blank')" title="더블클릭하면 원본 이미지를 새 탭에서 열 수 있어요">
            <img src="${src}" alt="${label} ${i + 1}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="admin-answer-card-fallback" style="display:none;">이미지 없음</div>
            <div class="admin-answer-card-label">${label} ${i + 1}</div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="admin-answer-section">
            <div class="admin-answer-section-title">👥 팀전 문제</div>
            <div class="admin-answer-cards-row">${makeCards(answers.team, '팀전')}</div>
        </div>
        <div class="admin-answer-section">
            <div class="admin-answer-section-title">👤 개인전 문제</div>
            <div class="admin-answer-cards-row">${makeCards(answers.indiv, '개인전')}</div>
        </div>
    `;
}
```

- [ ] **Step 2: 커밋**

```bash
git add js/admin.js
git commit -m "feat: admin.js 생성 — 비밀번호 검증 및 퀴즈 답안 렌더링"
```

---

### Task 2: `index.html` — 관리자 버튼 + 비밀번호 모달

**Files:**
- Modify: `index.html` — setupScreen의 setup-card 안, body 끝 script 태그 영역

- [ ] **Step 1: 관리자 버튼을 setup-card 안에 추가**

`index.html` 38번째 줄 근처 `<div class="setup-card">` 바로 다음에 삽입:

```html
        <div class="setup-card">
            <button class="admin-entry-btn" onclick="openAdminModal()" title="관리자 모드">⚙️</button>
```

(기존 `<h1 style=...>머니빌리지 게임</h1>` 줄 앞에 추가)

- [ ] **Step 2: 비밀번호 모달 HTML 추가**

`</div> <!-- setupScreen 닫는 태그 -->` 바로 뒤, countingScreen 시작 전에 삽입:

```html
    <!-- 관리자 비밀번호 모달 -->
    <div id="adminPasswordModal" class="admin-pw-overlay" style="display:none;">
        <div class="admin-pw-modal">
            <div class="admin-pw-title">🔐 관리자 모드</div>
            <input type="password" id="adminPwInput" class="admin-pw-input"
                   placeholder="비밀번호를 입력하세요"
                   onkeydown="if(event.key==='Enter') submitAdminPassword()">
            <div id="adminPwError" class="admin-pw-error" style="display:none;">
                비밀번호가 올바르지 않습니다
            </div>
            <div class="admin-pw-actions">
                <button class="admin-pw-btn cancel" onclick="closeAdminModal()">취소</button>
                <button class="admin-pw-btn confirm" onclick="submitAdminPassword()">확인</button>
            </div>
        </div>
    </div>
```

- [ ] **Step 3: script 태그 추가**

`index.html` 903번째 줄 (`<script src="js/quiz.js"></script>`) 다음에 추가:

```html
<script src="js/admin.js"></script>
```

- [ ] **Step 4: 브라우저 확인**

`index.html`을 열면 setupScreen의 오른쪽 상단에 ⚙️ 버튼이 보여야 한다. 아직 스타일 없어도 버튼이 DOM에 있으면 OK.

- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat: 관리자 버튼 및 비밀번호 모달 HTML 추가"
```

---

### Task 3: `index.html` — adminScreen HTML

**Files:**
- Modify: `index.html` — fameScreen 닫는 태그 다음에 adminScreen 삽입

- [ ] **Step 1: adminScreen HTML 삽입**

`fameScreen` 끝(`</div> <!-- fameScreen -->`) 바로 다음에 삽입한다.  
fameScreen의 닫는 `</div>` 를 찾으려면 `id="fameScreen"` 블록 끝을 확인한다.

삽입할 HTML:

```html
    <!-- 관리자 화면 -->
    <div id="adminScreen" class="screen">
        <!-- 컨트롤 바 -->
        <div class="admin-control-bar">
            <div class="admin-bar-title">🔐 관리자 모드</div>
            <button class="admin-back-btn" onclick="exitAdminMode()">🏠 처음으로</button>
        </div>

        <!-- 기능 네비 바 -->
        <div class="admin-nav-bar">
            <button class="admin-nav-btn active" data-menu="quiz-answers"
                    onclick="switchAdminMenu('quiz-answers')">📋 퀴즈 답안</button>
        </div>

        <!-- 콘텐츠 영역 -->
        <div class="admin-content">
            <div id="adminQuizAnswers" class="admin-panel">

                <!-- variant 탭 -->
                <div class="admin-variant-tabs">
                    <button class="admin-variant-btn active" data-variant="basic"
                            onclick="switchAdminVariant('basic')">기본</button>
                    <button class="admin-variant-btn" data-variant="advanced"
                            onclick="switchAdminVariant('advanced')">심화</button>
                    <button class="admin-variant-btn" data-variant="rich_vessel"
                            onclick="switchAdminVariant('rich_vessel')">부자의그릇</button>
                </div>

                <!-- 답안 카드 렌더링 영역 -->
                <div id="adminAnswerCards"></div>

            </div>
        </div>
    </div>
```

- [ ] **Step 2: 커밋**

```bash
git add index.html
git commit -m "feat: adminScreen HTML 추가"
```

---

### Task 4: `style.css` — 다크 테마 + 모달 + 카드 스타일

**Files:**
- Modify: `style.css` — 파일 끝 (기존 `@media print` 블록 앞)에 추가

- [ ] **Step 1: 스타일 추가**

`style.css`에서 `/* [수정] 인쇄 시 백지 오류 해결` 주석 바로 앞에 아래를 삽입한다:

```css
        /* ===================================================
           관리자 모드
           =================================================== */

        /* 관리자 진입 버튼 (setup-card 우상단) */
        .setup-card { position: relative; }
        .admin-entry-btn {
            position: absolute; top: 14px; right: 14px;
            background: none; border: 1px solid #ddd; border-radius: 8px;
            padding: 4px 8px; font-size: 13px; color: #bbb; cursor: pointer;
            transition: all 0.15s;
        }
        .admin-entry-btn:hover { background: #f5f5f5; color: #888; border-color: #bbb; }

        /* 비밀번호 모달 오버레이 */
        .admin-pw-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.75);
            display: flex; justify-content: center; align-items: center; z-index: 2000;
        }
        .admin-pw-modal {
            background: #1a1a2e; color: #eee; border-radius: 14px;
            padding: 36px 32px; width: 320px; text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .admin-pw-title { font-size: 20px; font-weight: 900; margin-bottom: 20px; }
        .admin-pw-input {
            width: 100%; padding: 10px 14px; border-radius: 8px;
            border: 1px solid #444; background: #16213e; color: #eee;
            font-size: 15px; box-sizing: border-box; margin-bottom: 10px;
            outline: none;
        }
        .admin-pw-input:focus { border-color: #e94560; }
        .admin-pw-error { color: #e94560; font-size: 13px; margin-bottom: 12px; }
        .admin-pw-actions { display: flex; gap: 10px; margin-top: 16px; }
        .admin-pw-btn {
            flex: 1; padding: 10px; border-radius: 8px; border: none;
            font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.15s;
        }
        .admin-pw-btn.cancel  { background: #2d2d4e; color: #aaa; }
        .admin-pw-btn.cancel:hover  { background: #3a3a5c; }
        .admin-pw-btn.confirm { background: #e94560; color: #fff; }
        .admin-pw-btn.confirm:hover { background: #c73652; }

        /* adminScreen 다크 배경 */
        body.admin-mode { background: #0d0d1a; }
        #adminScreen { background: #0d0d1a; min-height: 100vh; padding-bottom: 40px; }

        /* 컨트롤 바 */
        .admin-control-bar {
            display: flex; justify-content: space-between; align-items: center;
            background: #16213e; padding: 14px 24px;
            border-bottom: 1px solid #2a2a4a;
        }
        .admin-bar-title { font-size: 18px; font-weight: 900; color: #eee; }
        .admin-back-btn {
            padding: 7px 16px; border-radius: 8px; border: 1px solid #444;
            background: #1a1a2e; color: #bbb; font-weight: 700; cursor: pointer;
            transition: all 0.15s;
        }
        .admin-back-btn:hover { background: #2a2a4e; color: #eee; }

        /* 기능 네비 바 */
        .admin-nav-bar {
            display: flex; gap: 8px; padding: 12px 24px;
            background: #12122a; border-bottom: 1px solid #2a2a4a;
        }
        .admin-nav-btn {
            padding: 7px 20px; border-radius: 20px; border: 2px solid #333;
            background: #1a1a2e; color: #888; font-weight: 700; font-size: 14px;
            cursor: pointer; transition: all 0.15s;
        }
        .admin-nav-btn.active { background: #e94560; border-color: #e94560; color: #fff; }
        .admin-nav-btn:hover:not(.active) { border-color: #555; color: #ccc; }

        /* 콘텐츠 영역 */
        .admin-content { padding: 24px; }

        /* variant 탭 */
        .admin-variant-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
        .admin-variant-btn {
            padding: 6px 18px; border-radius: 20px; border: 2px solid #333;
            background: #1a1a2e; color: #888; font-weight: 700; font-size: 14px;
            cursor: pointer; transition: all 0.15s;
        }
        .admin-variant-btn:hover:not(.active) { border-color: #555; color: #ccc; }
        .admin-variant-btn.active[data-variant="basic"]       { background: #1565c0; border-color: #2196f3; color: #fff; }
        .admin-variant-btn.active[data-variant="advanced"]    { background: #6a1b9a; border-color: #9c27b0; color: #fff; }
        .admin-variant-btn.active[data-variant="rich_vessel"] { background: #e65100; border-color: #ff9800; color: #fff; }

        /* 답안 섹션 */
        .admin-answer-section { margin-bottom: 32px; }
        .admin-answer-section-title {
            font-size: 16px; font-weight: 800; color: #ccc;
            margin-bottom: 14px; padding-bottom: 6px;
            border-bottom: 1px solid #2a2a4a;
        }
        .admin-answer-cards-row { display: flex; gap: 16px; flex-wrap: wrap; }

        /* 이미지 카드 */
        .admin-answer-card {
            background: #16213e; border: 2px solid #2a2a4a; border-radius: 12px;
            overflow: hidden; width: 280px; cursor: pointer; transition: all 0.2s;
            user-select: none;
        }
        .admin-answer-card:hover { border-color: #e94560; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(233,69,96,0.2); }
        .admin-answer-card img { width: 100%; height: 180px; object-fit: cover; display: block; }
        .admin-answer-card-fallback {
            width: 100%; height: 180px; justify-content: center; align-items: center;
            color: #555; font-size: 14px; background: #1a1a2e;
        }
        .admin-answer-card-label {
            padding: 10px 14px; font-size: 13px; font-weight: 700;
            color: #aaa; background: #12122a;
        }
```

- [ ] **Step 2: 브라우저 확인**

`index.html`을 열고:
1. ⚙️ 버튼이 setup-card 오른쪽 상단에 작게 표시되는지 확인
2. ⚙️ 클릭 시 어두운 비밀번호 모달이 뜨는지 확인
3. 올바른 비밀번호 입력 시 어두운 adminScreen으로 전환되는지 확인
4. 퀴즈 답안 탭에 팀전/개인전 카드 4개가 표시되는지 확인
5. 카드 더블클릭 시 새 탭으로 이미지가 열리는지 확인 (images/answers/ 폴더에 파일 있어야 함)
6. "처음으로" 클릭 시 setupScreen으로 복귀, 다크 테마 해제 확인

- [ ] **Step 3: 커밋**

```bash
git add style.css
git commit -m "feat: 관리자 모드 다크 테마 및 카드 스타일 추가"
```

---

## 완료 기준

- [ ] ⚙️ 버튼이 setup-card 우상단에 표시됨
- [ ] 버튼 클릭 시 다크 비밀번호 모달 등장
- [ ] 틀린 비밀번호 → 인라인 에러 메시지, Enter 키 지원
- [ ] 올바른 비밀번호 → adminScreen 진입, body에 `admin-mode` 클래스 추가
- [ ] 기능 네비 바에 "📋 퀴즈 답안" 탭 표시
- [ ] variant 탭 (기본/심화/부자의그릇) 전환 동작
- [ ] 팀전 2개 + 개인전 2개 카드가 이미지 썸네일과 함께 표시
- [ ] 이미지 로드 실패 시 "이미지 없음" 폴백 표시
- [ ] 더블클릭 시 `window.open()` 으로 새 탭에서 이미지 열림
- [ ] "처음으로" → setupScreen 복귀, 다크 테마 해제
