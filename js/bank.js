// [은행 예금] 머니빌리지 은행 예금 시뮬레이터

const _bank = {
    settings:     { long: 2.0, mid: 1.5, short: 1.2 },
    teamSettings: { long: 2.5, mid: 2.0, short: 1.5 },
    gameId:   null,
    gameDate: null,
    gameType: null,
    players:  [],
    deposit:  { amount: 1000 },
    currentPlayerIdx: null,
    currentRound:    1,
    indivCompleted:  {},
    teamDeposits:    {},
    teamRewards:     {},  // { nickname: amount } — 팀 예금 보상 누적
    indivRewards:    {},  // { nickname: amount } — 개인 예금 보상 누적
    prevRoundsTotal: {},
    playerTypeTags:  {},
    teamTypeTags:    {},
    roundSnapshots:  [],
    viewMode:  'team',
};

let _bankRatioDebounceTimer = null;
function _bankDebounceRatioSave() {
    clearTimeout(_bankRatioDebounceTimer);
    _bankRatioDebounceTimer = setTimeout(() => {
        if (!_bank.gameId) return;
        sbUpsertBankState(_bank.gameId, {
            long_ratio: _bank.settings.long,
            mid_ratio: _bank.settings.mid,
            short_ratio: _bank.settings.short,
            team_long_ratio: _bank.teamSettings.long,
            team_mid_ratio: _bank.teamSettings.mid,
            team_short_ratio: _bank.teamSettings.short
        });
    }, 1000);
}

const _BANK_TYPE = {
    long:  { label: '장기 🏦', round: '1라운드' },
    mid:   { label: '중기 ⏳', round: '2라운드' },
    short: { label: '단기 ⚡', round: '3라운드' }
};

const _ROUND_TYPE = { 1: 'long', 2: 'mid', 3: 'short' };

const _ROUND_TITLE = {
    1: '1라운드 장기 예금 신청',
    2: '2라운드 중기 예금 신청',
    3: '3라운드 단기 예금 신청'
};

// ── 설정 영속화 ────────────────────────────────────────────────────
function _bankLoad() {
    try {
        const s = JSON.parse(localStorage.getItem('mv_bank_settings') || '{}');
        if (s.long      >= 1) _bank.settings.long     = s.long;
        if (s.mid       >= 1) _bank.settings.mid      = s.mid;
        if (s.short     >= 1) _bank.settings.short    = s.short;
        if (s.teamLong  >= 1) _bank.teamSettings.long  = s.teamLong;
        if (s.teamMid   >= 1) _bank.teamSettings.mid   = s.teamMid;
        if (s.teamShort >= 1) _bank.teamSettings.short = s.teamShort;
    } catch(e) {}
}

function _bankSave() {
    localStorage.setItem('mv_bank_settings', JSON.stringify({
        long: _bank.settings.long, mid: _bank.settings.mid, short: _bank.settings.short,
        teamLong: _bank.teamSettings.long, teamMid: _bank.teamSettings.mid, teamShort: _bank.teamSettings.short
    }));
}

// ── 뷰 전환 (bankScreen 내 View 2/3/4) ───────────────────────────
function _bankShowView(n) {
    const wrap = document.querySelector('#bankScreen .bank-screen-wrap');
    if (wrap) wrap.classList.toggle('is-list-view', n === 2);
    [2, 3, 4].forEach(i => {
        const el = document.getElementById('bankView' + i);
        if (el) el.style.display = i === n ? (i === 2 ? 'flex' : 'block') : 'none';
    });
}

// ── 모달 열기/닫기 ─────────────────────────────────────────────────
async function openBankModal() {
    _bankLoad();
    _bankSyncRatioUI();
    _bankResetModal();
    document.getElementById('bankModal').classList.add('show');

    const loading = document.getElementById('bankGameLoading');
    const select  = document.getElementById('bankDateSelect');
    try {
        loading.style.display = 'block';
        const dates = await sbGetGameDates();
        loading.style.display = 'none';
        if (dates.length === 0) {
            document.getElementById('bankGameCardsGrid').innerHTML =
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
        document.getElementById('bankGameCardsGrid').innerHTML =
            '<p style="color:#d32f2f;font-size:13px;text-align:center;">날짜 목록 불러오기 실패</p>';
    }
}

function closeBankModal(force = false) {
    if (!force && !confirm('현재 작성중인 내용이 사라집니다\n종료하시겠습니까?')) return;
    document.getElementById('bankModal').classList.remove('show');
}

function handleBankModalBackdrop(e) {
    if (e.target === document.getElementById('bankModal')) closeBankModal();
}

function _bankResetModal() {
    document.getElementById('bankDateSelect').innerHTML =
        '<option value="">-- 날짜를 선택하세요 --</option>';
    document.getElementById('bankGameCardsGrid').innerHTML = '';
    document.getElementById('bankGameLoading').style.display = 'none';
    document.getElementById('bankStep1Btn').disabled = true;
    document.getElementById('bankStep1Btn').textContent = '설정 완료';
    document.getElementById('bankRatioSection').style.display = 'none';
    const teamSection = document.getElementById('bankTeamRatioSection');
    if (teamSection) teamSection.style.display = 'none';
    _bank.gameId   = null;
    _bank.gameDate = null;
    _bank.gameType = null;
}

// ── View 1(모달): 날짜·게임 선택 + 배율 설정 ──────────────────────
async function onBankDateChange() {
    const date    = document.getElementById('bankDateSelect').value;
    const grid    = document.getElementById('bankGameCardsGrid');
    const loading = document.getElementById('bankGameLoading');

    grid.innerHTML = '';
    document.getElementById('bankStep1Btn').disabled = true;
    document.getElementById('bankRatioSection').style.display = 'none';
    _bank.gameId = null;

    if (!date) return;

    loading.style.display = 'block';
    try {
        const games = await sbGetGamesByDate(date);
        loading.style.display = 'none';
        if (!games || games.length === 0) {
            grid.innerHTML = '<p style="color:#888;font-size:13px;text-align:center;">해당 날짜에 게임 기록이 없습니다.</p>';
            return;
        }
        games.forEach((g, idx) => {
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
            card.onclick = () => _bankSelectGame(g.game_id, date, g.section_num, g.game_type, card);
            grid.appendChild(card);
        });
    } catch(e) {
        loading.style.display = 'none';
        grid.innerHTML = `<p style="color:#d32f2f;font-size:13px;text-align:center;">불러오기 실패: ${e.message}</p>`;
    }
}

async function _bankSelectGame(gameId, date, sectionNum, gameType, cardEl) {
    document.querySelectorAll('#bankGameCardsGrid .past-game-card')
        .forEach(c => c.classList.remove('bank-selected'));
    cardEl.classList.add('bank-selected');
    _bank.gameId     = gameId;
    _bank.gameDate   = date;
    _bank.sectionNum = sectionNum;
    _bank.gameType   = gameType;
    document.getElementById('bankRatioSection').style.display = 'block';
    const teamSection = document.getElementById('bankTeamRatioSection');
    if (teamSection) teamSection.style.display = gameType === 'team' ? 'block' : 'none';
    document.getElementById('bankStep1Btn').disabled = false;

    _bank._dbSettings = null;
    try {
        const saved = await sbGetBankState(gameId);
        if (saved) {
            _bank._dbSettings = {
                L: saved.long_ratio, M: saved.mid_ratio, S: saved.short_ratio,
                TL: saved.team_long_ratio, TM: saved.team_mid_ratio, TS: saved.team_short_ratio
            };
            _bank.settings.long = saved.long_ratio; _bank.settings.mid = saved.mid_ratio; _bank.settings.short = saved.short_ratio;
            _bank.teamSettings.long = saved.team_long_ratio; _bank.teamSettings.mid = saved.team_mid_ratio; _bank.teamSettings.short = saved.team_short_ratio;
            _bankSyncRatioUI();
        }
    } catch(e) {}
}

function bankAdjustRatio(type, delta, isTeam = false) {
    const store  = isTeam ? _bank.teamSettings : _bank.settings;
    const prefix = isTeam ? 'bankTeam' : 'bank';
    const next = Math.round((store[type] + delta) * 10) / 10;
    if (next < 1.0) return;
    store[type] = next;
    document.getElementById(prefix + _bankCap(type) + 'RatioDisplay').textContent = next.toFixed(1) + '배';
    _bankDebounceRatioSave();
}

function _bankSyncRatioUI() {
    ['long', 'mid', 'short'].forEach(t => {
        const el = document.getElementById('bank' + _bankCap(t) + 'RatioDisplay');
        if (el) el.textContent = _bank.settings[t].toFixed(1) + '배';
        const teamEl = document.getElementById('bankTeam' + _bankCap(t) + 'RatioDisplay');
        if (teamEl) teamEl.textContent = _bank.teamSettings[t].toFixed(1) + '배';
    });
}

async function bankStep1Complete() {
    if (!_bank.gameId) return;
    _bankSave();

    const btn = document.getElementById('bankStep1Btn');
    btn.disabled = true;
    btn.textContent = '불러오는 중...';

    try {
        _bank.players = await sbGetPlayersByGameId(_bank.gameId);
        btn.disabled = false;
        btn.textContent = '설정 완료';

        if (_bank.players.length === 0) {
            alert('해당 게임에 참가자 정보가 없습니다.');
            return;
        }

        // 게임 정보 표시
        const section = String(_bank.sectionNum || 1).padStart(2, '0');
        const infoEl = document.getElementById('bankGameInfo');
        if (infoEl) infoEl.textContent = `${_bank.gameDate} · ${section}분반`;

        if (_bank._dbSettings) {
            const d = _bank._dbSettings;
            const changed = _bank.settings.long !== d.L || _bank.settings.mid !== d.M || _bank.settings.short !== d.S
                         || _bank.teamSettings.long !== d.TL || _bank.teamSettings.mid !== d.TM || _bank.teamSettings.short !== d.TS;
            if (changed) {
                const isTeam = _bank.gameType === 'team';
                const msg = isTeam
                    ? `이자배율이 변경되었습니다.\n장기: ${_bank.settings.long}배 / 중기: ${_bank.settings.mid}배 / 단기: ${_bank.settings.short}배\n팀 장기: ${_bank.teamSettings.long}배 / 팀 중기: ${_bank.teamSettings.mid}배 / 팀 단기: ${_bank.teamSettings.short}배\n정말 변경하시겠습니까?`
                    : `이자배율이 변경되었습니다.\n장기: ${_bank.settings.long}배 / 중기: ${_bank.settings.mid}배 / 단기: ${_bank.settings.short}배\n정말 변경하시겠습니까?`;
                if (!confirm(msg)) return;
            }
        }
        _bank.indivCompleted  = {};
        _bank.teamDeposits    = {};
        _bank.teamRewards     = {};
        _bank.indivRewards    = {};
        _bank.prevRoundsTotal = {};
        _bank.playerTypeTags  = {};
        _bank.teamTypeTags    = {};
        _bank.roundSnapshots  = [];
        _bank.currentRound    = 1;
        _bank.currentPlayerIdx = null;
        _bank.viewMode        = 'team';
        await sbUpsertBankState(_bank.gameId, {
            long_ratio: _bank.settings.long, mid_ratio: _bank.settings.mid, short_ratio: _bank.settings.short,
            team_long_ratio: _bank.teamSettings.long, team_mid_ratio: _bank.teamSettings.mid, team_short_ratio: _bank.teamSettings.short
        });
        await _bankPollAndMerge();
        _bankRenderPlayerList();
        closeBankModal(true);
        switchScreen('bankScreen');
        _bankShowView(2);
    } catch(e) {
        btn.disabled = false;
        btn.textContent = '설정 완료';
        alert('플레이어 로드 실패: ' + e.message);
    }
}

// ── View 2: 플레이어 리스트 ─────────────────────────────────────────
function bankSetViewMode(mode) {
    _bank.viewMode = mode;
    _bankRenderPlayerList();
}

function _bankRenderPlayerList() {
    // 라운드 제목 업데이트
    const titleEl = document.getElementById('bankRoundTitle');
    if (titleEl) {
        titleEl.textContent = _ROUND_TITLE[_bank.currentRound] || '예금 신청 종료';
    }

    // 이자배율 뱃지 업데이트
    const ratioBadgeEl = document.getElementById('bankRatioBadge');
    if (ratioBadgeEl) {
        const type = _ROUND_TYPE[_bank.currentRound];
        if (type) {
            const isTeamView = _bank.gameType === 'team' && _bank.viewMode === 'team';
            const rate = isTeamView ? _bank.teamSettings[type] : _bank.settings[type];
            ratioBadgeEl.textContent = `보상: ${rate}배`;
            ratioBadgeEl.style.display = 'inline-block';
        } else {
            ratioBadgeEl.style.display = 'none';
        }
    }

    // 이전/다음 라운드 버튼 상태 업데이트
    const backBtn = document.getElementById('bankGoBackRoundBtn');
    if (backBtn) {
        backBtn.disabled = _bank.currentRound <= 1 || _bank.roundSnapshots.length === 0;
    }
    const advBtn = document.getElementById('bankAdvanceRoundBtn');
    if (advBtn) {
        const isEnded = _bank.currentRound >= 4;
        advBtn.disabled    = isEnded;
        advBtn.textContent = _bank.currentRound === 3 ? '예금 신청 종료 →'
                           : isEnded               ? '종료됨'
                           :                          '다음 라운드 →';
    }

    const grid   = document.getElementById('bankPlayerGrid');
    const isTeam = _bank.players.some(p => p.team_name);
    grid.innerHTML = '';

    const tabBar = document.getElementById('bankTabBar');
    tabBar.style.display = isTeam ? 'flex' : 'none';
    if (isTeam) {
        document.getElementById('bankTabTeam').classList.toggle('active', _bank.viewMode === 'team');
        document.getElementById('bankTabIndiv').classList.toggle('active', _bank.viewMode === 'individual');
    }

    const isTeamTab = isTeam && _bank.viewMode === 'team';
    grid.classList.toggle('is-team', isTeamTab);

    function _getPlayerDone(p, idx) {
        if (isTeamTab) {
            const td = _bank.teamDeposits[p.team_name];
            return (td && td.members && td.members[idx] !== undefined) ? { type: td.type } : null;
        }
        return _bank.indivCompleted[idx] || null;
    }

    function _bankMakePlayerCard(p, idx, done) {
        const disabled = !!done || _bank.currentRound >= 4;
        const card = document.createElement('div');
        card.className = 'bank-player-card'
            + (done ? ' completed' : '')
            + (disabled ? ' is-disabled' : '');
        card.innerHTML = `<div class="bank-player-name-row"><span class="bank-player-nickname">${p.nickname}</span></div>`;
        if (!disabled) card.onclick = () => bankSelectPlayer(idx);
        return card;
    }

    if (!isTeam || _bank.viewMode === 'individual') {
        const sorted = _bank.players
            .map((p, idx) => ({ p, idx }))
            .sort((a, b) => {
                if (isTeam) {
                    const teamCmp = (a.p.team_name || '').localeCompare(b.p.team_name || '', 'ko');
                    if (teamCmp !== 0) return teamCmp;
                }
                return (a.p.nickname || '').localeCompare(b.p.nickname || '', 'ko');
            });
        sorted.forEach(({ p, idx }) => {
            const done = _getPlayerDone(p, idx);
            const typeTags = (_bank.playerTypeTags[p.nickname] || [])
                .map(t => `<span class="bank-status-type">${_BANK_TYPE[t].label}</span>`)
                .join('');
            const statusTag = done ? '' : `<span class="bank-status-pending">신청 전</span>`;

            const groupEl = document.createElement('div');
            groupEl.className = 'team-group' + (done ? ' team-done' : '');

            const header = document.createElement('div');
            header.className = 'team-group-header';
            const entryResetBtn = done ? `<button class="card-reset-btn" onclick="event.stopPropagation(); bankResetEntry(${idx})" title="초기화">↻</button>` : '';
            const doneBadge = done ? `<span class="bank-done-badge">신청완료</span>` : '';
            header.innerHTML = `${doneBadge}${statusTag}${entryResetBtn}`;
            groupEl.appendChild(header);

            const playersEl = document.createElement('div');
            playersEl.className = 'team-group-players';
            playersEl.style.gridTemplateColumns = '1fr';
            playersEl.appendChild(_bankMakePlayerCard(p, idx, done));
            if (typeTags) {
                const tagsEl = document.createElement('div');
                tagsEl.className = 'bank-player-indiv-tags';
                tagsEl.innerHTML = typeTags;
                playersEl.appendChild(tagsEl);
            }

            groupEl.appendChild(playersEl);
            grid.appendChild(groupEl);
        });
        return;
    }

    const teams = new Map();
    _bank.players.forEach((p, idx) => {
        const key = p.team_name;
        if (!teams.has(key)) teams.set(key, []);
        teams.get(key).push({ p, idx });
    });

    const sortedTeams = [...teams.entries()].sort(([a], [b]) => a.localeCompare(b, 'ko'));
    sortedTeams.forEach(([teamKey, members]) => {
        members.sort((a, b) => (a.p.nickname || '').localeCompare(b.p.nickname || '', 'ko'));
        const teamSize     = members.length;
        const td           = _bank.teamDeposits[teamKey];
        const completedCnt = td && td.members ? Object.keys(td.members).length : 0;
        const allDone      = completedCnt === teamSize;

        const groupEl = document.createElement('div');
        groupEl.className = 'team-group' + (allDone ? ' team-done' : '');

        const header = document.createElement('div');
        header.className = 'team-group-header';
        const teamTypeTagsHtml = (_bank.teamTypeTags[teamKey] || [])
            .map(t => `<span class="bank-status-type">${_BANK_TYPE[t].label}</span>`)
            .join('');
        const teamEntryResetBtn = completedCnt > 0 ? `<button class="card-reset-btn" onclick="event.stopPropagation(); bankResetEntry(${members[0].idx})" title="초기화">↻</button>` : '';
        const bankProgressClass = completedCnt > 0 ? ' in-progress' : '';
        const progressBadge = allDone ? `<span class="bank-done-badge">신청완료</span>` : `<span class="bank-team-progress-badge${bankProgressClass}">[${completedCnt}/${teamSize}]</span>`;
        header.innerHTML = `<span>${teamKey || '무소속'}</span>${progressBadge}${teamTypeTagsHtml}${teamEntryResetBtn}`;
        groupEl.appendChild(header);

        const playersEl = document.createElement('div');
        playersEl.className = 'team-group-players';
        playersEl.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        members.forEach(({ p, idx }) => {
            const done = _getPlayerDone(p, idx);
            playersEl.appendChild(_bankMakePlayerCard(p, idx, done));
        });

        groupEl.appendChild(playersEl);
        grid.appendChild(groupEl);
    });
}

function bankSelectPlayer(idx) {
    const p = _bank.players[idx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    _bank.currentPlayerIdx = idx;
    document.getElementById('bankDepositPlayerName').textContent =
        `${p.nickname}(${p.real_name})의 예금 신청`;

    // 이전 금액 복원 (덮어쓰기 지원)
    let prevAmount = 0;
    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        if (td && td.members && td.members[idx] !== undefined) prevAmount = td.members[idx];
    } else {
        if (_bank.indivCompleted[idx]) prevAmount = _bank.indivCompleted[idx].amount;
    }

    _bank.deposit = { amount: prevAmount };
    document.getElementById('bankAmountDisplay').textContent = prevAmount.toLocaleString() + '원';
    _bankUpdatePreview();

    _bankShowView(3);
}

function bankBackToList() {
    _bankShowView(2);
}

// ── View 3: 예금 신청 ──────────────────────────────────────────────
function bankAdjustAmount(delta) {
    const next = _bank.deposit.amount + delta;
    if (next < 0) return;
    _bank.deposit.amount = next;
    document.getElementById('bankAmountDisplay').textContent = next.toLocaleString() + '원';
    _bankUpdatePreview();
}

function _bankUpdatePreview() {
    const type   = _ROUND_TYPE[_bank.currentRound];
    const amount = _bank.deposit.amount;
    const box    = document.getElementById('bankPreviewBox');

    const p = _bank.players[_bank.currentPlayerIdx];
    if (!p) return;
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        const prevSelf   = td && td.members ? (td.members[_bank.currentPlayerIdx] || 0) : 0;
        const alreadySum = td && td.members
            ? Object.values(td.members).reduce((a, b) => a + b, 0) - prevSelf : 0;
        const totalPrincipal = alreadySum + amount;
        const totalMatured   = Math.round(totalPrincipal * _bank.teamSettings[type]);
        box.textContent = `${totalPrincipal.toLocaleString()}원 → 💰 ${totalMatured.toLocaleString()}원`;
    } else {
        const out = Math.round(amount * _bank.settings[type]);
        box.textContent = `${amount.toLocaleString()}원 → 💰 ${out.toLocaleString()}원`;
    }
}

async function bankStep2Submit() {
    const type   = _ROUND_TYPE[_bank.currentRound];
    const amount = _bank.deposit.amount;
    const p = _bank.players[_bank.currentPlayerIdx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;
    if (isTeamTab) {
        _bankSubmitTeam(p, type, amount);
    } else {
        _bankSubmitIndividual(p, type, amount);
    }
}

function _bankSaveReward(nickname, source, amount) {
    if (source === 'team') _bank.teamRewards[nickname] = amount;
    else                   _bank.indivRewards[nickname] = amount;
    const total = (_bank.prevRoundsTotal[nickname] || 0)
                + (_bank.teamRewards[nickname]   || 0)
                + (_bank.indivRewards[nickname]  || 0);
    sbSaveDepositReward(_bank.gameId, nickname, total).catch(console.error);
}

function _bankSubmitIndividual(p, type, amount) {
    const ratio    = _bank.settings[type];
    const maturity = Math.round(amount * ratio);
    const interest = maturity - amount;

    _bankSaveReward(p.nickname, 'indiv', maturity);
    _bank.indivCompleted[_bank.currentPlayerIdx] = { type, amount };
    sbUpsertBankHistory(_bank.gameId, p.nickname, _bank.currentRound, type, amount, maturity, false);

    // 누적 타입 태그
    if (!_bank.playerTypeTags[p.nickname]) _bank.playerTypeTags[p.nickname] = [];
    if (!_bank.playerTypeTags[p.nickname].includes(type)) {
        _bank.playerTypeTags[p.nickname].push(type);
    }

    document.getElementById('bankTeamStatusSection').style.display = 'none';
    document.getElementById('bankRTeamPendingMsg').style.display   = 'none';

    document.getElementById('bankResultRoundBadge').textContent = _BANK_TYPE[type].round;
    document.getElementById('bankRType').textContent      = _BANK_TYPE[type].label;
    document.getElementById('bankRPlayer').textContent    = `${p.nickname} (${p.real_name})`;
    document.getElementById('bankRPrincipal').textContent = amount.toLocaleString() + '원';
    document.getElementById('bankRInterest').textContent  = interest.toLocaleString() + '원';
    document.getElementById('bankRTotal').textContent     = maturity.toLocaleString() + '원';

    _bankShowView(4);
}

function _bankSubmitTeam(p, type, amount) {
    const teamName = p.team_name;
    if (!_bank.teamDeposits[teamName]) {
        _bank.teamDeposits[teamName] = { type, members: {} };
    }
    _bank.teamDeposits[teamName].type = type;
    _bank.teamDeposits[teamName].members[_bank.currentPlayerIdx] = amount;
    sbUpsertBankHistory(_bank.gameId, p.nickname, _bank.currentRound, type, amount, 0, true);

    const teamMembers  = _bank.players.filter(pl => pl.team_name === teamName);
    const teamSize     = teamMembers.length;
    const td           = _bank.teamDeposits[teamName];
    const completedCnt = Object.keys(td.members).length;
    const allDone      = completedCnt === teamSize;

    const totalPrincipal = Object.values(td.members).reduce((a, b) => a + b, 0);
    const totalMatured   = Math.round(totalPrincipal * _bank.teamSettings[type]);

    let perMemberReward = null;
    if (allDone) {
        const totalInterest = totalMatured - totalPrincipal;
        perMemberReward = Math.floor(totalInterest / teamSize);
        teamMembers.forEach(pl => {
            const memberIdx = _bank.players.findIndex(x => x === pl);
            const memberPrincipal = td.members[memberIdx] || 0;
            _bankSaveReward(pl.nickname, 'team', memberPrincipal + perMemberReward);
        });
        teamMembers.forEach(pl => {
            const memberIdx = _bank.players.findIndex(x => x === pl);
            const memberPrincipal = td.members[memberIdx] || 0;
            const memberMatured = memberPrincipal + perMemberReward;
            sbUpsertBankHistory(_bank.gameId, pl.nickname, _bank.currentRound, type, memberPrincipal, memberMatured, true);
        });

        // 누적 타입 태그 — 팀 헤더
        if (!_bank.teamTypeTags[teamName]) _bank.teamTypeTags[teamName] = [];
        if (!_bank.teamTypeTags[teamName].includes(type)) {
            _bank.teamTypeTags[teamName].push(type);
        }
    }

    document.getElementById('bankResultRoundBadge').textContent = _BANK_TYPE[type].round;
    document.getElementById('bankRType').textContent      = _BANK_TYPE[type].label;
    document.getElementById('bankRPlayer').textContent    = `${p.nickname} (${p.real_name})`;
    document.getElementById('bankRPrincipal').textContent = amount.toLocaleString() + '원';

    if (allDone) {
        document.getElementById('bankRInterest').textContent = perMemberReward.toLocaleString() + '원 (팀 균등 분배)';
        document.getElementById('bankRTotal').textContent    = (amount + perMemberReward).toLocaleString() + '원';
    } else {
        document.getElementById('bankRInterest').textContent = '팀 완료 후 확정';
        document.getElementById('bankRTotal').textContent    = '팀 완료 후 확정';
    }

    document.getElementById('bankTeamStatusSection').style.display = 'block';
    document.getElementById('bankRTeamBadge').textContent   = `[${completedCnt}/${teamSize}]`;
    document.getElementById('bankRTeamPreview').textContent = `${totalPrincipal.toLocaleString()}원 → ${totalMatured.toLocaleString()}원`;
    document.getElementById('bankRTeamPendingMsg').style.display = allDone ? 'none' : 'block';

    _bankShowView(4);
}

// ── 라운드 전환 ────────────────────────────────────────────────────
function bankGoBackRound() {
    if (_bank.currentRound <= 1) { alert('첫 번째 라운드입니다.'); return; }
    if (!confirm('이전 라운드로 돌아갑니다.\n현재 라운드 입력 내용은 초기화됩니다.\n계속하시겠습니까?')) return;

    const snapshot = _bank.roundSnapshots.pop();
    if (!snapshot) { alert('이전 라운드 데이터가 없습니다.'); return; }

    _bank.currentRound    = snapshot.round;
    _bank.teamDeposits    = snapshot.teamDeposits;
    _bank.indivCompleted  = snapshot.indivCompleted;
    _bank.teamRewards     = snapshot.teamRewards;
    _bank.indivRewards    = snapshot.indivRewards;
    _bank.prevRoundsTotal = snapshot.prevRoundsTotal;
    _bank.playerTypeTags  = snapshot.playerTypeTags;
    _bank.teamTypeTags    = snapshot.teamTypeTags;

    sbUpsertBankState(_bank.gameId, { current_round: _bank.currentRound });
    _bankRenderPlayerList();
    _bankShowView(2);
}

function bankAdvanceRound() {
    const isLast = _bank.currentRound >= 3;
    const label  = isLast ? '예금 신청을 종료합니다' : '다음 라운드로 넘어갑니다';
    if (!confirm(`${label}.\n미완료 팀 신청은 원금만 반환됩니다.\n마감하시겠습니까?`)) return;

    _bank.roundSnapshots.push({
        round:          _bank.currentRound,
        teamDeposits:   JSON.parse(JSON.stringify(_bank.teamDeposits)),
        indivCompleted: JSON.parse(JSON.stringify(_bank.indivCompleted)),
        teamRewards:    JSON.parse(JSON.stringify(_bank.teamRewards)),
        indivRewards:   JSON.parse(JSON.stringify(_bank.indivRewards)),
        prevRoundsTotal:JSON.parse(JSON.stringify(_bank.prevRoundsTotal)),
        playerTypeTags: JSON.parse(JSON.stringify(_bank.playerTypeTags)),
        teamTypeTags:   JSON.parse(JSON.stringify(_bank.teamTypeTags)),
    });

    // 미완료 팀: 일부만 신청한 경우 신청 멤버에게 원금 반환
    for (const [teamName, td] of Object.entries(_bank.teamDeposits)) {
        const teamMembers = _bank.players.filter(pl => pl.team_name === teamName);
        const completedCnt = td.members ? Object.keys(td.members).length : 0;
        if (completedCnt > 0 && completedCnt < teamMembers.length) {
            for (const [memberIdxStr, amount] of Object.entries(td.members)) {
                const pl = _bank.players[parseInt(memberIdxStr)];
                if (pl) {
                    _bankSaveReward(pl.nickname, 'team', amount);
                    sbUpsertBankHistory(_bank.gameId, pl.nickname, _bank.currentRound, td.type, amount, amount, true);
                }
            }
        }
    }

    // 현재 라운드 보상을 prevRoundsTotal에 스냅샷
    const allNicks = new Set([
        ...Object.keys(_bank.teamRewards),
        ...Object.keys(_bank.indivRewards)
    ]);
    allNicks.forEach(nick => {
        _bank.prevRoundsTotal[nick] = (_bank.prevRoundsTotal[nick] || 0)
            + (_bank.teamRewards[nick]  || 0)
            + (_bank.indivRewards[nick] || 0);
    });

    // 라운드 레벨 상태 리셋 (미완료 팀은 무효 처리)
    _bank.teamRewards    = {};
    _bank.indivRewards   = {};
    _bank.indivCompleted = {};
    _bank.teamDeposits   = {};
    _bank.currentRound   = Math.min(_bank.currentRound + 1, 4);
    sbUpsertBankState(_bank.gameId, { current_round: _bank.currentRound });

    _bankRenderPlayerList();
    _bankShowView(2);
}

// ── View 4: 결과 ───────────────────────────────────────────────────
function bankNextStudent() {
    _bankRenderPlayerList();
    _bankShowView(2);
}

// ── 초기화 ─────────────────────────────────────────────────────────
async function bankReset() {
    if (!_bank.gameId) return;
    if (!confirm('이전에 기록되었던 모든 데이터가 삭제됩니다.\n초기화 하시겠습니까?')) return;

    const result = await sbDeleteBankHistory(_bank.gameId);
    if (!result.success) { alert('초기화에 실패했습니다. 다시 시도해주세요.'); return; }

    _bank.indivCompleted  = {};
    _bank.teamDeposits    = {};
    _bank.teamRewards     = {};
    _bank.indivRewards    = {};
    _bank.prevRoundsTotal = {};
    _bank.playerTypeTags  = {};
    _bank.teamTypeTags    = {};
    _bank.roundSnapshots  = [];
    _bank.currentRound    = 1;

    await sbUpsertBankState(_bank.gameId, { current_round: 1 });
    _bankRenderPlayerList();
}

// ── 개별 카드 초기화 ────────────────────────────────────────────────
async function bankResetEntry(playerIdx) {
    const p = _bank.players[playerIdx];
    if (!p || !_bank.gameId) return;
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    if (!confirm('이 항목의 예금 신청 내역을 삭제하시겠습니까?')) return;

    let nicknames, isTeam;
    if (isTeamTab) {
        const teamMembers = _bank.players.filter(pl => pl.team_name === p.team_name);
        nicknames = teamMembers.map(pl => pl.nickname);
        isTeam = true;
    } else {
        nicknames = [p.nickname];
        isTeam = false;
    }

    const result = await sbDeleteBankHistoryEntries(_bank.gameId, nicknames, _bank.currentRound, isTeam);
    if (!result.success) { alert('초기화에 실패했습니다.'); return; }

    await _bankPollAndMerge();

    for (const nick of nicknames) {
        const total = (_bank.prevRoundsTotal[nick] || 0)
                    + (_bank.teamRewards[nick]   || 0)
                    + (_bank.indivRewards[nick]  || 0);
        sbSaveDepositReward(_bank.gameId, nick, total).catch(console.error);
    }
}

// ── Util ───────────────────────────────────────────────────────────
function _bankCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── 멀티-태블릿 동기화 폴링 ────────────────────────────────────────
let _bankSyncTimer = null;

function _bankStartSync() {
    if (_bankSyncTimer) return;
    _bankSyncTimer = setInterval(_bankPollAndMerge, 3000);
}

function _bankStopSync() {
    clearInterval(_bankSyncTimer);
    _bankSyncTimer = null;
    clearTimeout(_bankRatioDebounceTimer);
    _bankRatioDebounceTimer = null;
}

async function _bankPollAndMerge() {
    if (!_bank.gameId) return;
    try {
        const [state, history] = await Promise.all([
            sbGetBankState(_bank.gameId),
            sbGetBankHistory(_bank.gameId)
        ]);
        if (!state) return;
        _bankMergeRemoteState(state, history || []);
        if (document.getElementById('bankView2') &&
            document.getElementById('bankView2').style.display !== 'none') {
            _bankRenderPlayerList();
        }
    } catch (e) {
        console.warn('[bankSync] poll failed:', e.message);
    }
}

function _bankMergeRemoteState(state, history) {
    // 배율 동기화
    _bank.settings.long  = state.long_ratio;
    _bank.settings.mid   = state.mid_ratio;
    _bank.settings.short = state.short_ratio;
    _bank.teamSettings.long  = state.team_long_ratio;
    _bank.teamSettings.mid   = state.team_mid_ratio;
    _bank.teamSettings.short = state.team_short_ratio;

    const remoteRound = state.current_round ?? 1;

    // 라운드 전환 감지: 원격과 로컬이 다르면 동기화 (전진 및 후퇴 모두 처리)
    if (remoteRound !== _bank.currentRound) {
        _bank.currentRound   = remoteRound;
        _bank.indivCompleted = {};
        _bank.teamDeposits   = {};
        _bank.teamRewards    = {};
        _bank.indivRewards   = {};
    }

    // prevRoundsTotal: 현재 라운드 미만 행의 matured_amount 합산
    const prevTotals = {};
    history.filter(r => r.round_num < _bank.currentRound).forEach(r => {
        prevTotals[r.nickname] = (prevTotals[r.nickname] || 0) + (r.matured_amount || 0);
    });
    _bank.prevRoundsTotal = prevTotals;

    // 현재 라운드 행으로 indivCompleted / teamDeposits 재구성
    _bank.indivCompleted = {};
    _bank.teamDeposits   = {};
    _bank.playerTypeTags = {};
    _bank.teamTypeTags   = {};

    // 팀 완료 라운드 사전 계산 (팀 전원 신청한 경우만 뱃지 부여)
    const _teamRoundCounts = {};
    history.filter(h => h.is_team).forEach(h => {
        const pl = _bank.players.find(p => p.nickname === h.nickname);
        if (!pl || !pl.team_name) return;
        const key = `${pl.team_name}|${h.round_num}`;
        _teamRoundCounts[key] = (_teamRoundCounts[key] || 0) + 1;
    });
    const _completedTeamRounds = new Set(
        Object.entries(_teamRoundCounts)
            .filter(([key, cnt]) => cnt >= _bank.players.filter(p => p.team_name === key.split('|')[0]).length)
            .map(([key]) => key)
    );

    // 타입 태그는 전체 라운드에서 누적 (팀은 전원 완료된 라운드만)
    history.forEach(r => {
        const player = _bank.players.find(p => p.nickname === r.nickname);
        if (!player) return;
        if (!r.is_team) {
            if (!_bank.playerTypeTags[r.nickname]) _bank.playerTypeTags[r.nickname] = [];
            if (!_bank.playerTypeTags[r.nickname].includes(r.deposit_type)) {
                _bank.playerTypeTags[r.nickname].push(r.deposit_type);
            }
        } else {
            const teamName = player.team_name;
            if (!teamName || !_completedTeamRounds.has(`${teamName}|${r.round_num}`)) return;
            if (!_bank.teamTypeTags[teamName]) _bank.teamTypeTags[teamName] = [];
            if (!_bank.teamTypeTags[teamName].includes(r.deposit_type)) {
                _bank.teamTypeTags[teamName].push(r.deposit_type);
            }
        }
    });

    const currentRows = history.filter(r => r.round_num === _bank.currentRound);
    currentRows.forEach(r => {
        const idx = _bank.players.findIndex(p => p.nickname === r.nickname);
        if (idx === -1) return;

        if (!r.is_team) {
            // 개인 신청
            _bank.indivCompleted[idx] = { type: r.deposit_type, amount: r.amount };
        } else {
            // 팀 신청
            const teamName = _bank.players[idx].team_name;
            if (!teamName) return;
            if (!_bank.teamDeposits[teamName]) {
                _bank.teamDeposits[teamName] = { type: r.deposit_type, members: {} };
            }
            _bank.teamDeposits[teamName].members[idx] = r.amount;
        }
    });

    // 현재 라운드 matured_amount에서 indivRewards / teamRewards 재구성
    _bank.indivRewards = {};
    _bank.teamRewards  = {};
    currentRows.forEach(r => {
        if (!r.matured_amount) return;
        if (!r.is_team) {
            _bank.indivRewards[r.nickname] = r.matured_amount;
        } else {
            _bank.teamRewards[r.nickname] = r.matured_amount;
        }
    });

    // roundSnapshots 재구성: history 기반으로 각 완료 라운드의 스냅샷 복원
    _bank.roundSnapshots = [];
    for (let rNum = 1; rNum < _bank.currentRound; rNum++) {
        const roundRows = history.filter(h => h.round_num === rNum);
        const snap = {
            round:          rNum,
            indivCompleted: {},
            teamDeposits:   {},
            indivRewards:   {},
            teamRewards:    {},
            prevRoundsTotal:{},
            playerTypeTags: {},
            teamTypeTags:   {},
        };
        history.filter(h => h.round_num < rNum).forEach(h => {
            snap.prevRoundsTotal[h.nickname] = (snap.prevRoundsTotal[h.nickname] || 0) + (h.matured_amount || 0);
        });
        roundRows.forEach(h => {
            const idx = _bank.players.findIndex(p => p.nickname === h.nickname);
            if (idx === -1) return;
            if (!h.is_team) {
                snap.indivCompleted[idx] = { type: h.deposit_type, amount: h.amount };
                if (h.matured_amount) snap.indivRewards[h.nickname] = h.matured_amount;
            } else {
                const teamName = _bank.players[idx].team_name;
                if (!teamName) return;
                if (!snap.teamDeposits[teamName]) snap.teamDeposits[teamName] = { type: h.deposit_type, members: {} };
                snap.teamDeposits[teamName].members[idx] = h.amount;
                if (h.matured_amount) snap.teamRewards[h.nickname] = h.matured_amount;
            }
        });
        const snapTeamRoundCounts = {};
        history.filter(h => h.is_team && h.round_num <= rNum).forEach(h => {
            const pl = _bank.players.find(p => p.nickname === h.nickname);
            if (!pl || !pl.team_name) return;
            const key = `${pl.team_name}|${h.round_num}`;
            snapTeamRoundCounts[key] = (snapTeamRoundCounts[key] || 0) + 1;
        });
        const snapCompletedTeamRounds = new Set(
            Object.entries(snapTeamRoundCounts)
                .filter(([key, cnt]) => cnt >= _bank.players.filter(p => p.team_name === key.split('|')[0]).length)
                .map(([key]) => key)
        );

        history.filter(h => h.round_num <= rNum).forEach(h => {
            const player = _bank.players.find(p => p.nickname === h.nickname);
            if (!player) return;
            if (!h.is_team) {
                if (!snap.playerTypeTags[h.nickname]) snap.playerTypeTags[h.nickname] = [];
                if (!snap.playerTypeTags[h.nickname].includes(h.deposit_type)) snap.playerTypeTags[h.nickname].push(h.deposit_type);
            } else {
                const teamName = player.team_name;
                if (!teamName || !snapCompletedTeamRounds.has(`${teamName}|${h.round_num}`)) return;
                if (!snap.teamTypeTags[teamName]) snap.teamTypeTags[teamName] = [];
                if (!snap.teamTypeTags[teamName].includes(h.deposit_type)) snap.teamTypeTags[teamName].push(h.deposit_type);
            }
        });
        _bank.roundSnapshots.push(snap);
    }

    // 배율 UI 반영 (View 1 모달이 열려 있을 때)
    _bankSyncRatioUI();
}

_bankLoad();
