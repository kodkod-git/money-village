// [퀴즈 퀘스트] 머니빌리지 OX 퀴즈

const _quiz = {
    gameId:           null,
    gameDate:         null,
    sectionNum:       null,
    gameType:         'individual', // 'individual' | 'team'
    gameVariant:      'basic',      // 'basic' | 'advanced' | 'rich_vessel'
    players:          [],
    reward:           0,  // 개인탭 보상
    teamReward:       0,  // 팀탭 보상 (팀전 전용)
    earnedRewards:    {},    // { nickname: 누적보상합계 } — 덮어쓰기 방지용
    progress:         {},   // individual: { [playerIdx]: 0|1 }
    teamProgress:     {},   // team: { [team_name]: 0|1|2 }
    teamPlayers:      {},   // team: { [team_name]: Set<playerIdx> } 이미 정답 맞춘 플레이어
    cooldowns:           {},   // 개인탭: { [playerIdx]: timestamp }
    teamPlayerCooldowns: {},   // 팀탭: { [playerIdx]: timestamp } — 개인탭과 독립
    teamCooldowns:       {},   // (미사용, 보존)
    cooldownTimer:    null,
    viewMode:         'team', // 팀전 목록 보기: 'team' | 'individual'
    currentPlayerIdx: null,
    currentQuizNum:   null, // team only: 0=quiz2.png, 1=quiz3.png
    selections:       [],
};

// variant × type별 퀴즈 설정 (images: 문제 순서, answers: 정답 배열)
const _QUIZ_CONFIG = {
    basic: {
        indiv: {
            images:  ['image/quiz/basic/quiz1.png',           'image/quiz/basic/quiz2.png'],
            answers: [['X','O','O','X'],                      ['O','O','X','O']]
        },
        team: {
            images:  ['image/quiz/basic/team_quiz1.png',      'image/quiz/basic/team_quiz2.png'],
            answers: [['O','X','O','X'],                      ['O','X','O','X']]
        }
    },
    advanced: {
        indiv: {
            images:  ['image/quiz/advanced/quiz1.png',        'image/quiz/advanced/quiz2.png'],
            answers: [['O','X','O','O'],                      ['O','X','O','X']]
        },
        team: {
            images:  ['image/quiz/advanced/team_quiz1.png',   'image/quiz/advanced/team_quiz2.png'],
            answers: [['O','O','O','X'],                      ['O','X','O','X']]
        }
    },
    rich_vessel: {
        indiv: {
            images:  ['image/quiz/rich_vessel/quiz1.png',     'image/quiz/rich_vessel/quiz2.png'],
            answers: [['O','O','X','X'],                      ['O','X','X','O']]
        },
        team: {
            images:  ['image/quiz/rich_vessel/team_quiz1.png','image/quiz/rich_vessel/team_quiz2.png'],
            answers: [['X','X','O','O'],                      ['X','O','O','X']]
        }
    }
};

function _quizGetConfig() {
    const variant = _quiz.gameVariant || 'basic';
    const type    = (_quiz.gameType === 'team' && _quiz.viewMode === 'team') ? 'team' : 'indiv';
    return (_QUIZ_CONFIG[variant] || _QUIZ_CONFIG.basic)[type];
}
const _QUIZ_ROWS = [
    { top: 42.9, height: 12.9 },
    { top: 55.9, height: 12.9 },
    { top: 68.9, height: 12.9 },
    { top: 81.9, height: 12.9 },
];
const _QUIZ_COL = {
    O: { left: 75.4, width: 9.1 },
    X: { left: 84.5, width: 9.1 },
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

function closeQuizModal(force = false) {
    if (!force && !confirm('현재 작성중인 내용이 사라집니다\n종료하시겠습니까?')) return;
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
    document.getElementById('quizRewardSection').style.display = 'none';
    document.getElementById('quizTeamRewardCard').style.display = 'none';
    document.getElementById('quizIndivRewardLabel').textContent = '퀴즈 보상금액';
    document.getElementById('quizRewardDisplay').textContent = _quiz.reward.toLocaleString() + '원';
    document.getElementById('quizTeamRewardDisplay').textContent = _quiz.teamReward.toLocaleString() + '원';
    _quiz.gameId   = null;
    _quiz.gameDate = null;
}

async function onQuizDateChange() {
    const date    = document.getElementById('quizDateSelect').value;
    const grid    = document.getElementById('quizGameCardsGrid');
    const loading = document.getElementById('quizGameLoading');

    grid.innerHTML = '';
    document.getElementById('quizStep1Btn').disabled = true;
    document.getElementById('quizRewardSection').style.display = 'none';
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
            const _rv = g.game_variant || 'basic';
            const variantLabel = _rv === 'advanced' ? '심화' : _rv === 'rich_vessel' ? '부자의 그릇' : '기본';
            const variantTag   = _rv === 'advanced' ? 'tag-advanced' : _rv === 'rich_vessel' ? 'tag-rich' : 'tag-basic';
            const card = document.createElement('div');
            card.className = 'past-game-card';
            card.innerHTML = `
                <div class="past-game-card-title">${sectionLabel}</div>
                <div class="past-game-card-meta">
                    <span>${names || '참가자 정보 없음'}</span>
                    <span>참여인원: ${g.player_count}명</span>
                    <span class="${typeTag}">${typeLabel}</span>
                    <span class="${variantTag}">${variantLabel}</span>
                </div>`;
            card.onclick = () => _quizSelectGame(g.game_id, date, g.section_num, g.game_type, g.game_variant || 'basic', card);
            grid.appendChild(card);
        });
    } catch(e) {
        loading.style.display = 'none';
        grid.innerHTML = `<p style="color:#d32f2f;font-size:13px;text-align:center;">불러오기 실패: ${e.message}</p>`;
    }
}

function _quizSelectGame(gameId, date, sectionNum, gameType, gameVariant, cardEl) {
    document.querySelectorAll('#quizGameCardsGrid .past-game-card')
        .forEach(c => c.classList.remove('bank-selected'));
    cardEl.classList.add('bank-selected');
    _quiz.gameId      = gameId;
    _quiz.gameDate    = date;
    _quiz.sectionNum  = sectionNum;
    _quiz.gameType    = gameType || 'individual';
    _quiz.gameVariant = gameVariant || 'basic';
    const isTeam = _quiz.gameType === 'team';
    document.getElementById('quizRewardSection').style.display = 'block';
    document.getElementById('quizTeamRewardCard').style.display = isTeam ? 'block' : 'none';
    document.getElementById('quizIndivRewardLabel').textContent = isTeam ? '개인 보상금액' : '퀴즈 보상금액';
    document.getElementById('quizStep1Btn').disabled = false;
}

function _quizSaveReward(nickname, amount) {
    _quiz.earnedRewards[nickname] = (_quiz.earnedRewards[nickname] || 0) + amount;
    sbSaveQuestReward(_quiz.gameId, nickname, _quiz.earnedRewards[nickname]).catch(console.error);
}

function quizAdjustReward(delta) {
    const next = _quiz.reward + delta;
    if (next < 0) return;
    _quiz.reward = next;
    document.getElementById('quizRewardDisplay').textContent = next.toLocaleString() + '원';
}

function quizAdjustTeamReward(delta) {
    const next = _quiz.teamReward + delta;
    if (next < 0) return;
    _quiz.teamReward = next;
    document.getElementById('quizTeamRewardDisplay').textContent = next.toLocaleString() + '원';
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

        _quizUpdateRewardBadge();

        _quiz.progress      = {};
        _quiz.teamProgress  = {};
        _quiz.teamPlayers   = {};
        _quiz.cooldowns           = {};
        _quiz.teamPlayerCooldowns = {};
        _quiz.teamCooldowns       = {};
        _quiz.earnedRewards       = {};
        _quiz.viewMode      = 'team';
        if (_quiz.cooldownTimer) {
            clearInterval(_quiz.cooldownTimer);
            _quiz.cooldownTimer = null;
        }
        _quizRenderPlayerList();
        closeQuizModal(true);
        switchScreen('quizScreen');
    } catch(e) {
        btn.disabled    = false;
        btn.textContent = '설정 완료';
        alert('플레이어 로드 실패: ' + e.message);
    }
}

// ── 플레이어 리스트 ───────────────────────────────────────────────────
const _QUIZ_COOLDOWN_MS = 60000;

function quizSetViewMode(mode) {
    _quiz.viewMode = mode;
    _quizUpdateRewardBadge();
    _quizRenderPlayerList();
}

function _quizUpdateRewardBadge() {
    const reward = (_quiz.gameType === 'team' && _quiz.viewMode === 'team')
        ? _quiz.teamReward
        : _quiz.reward;
    document.getElementById('quizRewardBadge').textContent = reward.toLocaleString() + '원';
}

function _quizRenderPlayerList() {
    const grid   = document.getElementById('quizPlayerGrid');
    const isTeam = _quiz.gameType === 'team';
    const now    = Date.now();
    grid.innerHTML = '';

    // 탭바 표시/업데이트
    const tabBar = document.getElementById('quizTabBar');
    tabBar.style.display = isTeam ? 'flex' : 'none';
    if (isTeam) {
        document.getElementById('quizTabTeam').classList.toggle('active', _quiz.viewMode === 'team');
        document.getElementById('quizTabIndiv').classList.toggle('active', _quiz.viewMode === 'individual');
    }

    // 팀전 개인 뷰: 그룹 없이 팀 상태 기준으로 플레이어 카드 나열
    const isTeamIndivView = isTeam && _quiz.viewMode === 'individual';
    grid.classList.toggle('is-team', isTeam && _quiz.viewMode === 'team');

    if (!isTeam) {
        const sortedIndiv = _quiz.players
            .map((p, idx) => ({ p, idx }))
            .sort((a, b) => (a.p.nickname || '').localeCompare(b.p.nickname || '', 'ko'));
        sortedIndiv.forEach(({ p, idx }) => {
            const count = _quiz.progress[idx] || 0;
            const done  = count >= 2;

            let onCooldown = false, remaining = 0;
            if (!done) {
                const start = _quiz.cooldowns[idx];
                if (start) {
                    remaining  = Math.ceil((start + _QUIZ_COOLDOWN_MS - now) / 1000);
                    onCooldown = remaining > 0;
                }
            }

            const isClickable   = !done && !onCooldown;
            const badgeClass    = done ? ' quiz-done' : '';
            const cooldownBadge = onCooldown ? `<span class="quiz-cooldown-badge">⏱ ${remaining}초</span>` : '';

            const card = document.createElement('div');
            card.className = 'bank-player-card' + (done ? ' completed' : '');
            if (!isClickable) card.style.opacity = '0.55';
            card.innerHTML = `
                <div class="bank-player-name-row"><span class="bank-player-nickname">${p.nickname}</span><span class="bank-player-realname">${p.real_name}</span></div>
                <div class="bank-player-status">
                    <span class="bank-player-efti">${p.default_efti || 'FAEN'}</span>
                    <span class="quiz-progress-badge${badgeClass}">[${count}/2]</span>
                    ${cooldownBadge}
                </div>`;
            if (isClickable) card.onclick = () => _quizSelectPlayer(idx);
            grid.appendChild(card);
        });
        _quizManageCooldownTimer();
        return;
    }

    // 팀전 - 개인 탭: 개인 추적(progress[idx]) 기준으로 quiz1.png 사용
    if (isTeamIndivView) {
        const sortedTeamIndiv = _quiz.players
            .map((p, idx) => ({ p, idx }))
            .sort((a, b) => {
                const teamCmp = (a.p.team_name || '').localeCompare(b.p.team_name || '', 'ko');
                if (teamCmp !== 0) return teamCmp;
                return (a.p.nickname || '').localeCompare(b.p.nickname || '', 'ko');
            });
        sortedTeamIndiv.forEach(({ p, idx }) => {
            const count = _quiz.progress[idx] || 0;
            const done  = count >= 2;

            let onCooldown = false, remaining = 0;
            if (!done) {
                const start = _quiz.cooldowns[idx];
                if (start) {
                    remaining  = Math.ceil((start + _QUIZ_COOLDOWN_MS - now) / 1000);
                    onCooldown = remaining > 0;
                }
            }

            const isClickable   = !done && !onCooldown;
            const badgeClass    = done ? ' quiz-done' : '';
            const cooldownBadge = onCooldown ? `<span class="quiz-cooldown-badge">⏱ ${remaining}초</span>` : '';

            const card = document.createElement('div');
            card.className = 'bank-player-card' + (done ? ' completed' : '');
            if (!isClickable) card.style.opacity = '0.55';
            card.innerHTML = `
                <div class="bank-player-name-row"><span class="bank-player-nickname">${p.nickname}</span><span class="bank-player-realname">${p.real_name}</span></div>
                <div class="bank-player-status">
                    <span class="bank-player-efti">${p.default_efti || 'FAEN'}</span>
                    <span class="quiz-progress-badge${badgeClass}">[${count}/2]</span>
                    ${cooldownBadge}
                </div>`;
            if (isClickable) card.onclick = () => _quizSelectPlayer(idx);
            grid.appendChild(card);
        });
        _quizManageCooldownTimer();
        return;
    }

    // 팀전 - 팀 탭: team_name 기준으로 그룹핑
    const teams = new Map();
    _quiz.players.forEach((p, idx) => {
        const key = p.team_name;
        if (!teams.has(key)) teams.set(key, []);
        teams.get(key).push({ p, idx });
    });

    const sortedTeams = [...teams.entries()].sort(([a], [b]) => a.localeCompare(b, 'ko'));
    sortedTeams.forEach(([teamKey, members]) => {
        members.sort((a, b) => (a.p.nickname || '').localeCompare(b.p.nickname || '', 'ko'));
        const count      = _quiz.teamProgress[teamKey] || 0;
        const done       = count >= 2;
        const inProgress = count === 1;

        const groupEl = document.createElement('div');
        groupEl.className = 'team-group';
        groupEl.innerHTML = `<div class="team-group-header">
            <span>${teamKey || '무소속'}</span>
            <span class="quiz-progress-badge">[${count}/2]</span>
        </div>`;

        const playersEl = document.createElement('div');
        playersEl.className = 'team-group-players';

        members.forEach(({ p, idx }) => {
            const playerAlreadyDone = !!(_quiz.teamPlayers[teamKey]?.has(idx));

            let onCooldown = false, remaining = 0;
            if (!done && !playerAlreadyDone) {
                const start = _quiz.teamPlayerCooldowns[idx];
                if (start) {
                    remaining  = Math.ceil((start + _QUIZ_COOLDOWN_MS - now) / 1000);
                    onCooldown = remaining > 0;
                }
            }

            const isClickable   = !done && !playerAlreadyDone && !onCooldown;
            const cooldownBadge = onCooldown ? `<span class="quiz-cooldown-badge">⏱ ${remaining}초</span>` : '';

            const card = document.createElement('div');
            card.className = 'bank-player-card' + (playerAlreadyDone ? ' completed' : '');
            if (!isClickable) card.style.opacity = '0.55';
            card.innerHTML = `
                <div class="bank-player-name-row"><span class="bank-player-nickname">${p.nickname}</span><span class="bank-player-realname">${p.real_name}</span></div>
                <div class="bank-player-status">
                    <span class="bank-player-efti">${p.default_efti || 'FAEN'}</span>
                    ${playerAlreadyDone ? '<span class="bank-status-done">정답</span>' : ''}
                    ${cooldownBadge}
                </div>`;
            if (isClickable) card.onclick = () => _quizSelectPlayer(idx);
            playersEl.appendChild(card);
        });

        groupEl.appendChild(playersEl);
        grid.appendChild(groupEl);
    });

    _quizManageCooldownTimer();
}

function _quizManageCooldownTimer() {
    const now = Date.now();

    const hasActive = _quiz.players.some((p, idx) => {
        const check = s => s && (s + _QUIZ_COOLDOWN_MS - now) > 0;
        return check(_quiz.cooldowns[idx]) || check(_quiz.teamPlayerCooldowns[idx]);
    });

    if (hasActive && !_quiz.cooldownTimer) {
        _quiz.cooldownTimer = setInterval(() => {
            if (document.getElementById('quizGameView').style.display === 'none') {
                _quizRenderPlayerList();
            }
        }, 1000);
    } else if (!hasActive && _quiz.cooldownTimer) {
        clearInterval(_quiz.cooldownTimer);
        _quiz.cooldownTimer = null;
    }
}

function _quizSelectPlayer(idx) {
    _quiz.currentPlayerIdx = idx;
    const p = _quiz.players[idx];

    if (_quiz.gameType === 'team' && _quiz.viewMode === 'team' && p.team_name) {
        _quiz.currentQuizNum = _quiz.teamProgress[p.team_name] || 0;
    } else {
        _quiz.currentQuizNum = _quiz.progress[idx] || 0;
    }

    _quizStartGame();
}

// ── 퀴즈 게임 ────────────────────────────────────────────────────────
function _quizStartGame() {
    const imgSrc = _quizGetConfig().images[_quiz.currentQuizNum];
    const p = _quiz.players[_quiz.currentPlayerIdx];

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
    const isTeamMode = _quiz.gameType === 'team' && _quiz.viewMode === 'team';
    const cfg        = _quizGetConfig();
    const answers    = cfg.answers[_quiz.currentQuizNum];
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
        const isTeam = isTeamMode && p.team_name;

        if (isTeam) {
            if (!_quiz.teamPlayers[p.team_name]) _quiz.teamPlayers[p.team_name] = new Set();
            _quiz.teamPlayers[p.team_name].add(_quiz.currentPlayerIdx);
            _quiz.teamProgress[p.team_name] = (_quiz.teamProgress[p.team_name] || 0) + 1;

            if (_quiz.teamProgress[p.team_name] >= 2) {
                // 팀 [2/2] 달성 — 팀원 전체에 보상 저장
                for (const pidx of _quiz.teamPlayers[p.team_name]) {
                    const nick = _quiz.players[pidx].nickname;
                    _quizSaveReward(nick, _quiz.teamReward);
                }
                btnOk.textContent   = `${_quiz.teamReward.toLocaleString()}원 획득`;
                btnOk.style.display = 'block';
            } else {
                btnTeamNext.style.display = 'block';
            }
        } else {
            // 개인 — 문제당 보상
            const prevCount = _quiz.progress[_quiz.currentPlayerIdx] || 0;
            _quiz.progress[_quiz.currentPlayerIdx] = prevCount + 1;
            _quizSaveReward(p.nickname, _quiz.reward);

            if (_quiz.progress[_quiz.currentPlayerIdx] >= 2) {
                // [2/2] 완료
                btnOk.textContent   = `${_quiz.reward.toLocaleString()}원 획득`;
                btnOk.style.display = 'block';
            } else {
                // [1/2] — 다음 문제로
                btnTeamNext.textContent   = `${_quiz.reward.toLocaleString()}원 획득! 다음 문제 →`;
                btnTeamNext.style.display = 'block';
            }
        }
    } else {
        msg.textContent        = '틀렸습니다!';
        msg.className          = 'result-msg wrong';
        btnRetry.style.display = 'block';

        const p = _quiz.players[_quiz.currentPlayerIdx];
        if (isTeamMode) {
            _quiz.teamPlayerCooldowns[_quiz.currentPlayerIdx] = Date.now();
        } else {
            _quiz.cooldowns[_quiz.currentPlayerIdx] = Date.now();
        }
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
