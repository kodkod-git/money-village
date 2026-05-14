// [은행 예금] 머니빌리지 은행 예금 시뮬레이터

const _bank = {
    settings:     { long: 2.0, mid: 1.5, short: 1.2 },
    teamSettings: { long: 2.5, mid: 2.0, short: 1.5 },
    gameId:   null,
    gameDate: null,
    gameType: null,
    players:  [],
    deposit:  { type: null, amount: 1000 },
    currentPlayerIdx: null,
    indivCompleted: {},
    teamDeposits:   {},
    viewMode:  'team'
};

const _BANK_TYPE = {
    long:  { label: '장기 🏦', round: '1라운드' },
    mid:   { label: '중기 ⏳', round: '2라운드' },
    short: { label: '단기 ⚡', round: '3라운드' }
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
    [2, 3, 4].forEach(i => {
        const el = document.getElementById('bankView' + i);
        if (el) el.style.display = i === n ? 'block' : 'none';
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

function closeBankModal() {
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
            const variantLabel = (g.game_variant || 'basic') === 'advanced' ? '심화' : '기본';
            const variantTag   = (g.game_variant || 'basic') === 'advanced' ? 'tag-advanced' : 'tag-basic';
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
            card.onclick = () => _bankSelectGame(g.game_id, date, g.section_num, g.game_type, card);
            grid.appendChild(card);
        });
    } catch(e) {
        loading.style.display = 'none';
        grid.innerHTML = `<p style="color:#d32f2f;font-size:13px;text-align:center;">불러오기 실패: ${e.message}</p>`;
    }
}

function _bankSelectGame(gameId, date, sectionNum, gameType, cardEl) {
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
}

function bankAdjustRatio(type, delta, isTeam = false) {
    const store  = isTeam ? _bank.teamSettings : _bank.settings;
    const prefix = isTeam ? 'bankTeam' : 'bank';
    const next = Math.round((store[type] + delta) * 10) / 10;
    if (next < 1.0) return;
    store[type] = next;
    document.getElementById(prefix + _bankCap(type) + 'RatioDisplay').textContent = next.toFixed(1) + '배';
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

        _bank.indivCompleted = {};
        _bank.teamDeposits   = {};
        _bank.viewMode       = 'team';
        _bankRenderPlayerList();
        closeBankModal();
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
    const grid   = document.getElementById('bankPlayerGrid');
    const isTeam = _bank.players.some(p => p.team_name);
    grid.innerHTML = '';

    const tabBar = document.getElementById('bankTabBar');
    tabBar.style.display = isTeam ? 'flex' : 'none';
    if (isTeam) {
        document.getElementById('bankTabTeam').classList.toggle('active', _bank.viewMode === 'team');
        document.getElementById('bankTabIndiv').classList.toggle('active', _bank.viewMode === 'individual');
    }

    grid.classList.toggle('is-team', isTeam && _bank.viewMode === 'team');

    const isTeamTab = isTeam && _bank.viewMode === 'team';

    function _getPlayerDone(p, idx) {
        if (isTeamTab) {
            const td = _bank.teamDeposits[p.team_name];
            return (td && td.members && td.members[idx] !== undefined) ? { type: td.type } : null;
        }
        return _bank.indivCompleted[idx] || null;
    }

    function _bankMakePlayerCard(p, idx) {
        const done     = _getPlayerDone(p, idx);
        const card     = document.createElement('div');
        card.className = 'bank-player-card' + (done ? ' completed' : '');
        const typeTag   = done ? `<span class="bank-status-type">${_BANK_TYPE[done.type].label}</span>` : '';
        const statusTag = done
            ? `<span class="bank-status-done">신청 완료</span>`
            : `<span class="bank-status-pending">신청 전</span>`;
        card.innerHTML = `
            <div class="bank-player-nickname">${p.nickname}</div>
            <div class="bank-player-realname">${p.real_name}</div>
            <div class="bank-player-status">
                <span class="bank-player-efti">${p.default_efti || 'FAEN'}</span>
                ${typeTag}
                ${statusTag}
            </div>`;
        card.onclick = () => bankSelectPlayer(idx);
        return card;
    }

    if (!isTeam || _bank.viewMode === 'individual') {
        _bank.players.forEach((p, idx) => grid.appendChild(_bankMakePlayerCard(p, idx)));
        return;
    }

    const teams = new Map();
    _bank.players.forEach((p, idx) => {
        const key = p.team_name;
        if (!teams.has(key)) teams.set(key, []);
        teams.get(key).push({ p, idx });
    });

    teams.forEach((members, teamKey) => {
        const teamSize     = members.length;
        const td           = _bank.teamDeposits[teamKey];
        const completedCnt = td && td.members ? Object.keys(td.members).length : 0;
        const allDone      = completedCnt === teamSize;

        const groupEl = document.createElement('div');
        groupEl.className = 'team-group' + (allDone ? ' team-done' : '');

        const header = document.createElement('div');
        header.className = 'team-group-header';
        header.innerHTML = `${teamKey || '무소속'} <span class="bank-team-progress-badge">[${completedCnt}/${teamSize}]</span>`;
        groupEl.appendChild(header);

        const playersEl = document.createElement('div');
        playersEl.className = 'team-group-players';
        members.forEach(({ p, idx }) => playersEl.appendChild(_bankMakePlayerCard(p, idx)));

        groupEl.appendChild(playersEl);
        grid.appendChild(groupEl);
    });
}

function bankSelectPlayer(idx) {
    const p = _bank.players[idx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    // 이미 신청 완료된 플레이어는 폼을 열지 않음
    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        if (td && td.members && td.members[idx] !== undefined) return;
    } else {
        if (_bank.indivCompleted[idx]) return;
    }

    _bank.currentPlayerIdx = idx;
    document.getElementById('bankDepositPlayerName').textContent =
        `${p.nickname}(${p.real_name})의 예금 신청`;

    _bank.deposit = { type: null, amount: 1000 };
    document.querySelectorAll('.bank-type-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('bankAmountDisplay').textContent = '1,000원';
    document.getElementById('bankPreviewBox').textContent = '종류를 선택하면 미리보기가 나와요!';

    // 팀/개인 배율을 예금 종류 카드에 표시
    const ratioStore = isTeamTab ? _bank.teamSettings : _bank.settings;
    ['long', 'mid', 'short'].forEach(t => {
        const el = document.getElementById('bankTcInfo' + _bankCap(t));
        if (el) el.textContent = ratioStore[t].toFixed(1) + '배';
    });

    // 팀 탭: 팀이 이미 선택한 종류 미리 선택
    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        if (td && td.type) {
            _bank.deposit.type = td.type;
            document.getElementById('bankTc' + _bankCap(td.type)).classList.add('selected');
            _bankUpdatePreview();
        }
    }

    _bankShowView(3);
}

function bankBackToList() {
    _bankShowView(2);
}

// ── View 3: 예금 신청 ──────────────────────────────────────────────
function bankPickType(t) {
    _bank.deposit.type = t;
    document.querySelectorAll('.bank-type-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('bankTc' + _bankCap(t)).classList.add('selected');

    // 팀 탭: 팀 공유 타입 업데이트
    const p = _bank.players[_bank.currentPlayerIdx];
    if (_bank.viewMode === 'team' && p && p.team_name) {
        if (!_bank.teamDeposits[p.team_name]) {
            _bank.teamDeposits[p.team_name] = { type: t, members: {} };
        } else {
            _bank.teamDeposits[p.team_name].type = t;
        }
    }

    _bankUpdatePreview();
}

function bankAdjustAmount(delta) {
    const next = _bank.deposit.amount + delta;
    if (next < 1000) return;
    _bank.deposit.amount = next;
    document.getElementById('bankAmountDisplay').textContent = next.toLocaleString() + '원';
    _bankUpdatePreview();
}

function _bankUpdatePreview() {
    const { type, amount } = _bank.deposit;
    const box = document.getElementById('bankPreviewBox');
    if (!type) { box.textContent = '종류를 먼저 선택해주세요'; return; }

    const p = _bank.players[_bank.currentPlayerIdx];
    const isTeamTab = _bank.viewMode === 'team' && !!p.team_name;

    if (isTeamTab) {
        const td = _bank.teamDeposits[p.team_name];
        const alreadySum = td && td.members
            ? Object.values(td.members).reduce((a, b) => a + b, 0) : 0;
        const totalPrincipal = alreadySum + amount;
        const totalMatured   = Math.round(totalPrincipal * _bank.teamSettings[type]);
        box.textContent = `${totalPrincipal.toLocaleString()}원 → 💰 ${totalMatured.toLocaleString()}원`;
    } else {
        const out = Math.round(amount * _bank.settings[type]);
        box.textContent = `${amount.toLocaleString()}원 → 💰 ${out.toLocaleString()}원`;
    }
}

async function bankStep2Submit() {
    if (!_bank.deposit.type) { alert('예금 종류를 선택해주세요'); return; }

    const { type, amount } = _bank.deposit;
    const ratio    = _bank.settings[type];
    const maturity = Math.round(amount * ratio);
    const interest = maturity - amount;
    const p        = _bank.players[_bank.currentPlayerIdx];

    sbSaveDepositReward(_bank.gameId, p.nickname, interest).catch(console.error);

    document.getElementById('bankResultRoundBadge').textContent = _BANK_TYPE[type].round;
    document.getElementById('bankRType').textContent      = _BANK_TYPE[type].label;
    document.getElementById('bankRPlayer').textContent    = `${p.nickname} (${p.real_name})`;
    document.getElementById('bankRPrincipal').textContent = amount.toLocaleString() + '원';
    document.getElementById('bankRInterest').textContent  = interest.toLocaleString() + '원';
    document.getElementById('bankRTotal').textContent     = maturity.toLocaleString() + '원';

    _bank.completed[_bank.currentPlayerIdx] = { type };
    _bankShowView(4);
}

// ── View 4: 결과 ───────────────────────────────────────────────────
function bankNextStudent() {
    _bankRenderPlayerList();
    _bankShowView(2);
}

// ── Util ───────────────────────────────────────────────────────────
function _bankCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

_bankLoad();
