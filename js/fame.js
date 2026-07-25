    let currentFameVariant = 'basic';

    const _FAME_VARIANT_LABEL = { basic: '기본', advanced: '심화', rich_vessel: '부자의그릇' };
    function updateFameTitle() {
        const el = document.getElementById('fameTitleSuffix');
        if (el) el.textContent = `(${_FAME_VARIANT_LABEL[currentFameVariant] || '기본'})`;
    }

    function showFameScreen() {
        switchScreen('fameScreen');
        if (customLogoData) {
            document.getElementById('fameLogoImg').src = customLogoData;
            document.getElementById('fameLogoImg').style.display = 'block';
            document.getElementById('fameLogoText').style.display = 'none';
        } else {
            document.getElementById('fameLogoImg').style.display = 'none';
            document.getElementById('fameLogoText').style.display = 'block';
        }

        currentFameVariant = 'basic';
        document.querySelectorAll('.fame-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.variant === 'basic');
        });
        document.getElementById('indivStockHeader').innerText = '주식';
        updateFameTitle();
        fetchFameData();
    }

    function switchFameTab(variant) {
        currentFameVariant = variant;
        document.querySelectorAll('.fame-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.variant === variant);
        });
        const isEstate = variant === 'advanced' || variant === 'rich_vessel';
        document.getElementById('indivStockHeader').innerText = isEstate ? '부동산' : '주식';
        updateFameTitle();
        renderFame();
    }

    async function fetchFameData() {
        document.getElementById('loadingOverlay').style.display = 'flex';
        try {
            const json = await sbLoadHallOfFame();

            if (json.indiv && json.indiv.length > 0) {
                fameIndivData = json.indiv.map(d => ({
                    ...d,
                    name: d.nickname,
                    total: Number(d.total_asset ?? 0),
                    cash: Number(d.cash ?? 0),
                    stock: Number(d.stock ?? 0),
                    diligence_reward: Number(d.diligence_reward ?? 0),
                    quest_reward:     Number(d.quest_reward ?? 0),
                    deposit_reward:   Number(d.deposit_reward ?? 0),
                    luck_reward:      Number(d.luck_reward ?? 0),
                    success_count:    d.success_count ?? null
                }));
            } else {
                fameIndivData = [];
            }

            if (json.team && json.team.length > 0) {
                fameTeamData = json.team.map(d => ({
                    ...d,
                    name: d.team_name,
                    total: Number(d.team_total_asset ?? 0)
                }));
            } else {
                fameTeamData = [];
            }

            renderFame();
            document.getElementById('todayDate').innerText = formatFolderDate();
        } catch (e) {
            console.error("DB 로드 실패:", e);
            fameIndivData = [];
            fameTeamData = [];
            renderFame();
        } finally {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }


    function renderFame() {
        const indiv = fameIndivData
            .filter(d => d.game_variant === currentFameVariant)
            .sort((a, b) => b.total - a.total);
        const team = fameTeamData
            .filter(d => d.game_variant === currentFameVariant)
            .sort((a, b) => b.total - a.total);

        renderRankingTable(indiv.slice(0, 10), 'indivTableBody', false);
        renderRankingTable(team.slice(0, 5), 'teamTableBody', true);
        updateFameDiligenceColumn();
        updateFameSuccessColumn();
        updateFameNumberScale();
        setSpecialAwards(indiv);
    }

    // 심화/부자의그릇 탭은 숫자 자릿수와 무관하게 13px로 고정, 기본 탭은 기존 자동 축소 유지
    function updateFameNumberScale() {
        const tbody = document.getElementById('indivTableBody');
        const isFixedSize = currentFameVariant === 'advanced' || currentFameVariant === 'rich_vessel';
        if (tbody) tbody.classList.toggle('fame-fixed-numbers', isFixedSize);
        if (isFixedSize) {
            tbody?.closest('table')?.classList.remove('ranking-table--compact-numbers');
        } else {
            applyTableNumberScale('indivTableBody');
        }
    }

    function updateFameDiligenceColumn() {
        const hideDiligence = currentFameVariant === 'rich_vessel';
        ['indivDiligenceCol', 'indivDiligenceHeader'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = hideDiligence ? 'none' : '';
        });
    }

    function updateFameSuccessColumn() {
        const hideSuccess = currentFameVariant === 'basic';
        ['indivSuccessCol', 'indivSuccessHeader'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = hideSuccess ? 'none' : '';
        });
    }

    function formatSuccessCount(count) {
        const n = Number(count) || 0;
        return `${n}개(x${n * 0.25})`;
    }

    function renderRankingTable(data, tableId, isTeam) {
        const tbody = document.getElementById(tableId);
        tbody.innerHTML = '';

        if (data.length === 0) {
            const colSpan = isTeam ? 4 : (7 + (currentFameVariant !== 'basic' ? 1 : 0) + (currentFameVariant !== 'rich_vessel' ? 1 : 0));
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; padding:20px; color:#999;">데이터가 없습니다.</td></tr>`;
            return;
        }

        data.forEach((item, index) => {
            const rank = index + 1;

            // ✅ 아이콘/텍스트 분리 (중복 출력 방지)
            let icon = "";
            let text = String(rank);
            let rankClass = "rank-other";
            let rowBg = "";

            if (!isTeam) {
                if (rank === 1) { icon = "🥇"; rankClass = "rank-1"; rowBg = "background:#fffbe6;"; }
                else if (rank === 2) { icon = "🥈"; rankClass = "rank-2"; }
                else if (rank === 3) { icon = "🥉"; rankClass = "rank-3"; }
            } else {
                if (rank === 1) { icon = "🏆"; rankClass = "rank-1"; rowBg = "background:#fffbe6;"; }
                else if (rank === 2) { rankClass = "rank-2"; }
                else if (rank === 3) { rankClass = "rank-3"; }
            }

            const rankCell = icon
                ? `<span class="rank-icon">${icon}</span>`
                : `${text}`;

            let row = `<tr style="${rowBg}">
                <td class="rank-col ${rankClass}">${rankCell}</td>
                <td class="name-col">${item.nickname || item.name || '-'}</td>
                <td class="asset-col ${isTeam ? 'team-asset-col ' : ''}${rank === 1 ? 'top' : ''}">${fitNumber(item.total)}</td>`;

            if (isTeam) {
                row += `<td class="member-col">${item.members || '-'}</td>`;
            } else {
                row += `<td class="sub-asset-col">${fitNumber(item.cash)}</td>
                        <td class="sub-asset-col">${fitNumber(item.stock)}</td>
                        <td class="sub-asset-col">${fitNumber(item.deposit_reward)}</td>
                        <td class="sub-asset-col">${fitNumber(item.quest_reward)}</td>`;
                if (currentFameVariant !== 'rich_vessel') {
                    row += `<td class="sub-asset-col">${fitNumber(item.diligence_reward)}</td>`;
                }
                if (currentFameVariant !== 'basic') {
                    row += `<td class="sub-asset-col success-col">${formatSuccessCount(item.success_count)}</td>`;
                }
            }

            row += `</tr>`;
            tbody.innerHTML += row;
        });
    }

    function setSpecialAwards(data) {
        const isEstateVariant = currentFameVariant === 'advanced' || currentFameVariant === 'rich_vessel';
        document.getElementById('awardStockIcon').innerText  = isEstateVariant ? '🏠' : '📈';
        document.getElementById('awardStockTitle').innerText = isEstateVariant ? 'Estate King' : 'Stock King';

        if (data.length === 0) {
            setAwardDisplay('awardCashName', 'awardCashVal');
            setAwardDisplay('awardDiligenceName', 'awardDiligenceVal');
            setAwardDisplay('awardStockName', 'awardStockVal');
            setAwardDisplay('awardLuckName', 'awardLuckVal');
            return;
        }
        const cashKing = findPositiveAwardWinner(data, 'cash');
        const diligenceKing = findPositiveAwardWinner(data, 'diligence_reward');
        const stockKing = findPositiveAwardWinner(data, 'stock');
        const luckKing = findPositiveAwardWinner(data, 'luck_reward');

        setAwardDisplay('awardCashName', 'awardCashVal', cashKing, 'cash');
        setAwardDisplay('awardDiligenceName', 'awardDiligenceVal', diligenceKing, 'diligence_reward');
        setAwardDisplay('awardStockName', 'awardStockVal', stockKing, 'stock');
        setAwardDisplay('awardLuckName', 'awardLuckVal', luckKing, 'luck_reward');
    }

    function findPositiveAwardWinner(data, field) {
        return [...data]
            .filter(item => Number(item?.[field] || 0) > 0)
            .sort((a, b) => Number(b?.[field] || 0) - Number(a?.[field] || 0))[0] || null;
    }

    function setAwardDisplay(nameId, valueId, winner = null, field = '') {
        const value = Number(winner?.[field] || 0);
        document.getElementById(nameId).innerText = value > 0 ? (winner.nickname || winner.name || '-') : '-';
        document.getElementById(valueId).innerText = value > 0 ? value.toLocaleString() : '-';
    }
