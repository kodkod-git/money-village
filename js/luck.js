// js/luck.js
// [행운] 머니빌리지 행운 — 가위바위보 / 룰렛 색깔 맞추기 / 주사위 눈금 맞추기

const _LUCK_DEFAULT_BET = 1000;

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
    bet: { amount: _LUCK_DEFAULT_BET },
};

const _LUCK_GAME = {
    rps:      { label: '가위바위보',       icon: '✊' },
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
    _luckResetGameImg();
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
        const pl = findPlayer(r.user_id);
        if (!pl) return;
        _luck.earnedRewards[pl.nickname] = (_luck.earnedRewards[pl.nickname] || 0) + _luckHistoryRewardDelta(r);
    });

    _luckSyncMultiplierUI();
}

function _luckHistoryRewardDelta(record) {
    return record.is_win ? Number(record.matured_amount || 0) : -Number(record.amount || 0);
}

// ── 뷰 전환 (luckScreen 내 View 2~6) ─────────────────────────────
function _luckShowView(n) {
    const wrap = document.querySelector('#luckScreen .bank-screen-wrap');
    if (wrap) wrap.classList.toggle('is-luck-play-view', n === 5);
    [2, 3, 4, 5, 6].forEach(i => {
        const el = document.getElementById('luckView' + i);
        if (el) el.style.display = i === n ? (i === 2 ? 'flex' : 'block') : 'none';
    });
}

// ── View 2: 플레이어 목록 ────────────────────────────────────────
function _luckRewardBadgeText(earned) {
    const amount = Number(earned || 0);
    if (amount === 0) return '0원';
    const sign = amount < 0 ? '-' : '+';
    return `${sign}${Math.abs(amount)}원`;
}

function _luckRewardBadgeClass(earned) {
    const amount = Number(earned || 0);
    if (amount === 0) return 'luck-earned-badge--zero';
    return amount < 0 ? 'luck-earned-badge--negative' : 'luck-earned-badge--positive';
}

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
            const badgeClass = _luckRewardBadgeClass(earned);
            const headerHtml = `<span class="luck-earned-badge ${badgeClass}">${_luckRewardBadgeText(earned)}</span>`;
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
    // 참가자별로 게임 선택/배팅 금액을 초기화한다 — 초기화하지 않으면 이전 참가자가
    // 고른 게임·배팅액이 다음 참가자 화면에 그대로 이월되어 오배팅으로 이어진다.
    _luck.selectedGame = null;
    _luck.bet = { amount: _LUCK_DEFAULT_BET };
    const p = _luck.players[idx];
    document.getElementById('luckGameSelectPlayerName').textContent = `${p.nickname}(${p.real_name})의 게임 선택`;
    _luckSyncGameSelectUI();
    _luckShowView(3);
}

// 게임 전환/이탈 시 이전 게임이 남긴 공유 이미지 상태(RPS 타이머, 룰렛 스핀 등)를 초기화.
// rps/roulette/dice(Task 14) 등 game_img를 재사용하는 모든 미니게임이 여기서 정리됨.
function _luckResetGameImg() {
    if (_luck.rpsCycleTimer) {
        clearInterval(_luck.rpsCycleTimer);
        _luck.rpsCycleTimer = null;
    }
    if (_rouletteSpinFrame) {
        cancelAnimationFrame(_rouletteSpinFrame);
        _rouletteSpinFrame = null;
    }
    _rouletteLastTs = null;
    const img = document.getElementById('luckGameImg');
    if (img) {
        img.classList.remove('luck-roulette-spinning');
        img.classList.remove('luck-roulette-wheel');
        img.style.transform = '';
        img.style.transition = '';
        img.style.display = '';
    }
    const rouletteWheel = document.getElementById('luckRouletteWheel');
    if (rouletteWheel) {
        rouletteWheel.style.transform = '';
        rouletteWheel.style.transition = '';
        rouletteWheel.style.display = 'none';
    }
    const roulettePointer = document.getElementById('luckRoulettePointer');
    if (roulettePointer) roulettePointer.style.display = 'none';
    const rpsStage = document.getElementById('luckRpsStage');
    if (rpsStage) rpsStage.style.display = 'none';
    const rpsComputer = document.getElementById('luckRpsComputerImg');
    if (rpsComputer) rpsComputer.src = '';
    const rpsPlayer = document.getElementById('luckRpsPlayerImg');
    if (rpsPlayer) {
        rpsPlayer.src = '';
        rpsPlayer.style.display = 'none';
    }
    const rpsPlaceholder = document.getElementById('luckRpsPlayerPlaceholder');
    if (rpsPlaceholder) rpsPlaceholder.style.display = 'block';
    if (_diceRollFrame) {
        cancelAnimationFrame(_diceRollFrame);
        _diceRollFrame = null;
    }
    _diceResolveToken++;
    const model = document.getElementById('luckDiceModel');
    if (model) model.style.display = 'none';
}

function luckBackToList() {
    _luckResetGameImg();
    _luckShowView(2);
}

// ── View 3: 게임 선택 + 배팅 신청서 (한 화면) ───────────────────────
function luckSelectGame(type) {
    _luck.selectedGame = type;
    _luckSyncGameSelectUI();
}

function _luckSyncGameSelectUI() {
    ['rps', 'roulette', 'dice'].forEach(type => {
        const btn = document.getElementById('luckGameBtn' + _luckCap(type));
        if (btn) btn.classList.toggle('selected', _luck.selectedGame === type);
    });
    document.getElementById('luckBetAmountDisplay').textContent = _luck.bet.amount.toLocaleString() + '원';
    _luckUpdateBetPreview();
}

function luckAdjustBet(delta) {
    const next = _luck.bet.amount + delta;
    if (next < 0) return;
    _luck.bet.amount = next;
    document.getElementById('luckBetAmountDisplay').textContent = next.toLocaleString() + '원';
    _luckUpdateBetPreview();
}

function _luckUpdateBetPreview() {
    if (!_luck.selectedGame) {
        document.getElementById('luckBetPreviewBox').textContent = '게임을 선택하면 미리보기가 나와요!';
        return;
    }
    const mult = _luck.multipliers[_luck.selectedGame];
    const out  = Math.round(_luck.bet.amount * mult);
    document.getElementById('luckBetPreviewBox').textContent =
        `${_luck.bet.amount.toLocaleString()}원 → 🎉 ${out.toLocaleString()}원 (성공 시)`;
}

// ── View 3 → 5: 배팅 완료 → 게임 플레이 ────────────────────────────
function luckStep2Submit() {
    if (!_luck.selectedGame) {
        alert('게임을 선택해주세요.');
        return;
    }
    _luckShowView(5);
    _luckStartGame();
}

function _luckStartGame() {
    _luckResetGameImg();
    const type = _luck.selectedGame;
    document.getElementById('luckView6').style.display = 'none';
    _luckResetChoiceButtons();
    document.getElementById('luckPlayGameTitle').textContent = `${_LUCK_GAME[type].icon} ${_LUCK_GAME[type].label}`;
    document.getElementById('luckRpsButtons').style.display      = type === 'rps'      ? 'flex' : 'none';
    document.getElementById('luckRouletteButtons').style.display = type === 'roulette' ? 'flex' : 'none';
    document.getElementById('luckDiceButtons').style.display     = type === 'dice'     ? 'flex' : 'none';
    document.getElementById('luckRpsStage').style.display        = type === 'rps'      ? 'grid' : 'none';
    document.getElementById('luckGameImg').style.display         = (type === 'rps' || type === 'roulette') ? 'none' : '';

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

    _luck.earnedRewards[p.nickname] = (_luck.earnedRewards[p.nickname] || 0)
        + _luckHistoryRewardDelta({ is_win: isWin, amount, matured_amount: matured });
    sbSaveLuckReward(_luck.gameId, p.user_id, _luck.earnedRewards[p.nickname]).catch(console.error);

    document.getElementById('luckResultTitle').textContent = isWin ? '🎉 성공!' : '😢 실패';
    document.getElementById('luckRGame').textContent   = _LUCK_GAME[type].label;
    document.getElementById('luckRPlayer').textContent = `${p.nickname} (${p.real_name})`;
    document.getElementById('luckRBet').textContent    = amount.toLocaleString() + '원';
    document.getElementById('luckRReward').textContent = isWin ? matured.toLocaleString() + '원' : '0원';

    _luckDisableVisibleChoiceButtons();
    document.getElementById('luckView6').style.display = 'block';
}

function luckNextStudent() {
    _luckRenderPlayerList();
    _luckShowView(2);
}

function _luckResetChoiceButtons() {
    document.querySelectorAll('#luckRpsButtons .btn, #luckRouletteButtons .btn, #luckDiceButtons .btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('is-selected');
    });
}

function _luckDisableVisibleChoiceButtons() {
    document.querySelectorAll('#luckRpsButtons .btn, #luckRouletteButtons .btn, #luckDiceButtons .btn').forEach(btn => {
        btn.disabled = true;
    });
}

function _luckMarkSelectedChoice(groupId, choice) {
    document.querySelectorAll(`#${groupId} .btn`).forEach(btn => {
        btn.classList.toggle('is-selected', btn.dataset.choice === choice);
    });
}

// ── 가위바위보 ─────────────────────────────────────────────────────
const _RPS_IMAGES = {
    scissors: 'image/luck/rps_scissors.jpg',
    rock:     'image/luck/rps_rock.jpg',
    paper:    'image/luck/rps_paper.jpg',
};
const _RPS_ORDER = ['scissors', 'rock', 'paper'];
const _RPS_BEATS = { scissors: 'paper', rock: 'scissors', paper: 'rock' };

function _luckRpsStart() {
    let i = 0;
    document.getElementById('luckRpsComputerImg').src = _RPS_IMAGES[_RPS_ORDER[0]];
    document.getElementById('luckRpsPlayerPlaceholder').style.display = 'block';
    document.getElementById('luckRpsPlayerImg').style.display = 'none';
    _luck.rpsCycleTimer = setInterval(() => {
        i = (i + 1) % _RPS_ORDER.length;
        document.getElementById('luckRpsComputerImg').src = _RPS_IMAGES[_RPS_ORDER[i]];
    }, 200);
}

function luckRpsPick(playerChoice) {
    _luckMarkSelectedChoice('luckRpsButtons', playerChoice);
    clearInterval(_luck.rpsCycleTimer);
    _luck.rpsCycleTimer = null;
    document.getElementById('luckRpsPlayerPlaceholder').style.display = 'none';
    const playerImg = document.getElementById('luckRpsPlayerImg');
    playerImg.src = _RPS_IMAGES[playerChoice];
    playerImg.style.display = 'block';

    const computerChoice = _RPS_ORDER[Math.floor(Math.random() * 3)];
    document.getElementById('luckRpsComputerImg').src = _RPS_IMAGES[computerChoice];
    const isWin = _RPS_BEATS[playerChoice] === computerChoice;
    _luckResolve(isWin, { playerChoice, computerChoice });
}

// ── 룰렛 색깔 맞추기 ─────────────────────────────────────────────
const _ROULETTE_COLORS = [
    { key: 'red',    label: '빨강', color: '#DE4948' },
    { key: 'orange', label: '주황', color: '#F07854' },
    { key: 'green',  label: '초록', color: '#5ABDAA' },
    { key: 'blue',   label: '파랑', color: '#58B7DA' },
];
let _rouletteSpinFrame = null;
let _rouletteLastTs = null;
let _rouletteAngle = 0;

function _luckRoulettePoint(deg, radius = 50) {
    const rad = (deg - 90) * Math.PI / 180;
    return {
        x: 50 + radius * Math.cos(rad),
        y: 50 + radius * Math.sin(rad)
    };
}

function _luckRouletteSlicePath(startDeg, endDeg) {
    const start = _luckRoulettePoint(startDeg);
    const end = _luckRoulettePoint(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M 50 50 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A 50 50 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

function _luckRouletteCenterDeg(colorKey) {
    const index = _ROULETTE_COLORS.findIndex(c => c.key === colorKey);
    if (index < 0) return 0;
    const sliceDeg = 360 / _ROULETTE_COLORS.length;
    return index * sliceDeg + sliceDeg / 2;
}

function _luckBuildRouletteWheel() {
    const wheel = document.getElementById('luckRouletteWheel');
    if (!wheel) return null;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');

    const sliceDeg = 360 / _ROULETTE_COLORS.length;
    _ROULETTE_COLORS.forEach((color, index) => {
        const startDeg = index * sliceDeg;
        const endDeg = startDeg + sliceDeg;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', _luckRouletteSlicePath(startDeg, endDeg));
        path.setAttribute('fill', color.color);
        svg.appendChild(path);
    });

    const hub = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hub.setAttribute('cx', '50');
    hub.setAttribute('cy', '50');
    hub.setAttribute('r', '8');
    hub.setAttribute('fill', '#fff');
    hub.setAttribute('stroke', '#222');
    hub.setAttribute('stroke-width', '1.5');
    svg.appendChild(hub);

    wheel.replaceChildren(svg);
    return wheel;
}

function _luckRouletteStart() {
    const wheel = _luckBuildRouletteWheel();
    if (!wheel) return;
    const img = wheel;
    document.getElementById('luckRoulettePointer').style.display = 'block';
    wheel.style.display = 'block';
    wheel.style.transition = 'none';
    _rouletteAngle = 0;
    wheel.style.transform  = `rotate(${_rouletteAngle}deg)`;
    void img.offsetWidth; // 강제 리플로우 — transition 리셋
    _rouletteLastTs = null;

    function spin(ts) {
        if (_rouletteLastTs == null) _rouletteLastTs = ts;
        const elapsed = ts - _rouletteLastTs;
        _rouletteLastTs = ts;
        _rouletteAngle += elapsed * 1.35;
        img.style.transform = `rotate(${_rouletteAngle}deg)`;
        _rouletteSpinFrame = requestAnimationFrame(spin);
    }
    _rouletteSpinFrame = requestAnimationFrame(spin);
}

function luckRoulettePick(playerColor) {
    _luckMarkSelectedChoice('luckRouletteButtons', playerColor);
    _luckDisableVisibleChoiceButtons();
    const img = document.getElementById('luckRouletteWheel');
    if (_rouletteSpinFrame) {
        cancelAnimationFrame(_rouletteSpinFrame);
        _rouletteSpinFrame = null;
    }
    _rouletteLastTs = null;

    const winningColor = _ROULETTE_COLORS[Math.floor(Math.random() * _ROULETTE_COLORS.length)].key;
    const extraSpins = 4; // 멈추기 전 시각적으로 몇 바퀴 더 돌림
    const currentNormalized = ((_rouletteAngle % 360) + 360) % 360;
    const winningCenterDeg = _luckRouletteCenterDeg(winningColor);
    const winningTopDeg = (360 - winningCenterDeg) % 360;
    const deltaToWinningTop = (winningTopDeg - currentNormalized + 360) % 360;
    const targetDeg = _rouletteAngle + extraSpins * 360 + deltaToWinningTop;
    _rouletteAngle = targetDeg;
    img.style.transition = 'transform 1.4s cubic-bezier(0.12, 0.82, 0.18, 1)';
    img.style.transform  = `rotate(${targetDeg}deg)`;

    const isWin = playerColor === winningColor;
    setTimeout(() => _luckResolve(isWin, { playerColor, winningColor }), 1400);
}

// ── 주사위 눈금 맞추기 (3D GLB 모델, Three.js 직접 렌더링) ───────────
// model-viewer는 camera-controls 없이 orientation만 바꿔서는 화면을
// 다시 그리지 않는 경우가 있어(사용자 상호작용 없이는 내부 렌더 루프가
// 돌지 않는 것으로 확인됨), Three.js로 직접 씬/카메라/렌더러를 두고
// requestAnimationFrame으로 매 프레임 강제 렌더링한다.
// 각 눈금(1~6)이 카메라를 향할 때의 회전값(도). GLB 지오메트리만으로는
// 자동으로 신뢰성 있게 알아낼 수 없어, 실제 dice_spin.glb를 사람이 육안으로
// 보정 도구(scratchpad)에서 돌려보며 직접 확인해 채워 넣었다.
// (docs/superpowers/specs/2026-07-09-luck-dice-3d-design.md 참고)
const _DICE_FACE_ORIENTATION = {
    1: '0.0deg 0.0deg 0.0deg',
    2: '90.0deg 270.0deg 0.0deg',
    3: '180.0deg 0.0deg 0.0deg',
    4: '270.0deg 0.0deg 0.0deg',
    5: '180.0deg 270.0deg 0.0deg',
    6: '90.0deg 0.0deg 90.0deg',
};

let _diceRollFrame = null;
let _diceResolveToken = 0;
let _diceThree = null; // { scene, camera, renderer, diceGroup } — lazy 초기화, 재대결마다 재사용
let _diceCurrentOrientation = '0deg 0deg 0deg';

function _luckParseOrientation(str) {
    return str.split(' ').map(part => parseFloat(part));
}

function _luckLerpOrientation(fromStr, toStr, t) {
    const from = _luckParseOrientation(fromStr);
    const to   = _luckParseOrientation(toStr);
    const out  = from.map((v, i) => v + (to[i] - v) * t);
    return `${out[0]}deg ${out[1]}deg ${out[2]}deg`;
}

function _luckSetDiceRotation(orientationStr) {
    _diceCurrentOrientation = orientationStr;
    if (!_diceThree) return;
    const [x, y, z] = _luckParseOrientation(orientationStr);
    _diceThree.diceGroup.rotation.set(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180);
}

function _luckInitDiceThree() {
    if (_diceThree) return;
    const THREE = window.THREE;
    const container = document.getElementById('luckDiceModel');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, (container.clientWidth || 1) / (container.clientHeight || 1), 0.01, 100);
    camera.position.set(0, 0, 3);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dir1.position.set(2, 3, 4);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.9);
    dir2.position.set(-3, -2, -2);
    scene.add(dir2);

    const diceGroup = new THREE.Group();
    scene.add(diceGroup);

    _diceThree = { scene, camera, renderer, diceGroup };

    new window.GLTFLoader().load('image/luck/dice_spin.glb', (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 1.15 / maxDim;
        model.scale.setScalar(scale);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center.multiplyScalar(scale));
        diceGroup.add(model);
    });

    function renderLoop() {
        requestAnimationFrame(renderLoop);
        if (container.style.display === 'none') return;
        const w = container.clientWidth, h = container.clientHeight;
        if (w > 0 && h > 0 && (renderer.domElement.width !== w || renderer.domElement.height !== h)) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        renderer.render(scene, camera);
    }
    renderLoop();
}

function _luckDiceStart() {
    document.getElementById('luckGameImg').style.display = 'none';
    document.getElementById('luckDiceModel').style.display = 'block';
    _luckInitDiceThree();

    let angle = 0;
    function tumble() {
        angle += 6;
        _luckSetDiceRotation(`${angle % 360}deg ${(angle * 1.3) % 360}deg ${(angle * 0.7) % 360}deg`);
        _diceRollFrame = requestAnimationFrame(tumble);
    }
    _diceRollFrame = requestAnimationFrame(tumble);
}

function luckDiceStop(playerGuess) {
    _luckMarkSelectedChoice('luckDiceButtons', String(playerGuess));
    _luckDisableVisibleChoiceButtons();
    const face  = Math.floor(Math.random() * 6) + 1;
    const token = ++_diceResolveToken;
    cancelAnimationFrame(_diceRollFrame);
    _diceRollFrame = null;

    const startOrientation  = _diceCurrentOrientation;
    const targetOrientation = _DICE_FACE_ORIENTATION[face];
    const duration  = 600;
    const startTime = performance.now();

    // 시각적 정착 애니메이션 (rAF — 탭이 백그라운드면 멈출 수 있음)
    function settle(now) {
        if (token !== _diceResolveToken) { _diceRollFrame = null; return; }
        const t     = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        _luckSetDiceRotation(t < 1 ? _luckLerpOrientation(startOrientation, targetOrientation, eased) : targetOrientation);
        _diceRollFrame = t < 1 ? requestAnimationFrame(settle) : null;
    }
    _diceRollFrame = requestAnimationFrame(settle);

    // 결과 확정은 rAF와 분리해 setTimeout으로 처리한다.
    // rAF settle 안에서 _luckResolve를 부르면 탭이 백그라운드일 때 rAF가 멈춰
    // 결과가 영영 확정되지 않고(배팅만 "제출"된 상태) 방치됐다. setTimeout은 백그라운드에서도 동작한다.
    setTimeout(() => {
        if (token !== _diceResolveToken) return;
        cancelAnimationFrame(_diceRollFrame);
        _diceRollFrame = null;
        _luckSetDiceRotation(targetOrientation); // rAF가 멈췄던 경우 최종 자세 보정
        const isWin = face === playerGuess;
        _luckResolve(isWin, { face, playerGuess });
    }, duration + 50);
}
