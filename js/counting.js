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
