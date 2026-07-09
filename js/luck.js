// js/luck.js
// [행운] 머니빌리지 행운 — 가위바위보 / 룰렛 색깔 맞추기 / 주사위 눈금 맞추기

const _luck = {
    gameId:     null,
    gameDate:   null,
    sectionNum: null,
    players:    [],
    multipliers: { rps: 4, roulette: 5, dice: 7 },
    isClosed:   false,
    earnedRewards: {},   // { nickname: 누적 획득액 }
    currentPlayerIdx: null,
    selectedGame: null,  // 'rps' | 'roulette' | 'dice'
    bet: { amount: 1000 },
};

const _LUCK_GAME = {
    rps:      { label: '가위바위보',       icon: '✂️' },
    roulette: { label: '룰렛 색깔 맞추기', icon: '🎡' },
    dice:     { label: '주사위 눈금 맞추기', icon: '🎲' },
};

let _luckMultiplierDebounceTimer = null;
function _luckDebounceMultiplierSave() {
    clearTimeout(_luckMultiplierDebounceTimer);
    _luckMultiplierDebounceTimer = setTimeout(() => {
        if (!_luck.gameId) return;
        sbUpsertLuckState(_luck.gameId, {
            rps_multiplier: _luck.multipliers.rps,
            roulette_multiplier: _luck.multipliers.roulette,
            dice_multiplier: _luck.multipliers.dice
        });
    }, 1000);
}

// ── 모달 열기/닫기 ─────────────────────────────────────────────────
async function openLuckModal() {
    _luckResetModal();
    document.getElementById('luckModal').classList.add('show');

    const loading = document.getElementById('luckGameLoading');
    const select  = document.getElementById('luckDateSelect');
    try {
        loading.style.display = 'block';
        const dates = await sbGetGameDates();
        loading.style.display = 'none';
        if (dates.length === 0) {
            document.getElementById('luckGameCardsGrid').innerHTML =
                '<p style="color:#888;font-size:13px;text-align:center;">저장된 게임 기록이 없습니다.</p>';
            return;
        }
        dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = d;
            select.appendChild(opt);
        });
    } catch(e) {
        loading.style.display = 'none';
        document.getElementById('luckGameCardsGrid').innerHTML =
            '<p style="color:#d32f2f;font-size:13px;text-align:center;">날짜 목록 불러오기 실패</p>';
    }
}

function closeLuckModal(force = false) {
    if (!force && !confirm('현재 작성중인 내용이 사라집니다\n종료하시겠습니까?')) return;
    document.getElementById('luckModal').classList.remove('show');
}

function handleLuckModalBackdrop(e) {
    if (e.target === document.getElementById('luckModal')) closeLuckModal();
}

function _luckResetModal() {
    document.getElementById('luckDateSelect').innerHTML =
        '<option value="">-- 날짜를 선택하세요 --</option>';
    document.getElementById('luckGameCardsGrid').innerHTML = '';
    document.getElementById('luckGameLoading').style.display = 'none';
    document.getElementById('luckStep1Btn').disabled = true;
    document.getElementById('luckMultiplierSection').style.display = 'none';
    _luck.gameId   = null;
    _luck.gameDate = null;
}

// ── View 1(모달): 날짜·게임 선택 + 배수 설정 ──────────────────────
async function onLuckDateChange() {
    const date    = document.getElementById('luckDateSelect').value;
    const grid    = document.getElementById('luckGameCardsGrid');
    const loading = document.getElementById('luckGameLoading');

    grid.innerHTML = '';
    document.getElementById('luckStep1Btn').disabled = true;
    document.getElementById('luckMultiplierSection').style.display = 'none';
    _luck.gameId = null;

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
            const typeTag   = g.game_type === 'team' ? 'tag-team' : 'tag-individual';
            const typeLabel = g.game_type === 'team' ? '팀전' : '개인전';
            const names     = (g.preview_names || []).join(', ') + (g.player_count > 6 ? ' 등' : '');
            const _rv = g.game_variant || 'basic';
            const variantLabel = _rv === 'advanced' ? '심화' : _rv === 'rich_vessel' ? '부자의 그릇' : '기본';
            const variantTag   = _rv === 'advanced' ? 'tag-advanced' : _rv === 'rich_vessel' ? 'tag-rich' : 'tag-basic';
            const isTestGame   = !!g.is_test;
            const card = document.createElement('div');
            card.className = 'past-game-card';
            card.innerHTML = `
                <div class="past-game-card-title">${sectionLabel}${isTestGame ? ' <span class="tag-test">🧪 테스트</span>' : ''}</div>
                <div class="past-game-card-meta">
                    <span>${names || '참가자 정보 없음'}</span>
                    <span>참여인원: ${g.player_count}명</span>
                    <span class="${typeTag}">${typeLabel}</span>
                    <span class="${variantTag}">${variantLabel}</span>
                </div>`;
            card.onclick = () => _luckSelectGame(g.game_id, date, g.section_num, card);
            grid.appendChild(card);
        });
    } catch(e) {
        loading.style.display = 'none';
        grid.innerHTML = `<p style="color:#d32f2f;font-size:13px;text-align:center;">불러오기 실패: ${e.message}</p>`;
    }
}

async function _luckSelectGame(gameId, date, sectionNum, cardEl) {
    document.querySelectorAll('#luckGameCardsGrid .past-game-card')
        .forEach(c => c.classList.remove('bank-selected'));
    cardEl.classList.add('bank-selected');
    _luck.gameId     = gameId;
    _luck.gameDate   = date;
    _luck.sectionNum = sectionNum;
    document.getElementById('luckMultiplierSection').style.display = 'block';
    document.getElementById('luckStep1Btn').disabled = false;

    _luck._dbMultipliers = null;
    try {
        const saved = await sbGetLuckState(gameId);
        if (saved) {
            _luck._dbMultipliers = {
                rps: saved.rps_multiplier, roulette: saved.roulette_multiplier, dice: saved.dice_multiplier
            };
            _luck.multipliers.rps      = saved.rps_multiplier;
            _luck.multipliers.roulette = saved.roulette_multiplier;
            _luck.multipliers.dice     = saved.dice_multiplier;
            _luckSyncMultiplierUI();
        }
    } catch(e) {}
}

function _luckCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function luckAdjustMultiplier(type, delta) {
    const next = _luck.multipliers[type] + delta;
    if (next < 1) return;
    _luck.multipliers[type] = next;
    document.getElementById('luck' + _luckCap(type) + 'MultiplierDisplay').textContent = next + '배';
    _luckDebounceMultiplierSave();
}

function _luckSyncMultiplierUI() {
    document.getElementById('luckRpsMultiplierDisplay').textContent      = _luck.multipliers.rps      + '배';
    document.getElementById('luckRouletteMultiplierDisplay').textContent = _luck.multipliers.roulette + '배';
    document.getElementById('luckDiceMultiplierDisplay').textContent     = _luck.multipliers.dice     + '배';
}

async function luckStep1Complete() {
    if (!_luck.gameId) return;

    const btn = document.getElementById('luckStep1Btn');
    btn.disabled = true;
    btn.textContent = '불러오는 중...';

    try {
        _luck.players = await sbGetPlayersByGameId(_luck.gameId);
        btn.disabled = false;
        btn.textContent = '설정 완료';

        if (_luck.players.length === 0) {
            alert('해당 게임에 참가자 정보가 없습니다.');
            return;
        }

        const section = String(_luck.sectionNum || 1).padStart(2, '0');
        const infoEl = document.getElementById('luckGameInfo');
        if (infoEl) infoEl.textContent = `${_luck.gameDate} · ${section}분반`;

        if (_luck._dbMultipliers) {
            const d = _luck._dbMultipliers;
            const changed = _luck.multipliers.rps !== d.rps
                || _luck.multipliers.roulette !== d.roulette
                || _luck.multipliers.dice !== d.dice;
            if (changed) {
                const msg = `보상 배수가 변경되었습니다.\n가위바위보: ${_luck.multipliers.rps}배 / 룰렛: ${_luck.multipliers.roulette}배 / 주사위: ${_luck.multipliers.dice}배\n정말 변경하시겠습니까?`;
                if (!confirm(msg)) return;
            }
        }

        _luck.earnedRewards    = {};
        _luck.isClosed         = false;
        _luck.currentPlayerIdx = null;

        await sbUpsertLuckState(_luck.gameId, {
            rps_multiplier: _luck.multipliers.rps,
            roulette_multiplier: _luck.multipliers.roulette,
            dice_multiplier: _luck.multipliers.dice,
            is_closed: false
        });
        await _luckPollAndMerge();
        _luckRenderPlayerList();
        closeLuckModal(true);
        switchScreen('luckScreen');
        _luckShowView(2);
    } catch(e) {
        btn.disabled = false;
        btn.textContent = '설정 완료';
        alert('플레이어 로드 실패: ' + e.message);
    }
}

// ── 멀티-태블릿 동기화 폴링 ────────────────────────────────────────
let _luckSyncTimer = null;

function _luckStartSync() {
    if (_luckSyncTimer) return;
    _luckSyncTimer = setInterval(_luckPollAndMerge, 3000);
}

function _luckStopSync() {
    clearInterval(_luckSyncTimer);
    _luckSyncTimer = null;
    clearTimeout(_luckMultiplierDebounceTimer);
    _luckMultiplierDebounceTimer = null;
    if (_luck.rpsCycleTimer) {
        clearInterval(_luck.rpsCycleTimer);
        _luck.rpsCycleTimer = null;
    }
}

async function _luckPollAndMerge() {
    if (!_luck.gameId) return;
    try {
        const [state, history] = await Promise.all([
            sbGetLuckState(_luck.gameId),
            sbGetLuckHistory(_luck.gameId)
        ]);
        if (!state) return;
        _luckMergeRemoteState(state, history || []);
        if (document.getElementById('luckView2') &&
            document.getElementById('luckView2').style.display !== 'none') {
            _luckRenderPlayerList();
        }
    } catch (e) {
        console.warn('[luckSync] poll failed:', e.message);
    }
}

function _luckMergeRemoteState(state, history) {
    _luck.multipliers.rps      = state.rps_multiplier;
    _luck.multipliers.roulette = state.roulette_multiplier;
    _luck.multipliers.dice     = state.dice_multiplier;
    _luck.isClosed = !!state.is_closed;

    const findPlayer = (userId) => _luck.players.find(p => p.user_id === userId);
    _luck.earnedRewards = {};
    history.forEach(r => {
        if (!r.is_win || !r.matured_amount) return;
        const pl = findPlayer(r.user_id);
        if (!pl) return;
        _luck.earnedRewards[pl.nickname] = (_luck.earnedRewards[pl.nickname] || 0) + r.matured_amount;
    });

    _luckSyncMultiplierUI();
}

// ── 뷰 전환 (luckScreen 내 View 2~6) ─────────────────────────────
function _luckShowView(n) {
    [2, 3, 4, 5, 6].forEach(i => {
        const el = document.getElementById('luckView' + i);
        if (el) el.style.display = i === n ? 'block' : 'none';
    });
}

// ── View 2: 플레이어 목록 ────────────────────────────────────────
function _luckRenderPlayerList() {
    const closeBtn = document.getElementById('luckCloseBtn');
    if (closeBtn) {
        closeBtn.disabled    = _luck.isClosed;
        closeBtn.textContent = _luck.isClosed ? '마감됨' : '마감';
    }

    const grid = document.getElementById('luckPlayerGrid');
    renderActivityPlayerList({
        grid,
        players: _luck.players,
        useTeamGroups: false,
        getPlayerGroupState: ({ player }) => {
            const earned = _luck.earnedRewards[player.nickname] || 0;
            const headerHtml = earned > 0
                ? `<span class="luck-earned-badge">+${earned.toLocaleString()}원</span>`
                : '';
            return { done: false, headerHtml };
        },
        getPlayerCardState: ({ index }) => ({
            done: false,
            disabled: _luck.isClosed,
            onClick: () => luckSelectPlayer(index),
        }),
    });
}

// ── 마감 / 초기화 ─────────────────────────────────────────────────
async function luckClose() {
    if (_luck.isClosed) return;
    if (!confirm('행운 게임을 마감합니다.\n이후 진행이 불가능합니다.\n마감하시겠습니까?')) return;
    _luck.isClosed = true;
    await sbUpsertLuckState(_luck.gameId, { is_closed: true });
    _luckRenderPlayerList();
}

async function luckReset() {
    if (!_luck.gameId) return;
    if (!confirm('이전에 기록되었던 모든 데이터가 삭제됩니다.\n초기화 하시겠습니까?')) return;

    const result = await sbDeleteLuckHistory(_luck.gameId);
    if (!result.success) { alert('초기화에 실패했습니다. 다시 시도해주세요.'); return; }

    _luck.earnedRewards = {};
    _luck.isClosed = false;
    await sbUpsertLuckState(_luck.gameId, { is_closed: false });
    await Promise.all(_luck.players.map(p => sbSaveLuckReward(_luck.gameId, p.user_id, 0)));

    _luckRenderPlayerList();
}

// ── View 2 → 3: 플레이어 선택 ─────────────────────────────────────
function luckSelectPlayer(idx) {
    _luck.currentPlayerIdx = idx;
    const p = _luck.players[idx];
    document.getElementById('luckGameSelectPlayerName').textContent = `${p.nickname}(${p.real_name})의 게임 선택`;
    _luckShowView(3);
}

function luckBackToList() {
    if (_luck.rpsCycleTimer) {
        clearInterval(_luck.rpsCycleTimer);
        _luck.rpsCycleTimer = null;
    }
    _luckShowView(2);
}

function luckBackToGameSelect() {
    _luckShowView(3);
}

// ── View 3 → 4: 게임 선택 → 배팅 신청서 ────────────────────────────
function luckSelectGame(type) {
    _luck.selectedGame = type;
    const p = _luck.players[_luck.currentPlayerIdx];
    document.getElementById('luckBetPlayerName').textContent =
        `${p.nickname}(${p.real_name}) · ${_LUCK_GAME[type].label}`;
    document.getElementById('luckBetAmountDisplay').textContent = _luck.bet.amount.toLocaleString() + '원';
    _luckUpdateBetPreview();
    _luckShowView(4);
}

function luckAdjustBet(delta) {
    const next = _luck.bet.amount + delta;
    if (next < 0) return;
    _luck.bet.amount = next;
    document.getElementById('luckBetAmountDisplay').textContent = next.toLocaleString() + '원';
    _luckUpdateBetPreview();
}

function _luckUpdateBetPreview() {
    const mult = _luck.multipliers[_luck.selectedGame];
    const out  = Math.round(_luck.bet.amount * mult);
    document.getElementById('luckBetPreviewBox').textContent =
        `${_luck.bet.amount.toLocaleString()}원 → 🎉 ${out.toLocaleString()}원 (승리 시)`;
}

// ── View 4 → 5: 배팅 완료 → 게임 플레이 ────────────────────────────
function luckStep2Submit() {
    _luckShowView(5);
    _luckStartGame();
}

function _luckStartGame() {
    const type = _luck.selectedGame;
    document.getElementById('luckPlayGameTitle').textContent = `${_LUCK_GAME[type].icon} ${_LUCK_GAME[type].label}`;
    document.getElementById('luckRpsButtons').style.display      = type === 'rps'      ? 'flex' : 'none';
    document.getElementById('luckRouletteButtons').style.display = type === 'roulette' ? 'flex' : 'none';
    document.getElementById('luckDiceButtons').style.display     = type === 'dice'     ? 'flex' : 'none';

    if (type === 'rps')      _luckRpsStart();
    if (type === 'roulette') _luckRouletteStart();
    if (type === 'dice')     _luckDiceStart();
}

// ── 결과 처리 (3개 게임 공유) ──────────────────────────────────────
function _luckResolve(isWin, detail) {
    const p      = _luck.players[_luck.currentPlayerIdx];
    const type   = _luck.selectedGame;
    const amount = _luck.bet.amount;
    const multiplier = _luck.multipliers[type];
    const matured = isWin ? Math.round(amount * multiplier) : 0;

    sbInsertLuckHistory(_luck.gameId, p.user_id, type, amount, matured, isWin);

    if (isWin) {
        _luck.earnedRewards[p.nickname] = (_luck.earnedRewards[p.nickname] || 0) + matured;
        sbSaveLuckReward(_luck.gameId, p.user_id, _luck.earnedRewards[p.nickname]).catch(console.error);
    }

    document.getElementById('luckResultTitle').textContent = isWin ? '🎉 승리!' : '😢 실패';
    document.getElementById('luckRGame').textContent   = _LUCK_GAME[type].label;
    document.getElementById('luckRPlayer').textContent = `${p.nickname} (${p.real_name})`;
    document.getElementById('luckRBet').textContent    = amount.toLocaleString() + '원';
    document.getElementById('luckRReward').textContent = isWin ? matured.toLocaleString() + '원' : '0원';

    _luckShowView(6);
}

function luckNextStudent() {
    _luckRenderPlayerList();
    _luckShowView(2);
}

// ── 가위바위보 ─────────────────────────────────────────────────────
const _RPS_IMAGES = {
    scissors: 'image/luck/rps_scissors.png',
    rock:     'image/luck/rps_rock.png',
    paper:    'image/luck/rps_paper.png',
};
const _RPS_ORDER = ['scissors', 'rock', 'paper'];
const _RPS_BEATS = { scissors: 'paper', rock: 'scissors', paper: 'rock' };

function _luckRpsStart() {
    let i = 0;
    document.getElementById('luckGameImg').src = _RPS_IMAGES[_RPS_ORDER[0]];
    _luck.rpsCycleTimer = setInterval(() => {
        i = (i + 1) % _RPS_ORDER.length;
        document.getElementById('luckGameImg').src = _RPS_IMAGES[_RPS_ORDER[i]];
    }, 200);
}

function luckRpsPick(playerChoice) {
    clearInterval(_luck.rpsCycleTimer);
    _luck.rpsCycleTimer = null;
    document.getElementById('luckGameImg').src = _RPS_IMAGES[playerChoice];

    const computerChoice = _RPS_ORDER[Math.floor(Math.random() * 3)];
    const isWin = _RPS_BEATS[playerChoice] === computerChoice;
    _luckResolve(isWin, { playerChoice, computerChoice });
}
