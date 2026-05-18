const ADMIN_HASH = 'f1e8d7d4dbad359476ea3786d3bcb02ba1909934fcfe059f3580edaeacead4db';

const ADMIN_ANSWERS = {
    basic: {
        team:  ['image/answers/answer1.png', 'image/answers/answer2.png'],
        indiv: ['image/answers/answer3.png', 'image/answers/answer4.png']
    },
    advanced: {
        team:  ['image/answers/answer1.png', 'image/answers/answer2.png'],
        indiv: ['image/answers/answer3.png', 'image/answers/answer4.png']
    },
    rich_vessel: {
        team:  ['image/answers/answer1.png', 'image/answers/answer2.png'],
        indiv: ['image/answers/answer3.png', 'image/answers/answer4.png']
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
