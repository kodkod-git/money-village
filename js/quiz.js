// [퀴즈 퀘스트] 머니빌리지 OX 퀴즈

const _quiz = {
    gameId:           null,
    gameDate:         null,
    sectionNum:       null,
    gameType:         'individual', // 'individual' | 'team'
    players:          [],
    reward:           1000,
    progress:         {},   // individual: { [playerIdx]: 0|1|2 }
    teamProgress:     {},   // team: { [team_name]: 0|1|2 }
    teamPlayers:      {},   // team: { [team_name]: Set<playerIdx> } 이미 정답 맞춘 플레이어
    currentPlayerIdx: null,
    currentQuizNum:   null, // 0=quiz2.png, 1=quiz3.png
    selections:       [],
};

const _QUIZ_IMAGES  = ['image/quiz2.png', 'image/quiz3.png'];
const _QUIZ_ANSWERS = {
    'image/quiz2.png': ['O', 'X', 'O', 'X'],
    'image/quiz3.png': ['O', 'X', 'O', 'X'],
};
const _QUIZ_ROWS = [
    { top: 42.9, height: 12.9 },
    { top: 55.9, height: 12.9 },
    { top: 68.9, height: 12.9 },
    { top: 81.9, height: 12.9 },
];
const _QUIZ_COL = {
    O: { left: 75.2, width: 9.1 },
    X: { left: 84.2, width: 9.1 },
};

// ── 모달 ─────────────────────────────────────────────────────────────
function openQuizModal() {
    _quizResetModal();
    document.getElementById('quizModal').classList.add('show');

    const loading = document.getElementById('quizGameLoading');
    const select  = document.getElementById('quizDateSelect');
    loading.style.display = 'block';
    sbGetGameDates().then(dates => {
        loading.style.display = 'none';
        if (dates.length === 0) {
            document.getElementById('quizGameCardsGrid').innerHTML =
                '<p style="color:#888;font-size:13px;text-align:center;">저장된 게임 기록이 없습니다.</p>';
            return;
        }
        dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = d;
            select.appendChild(opt);
        });
    }).catch(() => {
        loading.style.display = 'none';
        document.getElementById('quizGameCardsGrid').innerHTML =
            '<p style="color:#d32f2f;font-size:13px;text-align:center;">날짜 목록 불러오기 실패</p>';
    });
}

function closeQuizModal() {
    document.getElementById('quizModal').classList.remove('show');
}

function handleQuizModalBackdrop(e) {
    if (e.target === document.getElementById('quizModal')) closeQuizModal();
}

function _quizResetModal() {
    document.getElementById('quizDateSelect').innerHTML =
        '<option value="">-- 날짜를 선택하세요 --</option>';
    document.getElementById('quizGameCardsGrid').innerHTML = '';
    document.getElementById('quizGameLoading').style.display = 'none';
    document.getElementById('quizStep1Btn').disabled = true;
    document.getElementById('quizRewardDisplay').textContent =
        _quiz.reward.toLocaleString() + '원';
    _quiz.gameId   = null;
    _quiz.gameDate = null;
}

async function onQuizDateChange() {
    const date    = document.getElementById('quizDateSelect').value;
    const grid    = document.getElementById('quizGameCardsGrid');
    const loading = document.getElementById('quizGameLoading');

    grid.innerHTML = '';
    document.getElementById('quizStep1Btn').disabled = true;
    _quiz.gameId = null;

    if (!date) return;

    loading.style.display = 'block';
    try {
        const games = await sbGetGamesByDate(date);
        loading.style.display = 'none';
        if (!games || games.length === 0) {
            grid.innerHTML = '<p style="color:#888;font-size:13px;text-align:center;">해당 날짜에 게임 기록이 없습니다.</p>';
            return;
        }
        games.forEach(g => {
            const sectionLabel = String(g.section_num).padStart(2, '0') + '분반';
            const typeTag      = g.game_type === 'team' ? 'tag-team' : 'tag-individual';
            const typeLabel    = g.game_type === 'team' ? '팀전' : '개인전';
            const names        = (g.preview_names || []).join(', ') + (g.player_count > 6 ? ' 등' : '');
            const card = document.createElement('div');
            card.className = 'past-game-card';
            card.innerHTML = `
                <div class="past-game-card-title">${sectionLabel}</div>
                <div class="past-game-card-meta">
                    <span>${names || '참가자 정보 없음'}</span>
                    <span>참여인원: ${g.player_count}명</span>
                    <span class="${typeTag}">${typeLabel}</span>
                </div>`;
            card.onclick = () => _quizSelectGame(g.game_id, date, g.section_num, g.game_type, card);
            grid.appendChild(card);
        });
    } catch(e) {
        loading.style.display = 'none';
        grid.innerHTML = `<p style="color:#d32f2f;font-size:13px;text-align:center;">불러오기 실패: ${e.message}</p>`;
    }
}

function _quizSelectGame(gameId, date, sectionNum, gameType, cardEl) {
    document.querySelectorAll('#quizGameCardsGrid .past-game-card')
        .forEach(c => c.classList.remove('bank-selected'));
    cardEl.classList.add('bank-selected');
    _quiz.gameId     = gameId;
    _quiz.gameDate   = date;
    _quiz.sectionNum = sectionNum;
    _quiz.gameType   = gameType || 'individual';
    document.getElementById('quizStep1Btn').disabled = false;
}

function quizAdjustReward(delta) {
    const next = _quiz.reward + delta;
    if (next < 0) return;
    _quiz.reward = next;
    document.getElementById('quizRewardDisplay').textContent = next.toLocaleString() + '원';
}

async function quizStep1Complete() {
    if (!_quiz.gameId) return;

    const btn = document.getElementById('quizStep1Btn');
    btn.disabled    = true;
    btn.textContent = '불러오는 중...';

    try {
        _quiz.players = await sbGetPlayersByGameId(_quiz.gameId);
        btn.disabled    = false;
        btn.textContent = '설정 완료';

        if (_quiz.players.length === 0) {
            alert('해당 게임에 참가자 정보가 없습니다.');
            return;
        }

        const section = String(_quiz.sectionNum || 1).padStart(2, '0');
        const infoEl  = document.getElementById('quizGameInfo');
        if (infoEl) infoEl.textContent = `${_quiz.gameDate} · ${section}분반`;

        document.getElementById('quizRewardBadge').textContent =
            _quiz.reward.toLocaleString() + '원';

        _quiz.progress     = {};
        _quiz.teamProgress = {};
        _quiz.teamPlayers  = {};
        _quizRenderPlayerList();
        closeQuizModal();
        switchScreen('quizScreen');
    } catch(e) {
        btn.disabled    = false;
        btn.textContent = '설정 완료';
        alert('플레이어 로드 실패: ' + e.message);
    }
}

// ── 플레이어 리스트 ───────────────────────────────────────────────────
function _quizRenderPlayerList() {
    const grid     = document.getElementById('quizPlayerGrid');
    const isTeam   = _quiz.gameType === 'team';
    grid.innerHTML = '';

    _quiz.players.forEach((p, idx) => {
        let count, done, inProgress, playerAlreadyDone;

        if (isTeam && p.team_name) {
            count             = _quiz.teamProgress[p.team_name] || 0;
            done              = count >= 2;
            inProgress        = count === 1;
            playerAlreadyDone = !!(_quiz.teamPlayers[p.team_name]?.has(idx));
        } else {
            count             = _quiz.progress[idx] || 0;
            done              = count >= 2;
            inProgress        = count === 1;
            playerAlreadyDone = done;
        }

        const isClickable = !done && !playerAlreadyDone;
        const badgeClass  = done ? ' quiz-done' : inProgress ? ' quiz-in-progress' : '';
        const teamTag     = p.team_name ? `<span class="bank-player-team">${p.team_name}</span>` : '';

        const card = document.createElement('div');
        card.className = 'bank-player-card'
            + (done ? ' completed' : inProgress ? ' in-progress' : '');
        if (!isClickable) card.style.opacity = '0.55';

        card.innerHTML = `
            <div class="bank-player-nickname">${p.nickname}</div>
            <div class="bank-player-realname">${p.real_name}</div>
            <div class="bank-player-status">
                <span class="bank-player-efti">${p.default_efti || 'FAEN'}</span>
                ${teamTag}
                <span class="quiz-progress-badge${badgeClass}">[${count}/2]</span>
            </div>`;

        if (isClickable) card.onclick = () => _quizSelectPlayer(idx);
        grid.appendChild(card);
    });
}

function _quizSelectPlayer(idx) {
    _quiz.currentPlayerIdx = idx;
    const p = _quiz.players[idx];

    if (_quiz.gameType === 'team' && p.team_name) {
        _quiz.currentQuizNum = _quiz.teamProgress[p.team_name] || 0;
    } else {
        _quiz.currentQuizNum = _quiz.progress[idx] || 0;
    }

    _quizStartGame();
}

// ── 퀴즈 게임 ────────────────────────────────────────────────────────
function _quizStartGame() {
    const imgSrc = _QUIZ_IMAGES[_quiz.currentQuizNum];
    const p      = _quiz.players[_quiz.currentPlayerIdx];

    _quiz.selections = new Array(4).fill(null);

    document.getElementById('quizGameImg').src = imgSrc;
    document.getElementById('quizGameRewardText').textContent =
        _quiz.reward.toLocaleString() + '원';
    document.getElementById('quizGamePlayerName').textContent =
        `${p.nickname} (${p.real_name})`;

    _quizBuildButtons();
    document.getElementById('quizResultOverlay').classList.remove('show');
    document.getElementById('quizConfirmOverlay').style.display = 'none';
    document.getElementById('quizGameView').style.display = 'flex';
}

function _quizBuildButtons() {
    const wrapper = document.getElementById('quizGameWrapper');
    wrapper.querySelectorAll('.ox-btn').forEach(b => b.remove());

    for (let i = 0; i < 4; i++) {
        ['O', 'X'].forEach(val => {
            const c   = _QUIZ_COL[val];
            const row = _QUIZ_ROWS[i];
            const btn = document.createElement('button');
            btn.className   = 'ox-btn';
            btn.dataset.idx = i;
            btn.dataset.val = val;
            btn.style.left   = c.left     + '%';
            btn.style.width  = c.width    + '%';
            btn.style.top    = row.top    + '%';
            btn.style.height = row.height + '%';

            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                _quiz.selections[idx] = val;
                wrapper.querySelectorAll(`.ox-btn[data-idx="${idx}"]`)
                    .forEach(b => b.classList.remove('selected-o', 'selected-x'));
                btn.classList.add(val === 'O' ? 'selected-o' : 'selected-x');

                if (_quiz.selections.every(s => s !== null)) {
                    setTimeout(_quizShowConfirm, 300);
                }
            });

            wrapper.appendChild(btn);
        });
    }
}

function _quizShowConfirm() {
    document.getElementById('quizConfirmOverlay').style.display = 'flex';
}

function quizConfirmYes() {
    document.getElementById('quizConfirmOverlay').style.display = 'none';
    _quizShowResult();
}

function quizConfirmNo() {
    document.getElementById('quizConfirmOverlay').style.display = 'none';
}

function _quizShowResult() {
    const imgSrc     = _QUIZ_IMAGES[_quiz.currentQuizNum];
    const answers    = _QUIZ_ANSWERS[imgSrc];
    const allCorrect = answers.every((ans, i) => _quiz.selections[i] === ans);

    const msg          = document.getElementById('quizResultMsg');
    const btnOk        = document.getElementById('quizBtnConfirm');
    const btnTeamNext  = document.getElementById('quizBtnTeamNext');
    const btnRetry     = document.getElementById('quizBtnRetry');

    btnOk.style.display       = 'none';
    btnTeamNext.style.display = 'none';
    btnRetry.style.display    = 'none';

    if (allCorrect) {
        msg.textContent = '맞았습니다! 🎉';
        msg.className   = 'result-msg correct';

        const p      = _quiz.players[_quiz.currentPlayerIdx];
        const isTeam = _quiz.gameType === 'team' && p.team_name;

        if (isTeam) {
            if (!_quiz.teamPlayers[p.team_name]) _quiz.teamPlayers[p.team_name] = new Set();
            _quiz.teamPlayers[p.team_name].add(_quiz.currentPlayerIdx);
            _quiz.teamProgress[p.team_name] = (_quiz.teamProgress[p.team_name] || 0) + 1;

            if (_quiz.teamProgress[p.team_name] >= 2) {
                // 팀 [2/2] 달성 — 팀원 전체에 보상 저장
                for (const pidx of _quiz.teamPlayers[p.team_name]) {
                    const nick = _quiz.players[pidx].nickname;
                    sbSaveQuestReward(_quiz.gameId, nick, _quiz.reward).catch(console.error);
                }
                btnOk.textContent   = `${_quiz.reward.toLocaleString()}원 획득`;
                btnOk.style.display = 'block';
            } else {
                btnTeamNext.style.display = 'block';
            }
        } else {
            const newProgress = (_quiz.progress[_quiz.currentPlayerIdx] || 0) + 1;
            _quiz.progress[_quiz.currentPlayerIdx] = newProgress;
            if (newProgress >= 2) {
                // 개인 [2/2] 달성 — 보상 저장
                sbSaveQuestReward(_quiz.gameId, p.nickname, _quiz.reward).catch(console.error);
                btnOk.textContent   = `${_quiz.reward.toLocaleString()}원 획득`;
                btnOk.style.display = 'block';
            } else {
                btnOk.textContent   = '확인 (1/2)';
                btnOk.style.display = 'block';
            }
        }
    } else {
        msg.textContent        = '틀렸습니다!';
        msg.className          = 'result-msg wrong';
        btnRetry.style.display = 'block';
    }

    document.getElementById('quizResultOverlay').classList.add('show');
}

function quizRetry() {
    document.getElementById('quizResultOverlay').classList.remove('show');
    _quizStartGame();
}

function quizResultNext() {
    document.getElementById('quizResultOverlay').classList.remove('show');
    document.getElementById('quizGameView').style.display = 'none';
    _quizRenderPlayerList();
}

function quizBackToList() {
    document.getElementById('quizGameView').style.display = 'none';
}
