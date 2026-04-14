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
        initStockGrid('stockGridSm', false, true);
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
        document.getElementById('displayPlayerName').innerText = p.realName || p.name;
        let cash = p.manualCash || 0;
        let stock = calcStock(p.assets);
        let diligence = p.diligenceReward || 0;

        p.total = cash + stock + diligence;

        document.getElementById('displayTotalAsset').innerText = p.total.toLocaleString() + " 원";
        document.getElementById('cntCashInput').value = cash;
        document.getElementById('cntDiligenceInput').value = diligence;
        document.getElementById('displayStock').innerText = stock.toLocaleString();

        for (let k in stockInfo) {
            document.getElementById(`ui_val_${k}`).innerText =
                (p.assets[k] * stockInfo[k].price).toLocaleString();
            const input = document.getElementById(`ui_cnt_input_${k}`);
            if (input) input.value = p.assets[k];
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
    function initStockGrid(id, sm, isCountingScreen=false) {
        const grid = document.getElementById(id);
        grid.innerHTML = '';

        for(let k in stockInfo) {
            const s = stockInfo[k];
            const colorStyle = `background:${s.color} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color:${s.textColor||'#fff'} !important; border:${k==='CACAO'?'1px solid #ddd':'none'};`;
            const prefix = isCountingScreen ? 'ui' : 'rpt';
            const inputHandler = isCountingScreen ? 'updateManualOnCounting()' : 'manualUpdate()';
            const priceDisplay = `<div style="font-size:11px; color:#999; margin-bottom:2px;">1주: ${s.price.toLocaleString()}원</div>`;

            grid.innerHTML += `<div class="${sm?'stock-item-sm':'stock-card'}">
                <div class="stock-logo" style="${colorStyle}">${k[0]}</div>
                <div style="font-weight:bold; color:#555;">${s.name}</div>
                ${priceDisplay}
                <div class="${sm?'':'stock-val'}" id="${prefix}_val_${k}">0원</div>
                <div class="${sm?'':'stock-cnt'}" id="${prefix}_cnt_${k}">
                    <input type="number" id="${prefix}_cnt_input_${k}" class="editable-input" style="width:40px;" min="0" oninput="${inputHandler}"> 주
                </div>
            </div>`;
        }
    }

    function renderTraitGridCounting(){
        const grid = document.getElementById('traitGridSm');
        if(!grid) return;
        const p = players[activeCountingIndex];
        if(!p) return;

        // 안전: 예전 데이터면 traits 없을 수 있음
        if(!p.traits) p.traits = initTraitsState();

        grid.innerHTML = '';
        TRAITS.forEach(t => {
            const isOn = !!p.traits[t.key];
            grid.innerHTML += `
                <button class="trait-btn ${isOn ? 'on' : ''}" type="button"
                    onclick="toggleTrait('${t.key}')">
                    <span class="emo">${t.emo}</span>
                    <span>${t.king}</span>
                </button>
            `;
        });
    }

    function toggleTrait(key){
        const p = players[activeCountingIndex];
        if(!p) return;
        if(!p.traits) p.traits = initTraitsState();
        p.traits[key] = !p.traits[key];
        renderTraitGridCounting(); // 즉시 반영
    }
