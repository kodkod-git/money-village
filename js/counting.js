    function renderSidebar() {
        const list = document.getElementById('sidebarList');
        list.innerHTML = '';
        players.forEach((p, i) => {
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
        if (assetTitle) assetTitle.textContent = currentGameVariant === 'advanced' ? '보유 부동산 (현재가)' : '보유 주식 (4R 현재가)';
        const traitTitle = document.getElementById('cntTraitCardTitle');
        if (traitTitle) traitTitle.textContent = currentGameVariant === 'advanced' ? '경제적 성공요소 (복수 선택 가능)' : '나의 플레이 스타일 (복수 선택 가능)';
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

        if (currentGameVariant === 'advanced') {
            p.total = base * calcSuccessMultiplier(p.successFactors || {});
        } else {
            p.total = base;
        }

        document.getElementById('displayTotalAsset').innerText = p.total.toLocaleString() + " 원";
        document.getElementById('cntCashInput').value = cash;
        document.getElementById('cntDiligenceInput').value = diligence;
        document.getElementById('displayStock').innerText = assetVal.toLocaleString();

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

        if (currentGameVariant === 'advanced') {
            if (!p.successFactors) p.successFactors = initSuccessFactorsState();
            SUCCESS_FACTORS.forEach(f => {
                const isOn = !!p.successFactors[f.key];
                grid.innerHTML += `
                    <button class="trait-btn ${isOn ? 'on' : ''}" type="button"
                        onclick="toggleSuccessFactor('${f.key}')">
                        <span class="emo">${f.emo}</span>
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
