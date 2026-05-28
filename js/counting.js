    function renderSidebar() {
        const list = document.getElementById('sidebarList');
        list.innerHTML = '';
        const sorted = players
            .map((p, i) => ({ p, i }))
            .sort((a, b) => {
                if (currentMode === 'team') {
                    const teamCmp = (a.p.team || '').localeCompare(b.p.team || '', 'ko');
                    if (teamCmp !== 0) return teamCmp;
                }
                return (a.p.realName || a.p.name || '').localeCompare(b.p.realName || b.p.name || '', 'ko');
            });
        sorted.forEach(({ p, i }) => {
            list.innerHTML += `
            <div class="player-list-item" id="pItem_${i}" onclick="selectCountingPlayer(${i})">
                <div>
                    ${p.team !== '-' ? `<span style='font-size:11px; color:#888;'>[${p.team}]</span> ` : ''}
                    ${p.realName || p.name}
                </div>
                <span class="status-badge" id="badge_${i}">대기</span>
            </div>`;
        });
        const assetTitle = document.getElementById('cntAssetCardTitle');
        if (assetTitle) assetTitle.textContent = currentGameVariant !== 'basic' ? '보유 부동산 (현재가)' : '보유 주식 (4R 현재가)';
        const traitTitle = document.getElementById('cntTraitCardTitle');
        if (traitTitle) traitTitle.textContent = currentGameVariant !== 'basic' ? '경제적 성공요소 (복수 선택 가능)' : '나의 플레이 스타일 (복수 선택 가능)';
        initAssetGrid('stockGridSm', false, true);
    }
    function selectCountingPlayer(i) {
        // 1) 이전 active는 "무조건" 해제 (토글 꼬임 방지)
        const prevEl = document.getElementById(`pItem_${activeCountingIndex}`);
        if (prevEl) prevEl.classList.remove('active');
        // 2) 이전 사람 완료/대기 뱃지 갱신 (total 기준)
        if (players[activeCountingIndex]) {
            const prev = players[activeCountingIndex];
            const badge = document.getElementById(`badge_${activeCountingIndex}`);
            if (prev.total > 0) {
                prevEl?.classList.add('done');
                if (badge) badge.innerText = "완료";
            } else {
                prevEl?.classList.remove('done');
                if (badge) badge.innerText = "대기";
            }
        }
        // 3) 새로 선택
        activeCountingIndex = i;
        const curEl = document.getElementById(`pItem_${i}`);
        if (curEl) curEl.classList.add('active');
        updateDash();
    }
    function updateDash() {
        const p = players[activeCountingIndex];
        if (!p) return;
        document.getElementById('displayPlayerName').innerText = p.realName || p.name;
        const cash = p.manualCash || 0;
        const assetVal = calcActiveAsset(p.assets);
        const diligence = p.diligenceReward || 0;
        const base = cash + assetVal + diligence;

        if (currentGameVariant !== 'basic') {
            p.total = base * calcSuccessMultiplier(p.successFactors || {});
        } else {
            p.total = base;
        }

        document.getElementById('displayTotalAsset').innerText = p.total.toLocaleString() + " 원";
        document.getElementById('cntCashInput').value = cash;
        document.getElementById('cntDiligenceInput').value = diligence;
        document.getElementById('displayStock').innerText = assetVal.toLocaleString();

        const assetTypeLabel = document.getElementById('cntAssetTypeLabel');
        if (assetTypeLabel) assetTypeLabel.textContent = currentGameVariant !== 'basic' ? '부동산' : '주식';

        const sfRow = document.getElementById('cntSuccessFactorsRow');
        if (sfRow) {
            if (currentGameVariant !== 'basic') {
                sfRow.style.display = '';
                const sfCount = Object.values(p.successFactors || {}).filter(Boolean).length;
                const sfCountEl = document.getElementById('displaySuccessFactorCount');
                const sfMultEl  = document.getElementById('displaySuccessMultiplier');
                if (sfCountEl) sfCountEl.textContent = sfCount;
                if (sfMultEl)  sfMultEl.textContent  = '×' + (sfCount * 0.25).toFixed(2);
            } else {
                sfRow.style.display = 'none';
            }
        }

        const activeInfo = getActiveAssetInfo();
        for (let k in activeInfo) {
            const valEl = document.getElementById(`ui_val_${k}`);
            if (valEl) valEl.innerText = ((p.assets[k] || 0) * activeInfo[k].price).toLocaleString();
            const input = document.getElementById(`ui_cnt_input_${k}`);
            if (input) input.value = p.assets[k] || 0;
        }

        renderTraitGridCounting();
    }
    function updateManualOnCounting() {
        const p = players[activeCountingIndex];
        if (!p) return;

        applyInputsToPlayer(p, 'cnt');
        recalculateAllRankings();
        updateDash();
    }
    function saveAndNextCountingPlayer() {
        updateManualOnCounting();

        const currentEl = document.getElementById(`pItem_${activeCountingIndex}`);
        const badge = document.getElementById(`badge_${activeCountingIndex}`);
        if (players[activeCountingIndex].total > 0) {
            currentEl?.classList.add('done');
            if (badge) badge.innerText = '완료';
        }

        if (activeCountingIndex < players.length - 1) {
            selectCountingPlayer(activeCountingIndex + 1);
            document.getElementById('cntCashInput')?.focus();
            document.getElementById('cntCashInput')?.select();
        } else {
            alert('마지막 참가자까지 계수가 완료되었습니다.');
        }
    }
    function initAssetGrid(id, sm, isCountingScreen = false) {
        const grid = document.getElementById(id);
        if (!grid) return;
        grid.innerHTML = '';

        const activeInfo = getActiveAssetInfo();
        const prefix = isCountingScreen ? 'ui' : 'rpt';
        const inputHandler = isCountingScreen ? 'updateManualOnCounting()' : 'manualUpdate()';

        for (let k in activeInfo) {
            const s = activeInfo[k];
            const colorStyle = `background:${s.color} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color:#fff !important;`;
            const priceDisplay = `<div style="font-size:11px; color:#999; margin-bottom:2px;">1개: ${s.price.toLocaleString()}원</div>`;

            grid.innerHTML += `<div class="${sm ? 'stock-item-sm' : 'stock-card'}">
                <div class="stock-logo" style="${colorStyle}">${k[0]}</div>
                <div style="font-weight:bold; color:#555; font-size:11px;">${s.name}</div>
                ${priceDisplay}
                <div class="${sm ? '' : 'stock-val'}" id="${prefix}_val_${k}">0원</div>
                <div class="${sm ? '' : 'stock-cnt'}" id="${prefix}_cnt_${k}">
                    <input type="number" id="${prefix}_cnt_input_${k}" class="editable-input" style="width:40px;" min="0" oninput="${inputHandler}"> 개
                </div>
            </div>`;
        }
    }

    function renderTraitGridCounting() {
        const grid = document.getElementById('traitGridSm');
        if (!grid) return;
        const p = players[activeCountingIndex];
        if (!p) return;

        grid.innerHTML = '';

        if (currentGameVariant !== 'basic') {
            if (!p.successFactors) p.successFactors = initSuccessFactorsState();
            SUCCESS_FACTORS.forEach(f => {
                const isOn = !!p.successFactors[f.key];
                grid.innerHTML += `
                    <button class="trait-btn ${isOn ? 'on' : ''}" type="button"
                        onclick="toggleSuccessFactor('${f.key}')">
                        <img src="${f.img}" alt="${f.name}" style="width:32px;height:32px;object-fit:contain;">
                        <span>${f.name}</span>
                    </button>`;
            });
        } else {
            if (!p.traits) p.traits = initTraitsState();
            TRAITS.forEach(t => {
                const isOn = !!p.traits[t.key];
                grid.innerHTML += `
                    <button class="trait-btn ${isOn ? 'on' : ''}" type="button"
                        onclick="toggleTrait('${t.key}')">
                        <span class="emo">${t.emo}</span>
                        <span>${t.king}</span>
                    </button>`;
            });
        }
    }

    function toggleTrait(key){
        const p = players[activeCountingIndex];
        if(!p) return;
        if(!p.traits) p.traits = initTraitsState();
        p.traits[key] = !p.traits[key];
        renderTraitGridCounting(); // 즉시 반영
    }

    function toggleSuccessFactor(key) {
        const p = players[activeCountingIndex];
        if (!p) return;
        if (!p.successFactors) p.successFactors = initSuccessFactorsState();
        p.successFactors[key] = !p.successFactors[key];
        updateDash();
    }

    function openStockPriceEditModal() {
        const isBasic = currentGameVariant === 'basic';
        const title = document.getElementById('stockPriceEditTitle');
        if (title) title.textContent = isBasic ? '📈 주식 가격 수정' : '🏠 부동산 가격 수정';

        const grid = document.getElementById('stockPriceEditInputs');
        grid.innerHTML = '';
        const info = getActiveAssetInfo();
        for (let k in info) {
            grid.innerHTML += `<div class="stock-input-item">
                <label>${info[k].name}</label>
                <input type="number" id="cnt_price_${k}" value="${info[k].price}" min="0">
            </div>`;
        }
        document.getElementById('stockPriceEditModal').classList.add('show');
    }

    function closeStockPriceEditModal() {
        document.getElementById('stockPriceEditModal').classList.remove('show');
    }

    function handleStockPriceEditBackdrop(e) {
        if (e.target === document.getElementById('stockPriceEditModal')) closeStockPriceEditModal();
    }

    function openPlayerEditModal() {
        if (citizenListData.length === 0) fetchCitizenList().catch(() => {});

        const area = document.getElementById('playerEditArea');
        area.innerHTML = '';

        if (currentMode === 'individual') {
            document.getElementById('indivEditBar').style.display = 'flex';
            document.getElementById('teamEditAddBar').style.display = 'none';
            players.forEach((p, i) => {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = makeInp(`참가자 ${i + 1}`, p.realName || p.name || '', p.nickname || '');
                area.appendChild(wrapper.firstElementChild);
            });
        } else {
            document.getElementById('indivEditBar').style.display = 'none';
            document.getElementById('teamEditAddBar').style.display = 'flex';

            const teams = new Map();
            players.forEach(p => {
                if (!teams.has(p.team)) teams.set(p.team, []);
                teams.get(p.team).push(p);
            });

            teams.forEach((members, teamName) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'team-section';
                wrapper.innerHTML = `
                    <div class="team-toolbar">
                        <div class="team-name-wrap">
                            <span>팀명</span>
                            <input class="team-name-input" type="text" value="${teamName}">
                        </div>
                        <div class="team-btns">
                            <button class="btn btn-primary btn-mini" style="font-size:11px;padding:3px 8px;" onclick="addMember(this.closest('.team-section'))">➕ 팀원</button>
                            <button class="btn btn-dark btn-mini"    style="font-size:11px;padding:3px 8px;" onclick="removeMember(this.closest('.team-section'))">➖ 팀원</button>
                            <button class="btn btn-danger btn-mini"  style="font-size:11px;padding:3px 8px;" onclick="this.closest('.team-section').remove()">🗑️ 삭제</button>
                        </div>
                    </div>
                    <div class="team-members"></div>`;
                const membersEl = wrapper.querySelector('.team-members');
                members.forEach((p, j) => {
                    const rowWrapper = document.createElement('div');
                    rowWrapper.innerHTML = makeInp(`참가자 ${j + 1}`, p.realName || p.name || '', p.nickname || '');
                    membersEl.appendChild(rowWrapper.firstElementChild);
                });
                area.appendChild(wrapper);
            });
        }

        applyNameLengthBindings(area);
        document.getElementById('playerEditModal').classList.add('show');
    }

    function closePlayerEditModal(force = false) {
        if (!force && !confirm('현재 작성중인 내용이 사라집니다\n종료하시겠습니까?')) return;
        document.getElementById('playerEditModal').classList.remove('show');
    }

    function handlePlayerEditBackdrop(e) {
        if (e.target === document.getElementById('playerEditModal')) closePlayerEditModal();
    }

    function addEditIndividualPlayer() {
        const area = document.getElementById('playerEditArea');
        const count = area.querySelectorAll('.citizen-row').length;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = makeInp(`참가자 ${count + 1}`, `참가자${count + 1}`, '');
        area.appendChild(wrapper.firstElementChild);
        applyNameLengthBindings(area);
    }

    function removeEditIndividualPlayer() {
        const area = document.getElementById('playerEditArea');
        const rows = area.querySelectorAll('.citizen-row');
        if (rows.length <= 1) { alert("최소 1명은 있어야 합니다."); return; }
        rows[rows.length - 1].remove();
    }

    function addEditTeam() {
        const area = document.getElementById('playerEditArea');
        const nextIdx = area.querySelectorAll('.team-section').length;
        const defaultName = String.fromCharCode(65 + nextIdx) + "팀";
        const wrapper = document.createElement('div');
        wrapper.className = 'team-section';
        wrapper.innerHTML = `
            <div class="team-toolbar">
                <div class="team-name-wrap">
                    <span>팀명</span>
                    <input class="team-name-input" type="text" value="${defaultName}">
                </div>
                <div class="team-btns">
                    <button class="btn btn-primary btn-mini" style="font-size:11px;padding:3px 8px;" onclick="addMember(this.closest('.team-section'))">➕ 팀원</button>
                    <button class="btn btn-dark btn-mini"    style="font-size:11px;padding:3px 8px;" onclick="removeMember(this.closest('.team-section'))">➖ 팀원</button>
                    <button class="btn btn-danger btn-mini"  style="font-size:11px;padding:3px 8px;" onclick="this.closest('.team-section').remove()">🗑️ 삭제</button>
                </div>
            </div>
            <div class="team-members"></div>`;
        area.appendChild(wrapper);
        addMember(wrapper, true);
        renumberMembers(wrapper);
        applyNameLengthBindings(area);
    }

    async function applyPlayerEdits() {
        const area = document.getElementById('playerEditArea');
        const gameId = players[0]?.gameId;
        const existingMap = {};
        players.forEach(p => { existingMap[p.nickname] = p; });

        const newPlayers = [];

        if (currentMode === 'individual') {
            const rows = Array.from(area.querySelectorAll('.citizen-row'));
            const nicknames = rows.map((row, i) => {
                const rn = row.querySelector('.realname-input')?.value?.trim() || `참가자${i + 1}`;
                return row.querySelector('.nickname-input')?.value?.trim() || rn;
            });
            const dups = nicknames.filter((n, i) => nicknames.indexOf(n) !== i);
            if (dups.length > 0) {
                alert(`중복된 닉네임이 있습니다: ${[...new Set(dups)].join(', ')}\n닉네임을 다시 설정해주세요.`);
                return;
            }
            rows.forEach((row, i) => {
                const realName = row.querySelector('.realname-input')?.value?.trim() || `참가자${i + 1}`;
                const nickname = row.querySelector('.nickname-input')?.value?.trim() || realName;
                const efti = row.dataset.efti || '-';
                const existing = existingMap[nickname];
                if (existing) {
                    existing.realName = realName; existing.name = realName; existing.id = i;
                    if (efti !== '-') existing.efti = efti;
                    newPlayers.push(existing);
                } else {
                    newPlayers.push({
                        id: i, gameId, nickname, realName, name: realName,
                        efti: efti || '-', team: '-',
                        assets: initAssets(), total: 0,
                        rankIndiv: 0, rankTeam: 0, teamTotal: 0,
                        manualCash: 0, diligenceReward: 0,
                        traits: initTraitsState(), successFactors: initSuccessFactorsState()
                    });
                }
            });
        } else {
            let idx = 0;
            area.querySelectorAll('.team-section').forEach(teamSec => {
                const teamName = (teamSec.querySelector('.team-name-input')?.value || '').trim() || '팀';
                const existingTeamPlayer = players.find(p => p.team === teamName);
                const teamId = existingTeamPlayer?.teamId || ('T' + Math.random().toString(36).substr(2, 8).toUpperCase());
                teamSec.querySelectorAll('.citizen-row').forEach(row => {
                    const realName = row.querySelector('.realname-input')?.value?.trim() || `참가자${idx + 1}`;
                    const nickname = row.querySelector('.nickname-input')?.value?.trim() || realName;
                    const efti = row.dataset.efti || '-';
                    const existing = existingMap[nickname];
                    if (existing) {
                        existing.realName = realName; existing.name = realName;
                        existing.team = teamName; existing.teamId = teamId; existing.id = idx;
                        if (efti !== '-') existing.efti = efti;
                        newPlayers.push(existing);
                    } else {
                        newPlayers.push({
                            id: idx, gameId, nickname, realName, name: realName,
                            efti: efti || '-', team: teamName, teamId,
                            assets: initAssets(), total: 0,
                            rankIndiv: 0, rankTeam: 0, teamTotal: 0,
                            manualCash: 0, diligenceReward: 0,
                            traits: initTraitsState(), successFactors: initSuccessFactorsState()
                        });
                    }
                    idx++;
                });
            });
        }

        if (newPlayers.length === 0) { alert("명단을 입력하세요."); return; }

        const oldPlayers = players.slice();
        players = newPlayers;
        recalculateAllRankings();
        if (activeCountingIndex >= players.length) activeCountingIndex = 0;
        renderSidebar();
        selectCountingPlayer(activeCountingIndex);
        closePlayerEditModal(true);
        _syncPlayerEditsToDb(oldPlayers, newPlayers).catch(e => console.error('[syncPlayerEdits]', e));
    }

    async function _syncPlayerEditsToDb(oldPlayers, newPlayers) {
        if (isSampleMode) return;
        const gameId = (newPlayers[0] || oldPlayers[0])?.gameId;
        if (!gameId) return;

        const isAdvancedLike = currentGameVariant !== 'basic';
        const oldNickSet = new Set(oldPlayers.map(p => _nick(p.nickname)));
        const newNickSet = new Set(newPlayers.map(p => _nick(p.nickname)));

        const removedNicks = [...oldNickSet].filter(n => n && !newNickSet.has(n));
        const addedNicks   = new Set([...newNickSet].filter(n => n && !oldNickSet.has(n)));

        // 삭제된 플레이어: 해당 게임 테이블에서 제거 (users는 시민권자이므로 유지)
        const removeTables = isAdvancedLike
            ? ['cash_balance', 'estate_balance', 'success_factors', 'game_individual']
            : ['cash_balance', 'stock_balance', 'traits', 'game_individual'];
        for (const nick of removedNicks) {
            for (const table of removeTables) {
                await _sb.from(table).delete().eq('game_id', gameId).eq('nickname', nick);
            }
        }

        // 추가된 플레이어: 초기 레코드 삽입
        const addedPlayers = newPlayers.filter(p => addedNicks.has(_nick(p.nickname)));
        if (addedPlayers.length > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const userRows = addedPlayers.map(p => ({
                nickname:     _nick(p.nickname),
                real_name:    p.realName || p.name || '',
                join_date:    today,
                is_citizen:   false,
                default_efti: p.efti || 'FAEN',
                status:       'active'
            }));
            await _sb.from('users').upsert(userRows, { onConflict: 'nickname' });

            const cashRows = addedPlayers.map(p => ({
                game_id: gameId, nickname: _nick(p.nickname),
                bill_100: 0, bill_500: 0, bill_1000: 0,
                bill_5000: 0, bill_10000: 0, bill_50000: 0
            }));
            await _sb.from('cash_balance').upsert(cashRows, { onConflict: 'game_id,nickname' });

            if (isAdvancedLike) {
                const estateRows = addedPlayers.map(p => ({
                    game_id: gameId, nickname: _nick(p.nickname),
                    gaongaemi: 0, nurigoyangi: 0, damiwonsungi: 0,
                    marusuri: 0, chorongbungi: 0, haniyuwoo: 0
                }));
                await _sb.from('estate_balance').upsert(estateRows, { onConflict: 'game_id,nickname' });
                await sbSaveSuccessFactors(gameId, addedPlayers);
            } else {
                const stockRows = addedPlayers.map(p => ({
                    game_id: gameId, nickname: _nick(p.nickname),
                    sasung: 0, lgi: 0, skei: 0, cacao: 0, hyunde: 0, naber: 0
                }));
                await _sb.from('stock_balance').upsert(stockRows, { onConflict: 'game_id,nickname' });
                await sbSaveTraits(gameId, addedPlayers);
            }

            const indivRows = addedPlayers.map(p => ({
                nickname:         _nick(p.nickname),
                real_name:        p.realName || p.name || '',
                total_asset:      0,
                cash:             0,
                stock:            0,
                diligence_reward: 0,
                game_id:          gameId,
                team_id:          p.teamId || null
            }));
            await _sb.from('game_individual').upsert(indivRows, { onConflict: 'game_id,nickname' });
        }

        // 유지된 플레이어: 이름/팀 변경 반영
        const keptPlayers = newPlayers.filter(p => oldNickSet.has(_nick(p.nickname)));
        for (const p of keptPlayers) {
            const nick = _nick(p.nickname);
            const old  = oldPlayers.find(op => _nick(op.nickname) === nick);
            if (!old) continue;
            const realNameChanged = (old.realName || old.name) !== (p.realName || p.name);
            const teamChanged     = old.teamId !== p.teamId;
            if (realNameChanged || teamChanged) {
                await _sb.from('game_individual')
                    .update({ real_name: p.realName || p.name || '', team_id: p.teamId || null })
                    .eq('game_id', gameId).eq('nickname', nick);
            }
            if (realNameChanged) {
                await _sb.from('users')
                    .update({ real_name: p.realName || p.name || '' })
                    .eq('nickname', nick);
            }
        }

        // game_info 인원수 업데이트
        await _sb.from('game_info')
            .update({ player_count: newPlayers.length })
            .eq('game_id', gameId);

        // 팀 모드: game_team upsert + 삭제된 팀 제거
        if (currentMode === 'team') {
            const oldTeamIds = new Set(oldPlayers.map(p => p.teamId).filter(Boolean));
            const newTeamMap = {};
            newPlayers.forEach(p => {
                if (!p.teamId) return;
                if (!newTeamMap[p.teamId]) newTeamMap[p.teamId] = { name: p.team || '', members: [] };
                newTeamMap[p.teamId].members.push(_nick(p.nickname));
            });
            for (const [tid, t] of Object.entries(newTeamMap)) {
                await _sb.from('game_team').upsert({
                    team_id:          tid,
                    game_id:          gameId,
                    team_name:        t.name,
                    team_total_asset: 0,
                    members:          t.members.join(', ')
                }, { onConflict: 'team_id' });
            }
            const removedTeamIds = [...oldTeamIds].filter(tid => !newTeamMap[tid]);
            for (const tid of removedTeamIds) {
                await _sb.from('game_team').delete().eq('team_id', tid).eq('game_id', gameId);
            }
        }
    }

    async function saveStockPriceEdit() {
        const info = getActiveAssetInfo();
        const prices = [];
        const pricesObj = {};
        for (let k in info) {
            const val = parseInt(document.getElementById(`cnt_price_${k}`)?.value) || info[k].price;
            info[k].price = val;
            prices.push(val);
            pricesObj[k] = val;
        }

        initAssetGrid('stockGridSm', false, true);

        players.forEach(p => {
            p.total = (p.manualCash || 0) + calcActiveAsset(p.assets)
                    + (p.diligenceReward || 0) + (p.depositReward || 0) + (p.questReward || 0);
        });
        recalculateAllRankings();
        updateDash();

        const gameId = players[0]?.gameId;
        if (gameId && !isSampleMode) {
            if (currentGameVariant === 'basic') {
                await sbUpdateStockPrice(gameId, prices);
            } else {
                await sbSaveEstatePrice(gameId, pricesObj);
            }
        }

        closeStockPriceEditModal();
    }
