    let _driveFileUrls = {};
    let _fameDriveFileUrls = {};
    let _summaryDriveFileUrl = null;

    function renderPlayStyleReport(p) {
        const badgeWrap = document.getElementById('rptTraitBadges');
        const grid = document.getElementById('rptPlayStyleGrid');

        if (currentGameVariant !== 'basic') {
            if (!p.successFactors) p.successFactors = initSuccessFactorsState();
            const onList = SUCCESS_FACTORS.filter(f => p.successFactors[f.key]);

            if (badgeWrap) {
                badgeWrap.innerHTML = '';
                if (onList.length === 0) {
                    badgeWrap.innerHTML = `<span class="rpt-badge">선택 없음</span>`;
                } else {
                    onList.forEach(f => {
                        badgeWrap.innerHTML += `<span class="rpt-badge on">${f.emo} ${f.name}</span>`;
                    });
                }
            }

            if (!grid) return;
            grid.innerHTML = '';
            SUCCESS_FACTORS.forEach(f => {
                const isOn = !!(p.successFactors && p.successFactors[f.key]);
                grid.innerHTML += `
                    <div class="booth-item booth-item--sf ${isOn ? 'selected' : ''}" onclick="rptToggleSuccessFactor('${f.key}')">
                        <div class="booth-icon">
                            <img src="${f.img}" alt="${f.name}" style="width:44px;height:44px;object-fit:contain;">
                        </div>
                        <div class="booth-text">
                            <h4 style="font-size:13px; margin:0;">${f.name}</h4>
                            <p>${f.desc}</p>
                        </div>
                    </div>`;
            });

        } else {
            if (badgeWrap) {
                badgeWrap.innerHTML = '';
                if (!p.traits) p.traits = initTraitsState();
                const onList = TRAITS.filter(t => p.traits[t.key]);
                if (onList.length === 0) {
                    badgeWrap.innerHTML = `<span class="rpt-badge">선택 없음</span>`;
                } else {
                    onList.forEach(t => {
                        badgeWrap.innerHTML += `<span class="rpt-badge on">${t.emo} ${t.king}</span>`;
                    });
                }
            }

            if (!grid) return;
            grid.innerHTML = '';
            TRAITS.forEach(t => {
                const isOn = !!(p.traits && p.traits[t.key]);
                const title = isOn ? `${t.base} → ${t.king}` : t.base;
                grid.innerHTML += `
                    <div class="booth-item ${isOn ? 'selected' : ''}" onclick="rptToggleTrait('${t.key}')">
                        <div class="booth-icon">${t.emo}</div>
                        <div class="booth-text">
                            <h4>${title}</h4>
                            <p>${t.desc}</p>
                        </div>
                    </div>`;
            });
        }
    }

    function rptToggleSuccessFactor(key) {
        const p = players[viewingPlayerIndex];
        if (!p) return;
        if (!p.successFactors) p.successFactors = initSuccessFactorsState();
        p.successFactors[key] = !p.successFactors[key];
        recalculateAllRankings();
        updateRankUI(p);
        refreshDisplayOnly(p);
        renderPlayStyleReport(p);
    }

    function rptToggleTrait(key) {
        const p = players[viewingPlayerIndex];
        if (!p) return;
        if (!p.traits) p.traits = initTraitsState();
        p.traits[key] = !p.traits[key];
        renderPlayStyleReport(p);
    }
    function finishGame() {
        document.getElementById('finishConfirmModal').classList.add('show');
    }
    async function _finishGameConfirmed() {
        document.getElementById('finishConfirmModal').classList.remove('show');
        recalculateAllRankings();
        switchScreen('reportScreen');
        initAssetGrid('rptStockGrid', false, false);
        viewingPlayerIndex = -1;
        _driveFileUrls = {};
        _summaryDriveFileUrl = null;

        const gameId = players[0]?.gameId;
        if (gameId) {
            try {
                const rewards = await sbGetRewardsByGameId(gameId);
                const rewardMap = Object.fromEntries(rewards.map(r => [r.nickname, r]));
                players.forEach(p => {
                    p.questReward   = Number(rewardMap[p.nickname]?.quest_reward   || 0);
                    p.depositReward = Number(rewardMap[p.nickname]?.deposit_reward || 0);
                });
                recalculateAllRankings();
            } catch(e) {
                console.warn('[finishGame] rewards fetch failed', e);
            }
        }

        showReport(-1);
        saveToDrive(true).catch(e => console.error('[finishGame] saveToDrive 실패', e));
    }
    function _finishGameCancel() {
        document.getElementById('finishConfirmModal').classList.remove('show');
    }
    function showReport(idx) {
        const summaryArea = document.getElementById('pdfAreaRankingSummary');
        const reportArea  = document.getElementById('pdfAreaReport');

        if (idx === -1) {
            summaryArea.style.display = 'block';
            reportArea.style.display  = 'none';
            document.getElementById('pageIndicator').innerText = '결과 요약';
            renderSummaryPage();
            return;
        }

        summaryArea.style.display = 'none';
        reportArea.style.display  = '';

        const p = players[idx];
        document.getElementById('pageIndicator').innerText = `${idx+1} / ${players.length}`;
        let dateStr;
        if (loadedDate){
            dateStr = loadedDate.trim();
        } else {
            dateStr = formatFolderDate();
        }
        const dateInput = document.getElementById('rptDateInput');
        dateInput.value = dateStr;
        dateInput.readOnly = !!loadedDate;
        dateInput.style.cursor = loadedDate ? 'default' : '';

        if(customLogoData) {
            document.getElementById('rptLogoImg').src = customLogoData;
            document.getElementById('rptLogoImg').style.display = 'block';
            document.getElementById('rptLogoText').style.display = 'none';
        } else {
            document.getElementById('rptLogoImg').style.display = 'none';
            document.getElementById('rptLogoText').style.display = 'block';
        }
        document.getElementById('rptNicknameInput').value = p.nickname || '';
        document.getElementById('rptRealNameInput').value = p.realName || p.name || '';

        if (currentMode === 'team') {
            document.getElementById('rptTeamWrapper').style.display = 'inline-flex';
            document.getElementById('rptTeamInput').value = p.team;
            reportArea.classList.add('team-mode');
        } else {
            document.getElementById('rptTeamWrapper').style.display = 'none';
            reportArea.classList.remove('team-mode');
        }
        // 심화/기본 UI 라벨 업데이트
        const assetLabelEl = document.getElementById('rptAssetLabel');
        if (assetLabelEl) {
            assetLabelEl.textContent = currentGameVariant !== 'basic'
                ? '총 자산 (현금 + 부동산 + 성실활동금 + 예금 + 퀘스트) x (경제적 성공요소 개수 x 0.25)'
                : '총 자산 (현금 + 주식 + 성실활동금 + 예금 + 퀘스트)';
        }
        const portfolioHeader = document.getElementById('rptPortfolioHeader');
        if (portfolioHeader) {
            portfolioHeader.textContent = currentGameVariant !== 'basic' ? '나의 부동산 포트폴리오' : '나의 주식 포트폴리오';
        }
        const styleHeader = document.getElementById('rptStyleHeader');
        if (styleHeader) {
            styleHeader.textContent = currentGameVariant !== 'basic' ? '나의 경제적 성공요소' : '나의 플레이 스타일';
        }
        const assetTypeLabel = document.getElementById('rptAssetTypeLabel');
        if (assetTypeLabel) {
            assetTypeLabel.textContent = currentGameVariant !== 'basic' ? '부동산' : '주식';
        }
        document.getElementById('rptCashInput').value = p.manualCash;
        const rptDiligenceInput = document.getElementById('rptDiligenceInput');
        if (rptDiligenceInput) rptDiligenceInput.value = p.diligenceReward || 0;

        const rptDepositInput = document.getElementById('rptDepositInput');
        if (rptDepositInput) rptDepositInput.value = p.depositReward || 0;
        const rptQuestInput = document.getElementById('rptQuestInput');
        if (rptQuestInput) rptQuestInput.value = p.questReward || 0;

        const activeInfo = getActiveAssetInfo();
        for (let k in activeInfo) {
            const inputEl = document.getElementById(`rpt_cnt_input_${k}`);
            const valEl   = document.getElementById(`rpt_val_${k}`);
            if (inputEl) inputEl.value = p.assets[k] || 0;
            if (valEl)   valEl.innerText = ((p.assets[k] || 0) * activeInfo[k].price).toLocaleString() + "원";
        }
        document.getElementById('rptEftiInput').value = p.efti || '-';
        ['rptDateInput','rptNicknameInput','rptRealNameInput','rptTeamInput','rptEftiInput'].forEach(id => {
            const el = document.getElementById(id);
            if (el) autoResizeInput(el);
        });
        updateRankUI(p);
        refreshDisplayOnly(p);
        renderPlayStyleReport(p);
    }

    function updatePlayerNickname() {
        const p = players[viewingPlayerIndex];
        if (!p) return;

        const input = document.getElementById('rptNicknameInput');
        const value = sanitizeNickname(input.value);
        input.value = value;

        p.nickname = value;
        updateTop3List();
    }
    function updatePlayerRealName() {
        const p = players[viewingPlayerIndex];
        if (!p) return;

        const input = document.getElementById('rptRealNameInput');
        const value = sanitizeLimitedText(input.value);
        input.value = value;

        p.realName = value;
        showReport(viewingPlayerIndex);
    }
    function updatePlayerEfti() {
        const p = players[viewingPlayerIndex];
        if (!p) return;

        const input = document.getElementById('rptEftiInput');
        const value = String(input?.value ?? '').trim() || '-';

        p.efti = value;
        input.value = value;
    }
    function updateTeamName() {
        const p = players[viewingPlayerIndex];
        if (!p) return;

        const input = document.getElementById('rptTeamInput');
        const oldTeam = p.team;
        const newTeam = sanitizeLimitedText(input.value);
        input.value = newTeam;

        if (!newTeam || oldTeam === newTeam) return;

        players.forEach(player => {
            if (player.team === oldTeam) player.team = newTeam;
        });

        showReport(viewingPlayerIndex);
    }
    function manualUpdate() {
        const p = players[viewingPlayerIndex];
        if (!p) return;

        applyInputsToPlayer(p, 'rpt');
        recalculateAllRankings();
        updateRankUI(p);
        refreshDisplayOnly(p);
        renderPlayStyleReport(p);
    }
    function updateRankUI(p) {
        document.getElementById('rptRankIndiv').innerText = p.rankIndiv;
        document.getElementById('rptTotalPlayers').innerText = players.length;
        if(currentMode === 'team') {
            document.getElementById('rptTeamSection').style.display = 'block';
            document.getElementById('rptTeamDisplay').innerText = p.team;
            document.getElementById('rptRankTeam').innerText = p.rankTeam;
            document.getElementById('rptTeamTotalAsset').innerText = p.teamTotal.toLocaleString();
        } else { document.getElementById('rptTeamSection').style.display = 'none'; }
        updateTop3List();
    }
    function updateTop3List() {
        const container = document.getElementById('top3Container');
        container.innerHTML = '';

        const getDisplayName = (p) => p.nickname || p.realName || p.name || '-';

        if (currentMode === 'team') {
            container.innerHTML = `
                <div class="fame-split-container">
                    <div class="fame-col separator" id="indivTop3">
                        <div class="fame-col-title">개인 TOP 3</div>
                    </div>
                    <div class="fame-col" id="teamTop3">
                        <div class="fame-col-title">팀 TOP 3</div>
                    </div>
                </div>
            `;

            const indivList = document.getElementById('indivTop3');
            [...players]
                .sort((a, b) => b.total - a.total)
                .slice(0, 3)
                .forEach((p, i) => {
                    indivList.innerHTML += makeTop3Html(i, getDisplayName(p), p.total);
                });

            const teamMap = {};
            players.forEach(p => {
                if (!teamMap[p.team]) teamMap[p.team] = 0;
                teamMap[p.team] += p.total;
            });

            const teamRanked = Object.keys(teamMap)
                .map(teamName => ({ name: teamName, total: teamMap[teamName] }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 3);

            const teamList = document.getElementById('teamTop3');
            teamRanked.forEach((t, i) => {
                teamList.innerHTML += makeTop3Html(i, t.name, t.total);
            });
        } else {
            [...players]
                .sort((a, b) => b.total - a.total)
                .slice(0, 3)
                .forEach((p, i) => {
                    container.innerHTML += makeTop3Html(i, getDisplayName(p), p.total);
                });
        }
    }
    function makeTop3Html(i, name, total) {
        let cls = i===0?'rank-1st':'';
        let medal = i===0?'🥇':(i===1?'🥈':'🥉');
        return `<div class="top3-item">
        <div style="width:45px; text-align:left; font-weight:bold;" class="${cls}">${medal} ${i+1}위</div>
        <div style="flex:1; text-align:left; font-weight:bold; color:#333; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; padding-left:6px;">${name}</div>
        <div style="text-align:right; font-weight:normal; color:#555;">${total.toLocaleString()}원</div>
        </div>`;
    }
    function setDonutSegment(el, percent, offsetPercent) {
        const r = 42;
        const circumference = 2 * Math.PI * r;

        const clamped = Math.max(0, Math.min(100, percent));
        const dash = (clamped / 100) * circumference;
        const gap = circumference - dash;

        el.setAttribute('stroke-dasharray', `${dash} ${gap}`);
        el.setAttribute('stroke-dashoffset', `${-(offsetPercent / 100) * circumference}`);
    }

    function clearDonutSegment(el) {
        el.setAttribute('stroke-dasharray', `0 9999`);
        el.setAttribute('stroke-dashoffset', `0`);
    }
    function refreshDisplayOnly(p) {
        const cash      = Number(p.manualCash      || 0);
        const assetVal  = Number(calcActiveAsset(p.assets || {}) || 0);
        const diligence = Number(p.diligenceReward || 0);
        const deposit   = Number(p.depositReward   || 0);
        const quest     = Number(p.questReward     || 0);
        const base = cash + assetVal + diligence + deposit + quest;

        let total;
        if (currentGameVariant !== 'basic') {
            total = base * calcSuccessMultiplier(p.successFactors || {});
        } else {
            total = base;
        }
        p.total = total;

        document.getElementById('rptTotalAsset').innerText = total.toLocaleString() + " 원";
        document.getElementById('rptStock').innerText = assetVal.toLocaleString();

        const rptDiligenceInput = document.getElementById('rptDiligenceInput');
        if (rptDiligenceInput) rptDiligenceInput.value = diligence;
        const rptDepositInput = document.getElementById('rptDepositInput');
        if (rptDepositInput) rptDepositInput.value = deposit;
        const rptQuestInput = document.getElementById('rptQuestInput');
        if (rptQuestInput) rptQuestInput.value = quest;

        const activeInfo = getActiveAssetInfo();
        for (let k in activeInfo) {
            const valEl = document.getElementById(`rpt_val_${k}`);
            if (valEl) valEl.innerText = ((p.assets[k] || 0) * activeInfo[k].price).toLocaleString() + "원";
        }

        const cashPct = base > 0 ? Math.round((cash / base) * 100) : 0;
        document.getElementById('rptCashPct').innerText = `${cashPct}%`;

        const cashCircle      = document.getElementById('rptArcCash');
        const stockCircle     = document.getElementById('rptArcStock');
        const diligenceCircle = document.getElementById('rptArcDiligence');
        const depositCircle   = document.getElementById('rptArcDeposit');
        const questCircle     = document.getElementById('rptArcQuest');

        if (total <= 0) {
            clearDonutSegment(cashCircle);
            clearDonutSegment(stockCircle);
            clearDonutSegment(diligenceCircle);
            if (depositCircle) clearDonutSegment(depositCircle);
            if (questCircle)   clearDonutSegment(questCircle);
            return;
        }

        const cashPercent      = (cash      / base) * 100;
        const assetPercent     = (assetVal  / base) * 100;
        const diligencePercent = (diligence / base) * 100;
        const depositPercent   = (deposit   / base) * 100;
        const questPercent     = (quest     / base) * 100;

        const _seg = (el, pct, off) => {
            if (!el) return;
            pct > 0 ? setDonutSegment(el, pct, off) : clearDonutSegment(el);
        };
        _seg(cashCircle,      cashPercent,      0);
        _seg(stockCircle,     assetPercent,     cashPercent);
        _seg(diligenceCircle, diligencePercent, cashPercent + assetPercent);
        _seg(depositCircle,   depositPercent,   cashPercent + assetPercent + diligencePercent);
        _seg(questCircle,     questPercent,     cashPercent + assetPercent + diligencePercent + depositPercent);
    }
    function renderSummaryPage() {
        if (customLogoData) {
            document.getElementById('summaryLogoImg').src = customLogoData;
            document.getElementById('summaryLogoImg').style.display = 'block';
            document.getElementById('summaryLogoText').style.display = 'none';
        } else {
            document.getElementById('summaryLogoImg').style.display = 'none';
            document.getElementById('summaryLogoText').style.display = 'block';
        }

        const summaryDateEl = document.getElementById('summaryDateText');
        if (summaryDateEl) summaryDateEl.textContent = loadedDate ? loadedDate.trim() : formatFolderDate();
        document.getElementById('summaryAssetHeader').textContent = currentGameVariant !== 'basic' ? '부동산' : '주식';

        const sorted = [...players].sort((a, b) => b.total - a.total);
        const tbody = document.getElementById('summaryIndivTableBody');
        tbody.innerHTML = '';
        sorted.forEach((p, i) => {
            const rank = i + 1;
            let icon = '', rowBg = '';
            if      (rank === 1) { icon = '🥇'; rowBg = 'background:#fffbe6;'; }
            else if (rank === 2) { icon = '🥈'; }
            else if (rank === 3) { icon = '🥉'; }
            const rankCell  = icon ? `<span class="rank-icon">${icon}</span>` : String(rank);
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
            const cash     = Number(p.manualCash      || 0);
            const assetVal = Number(calcActiveAsset(p.assets || {}) || 0);
            const etc      = Number(p.diligenceReward || 0) + Number(p.depositReward || 0) + Number(p.questReward || 0);
            tbody.innerHTML += `<tr style="${rowBg}">
                <td class="rank-col ${rankClass}">${rankCell}</td>
                <td class="name-col">${p.nickname || p.name || '-'}</td>
                <td class="asset-col ${rank === 1 ? 'top' : ''}">${Number(p.total).toLocaleString()}</td>
                <td class="sub-asset-col">${cash.toLocaleString()}</td>
                <td class="sub-asset-col">${assetVal.toLocaleString()}</td>
                <td class="sub-asset-col">${etc.toLocaleString()}</td>
            </tr>`;
        });

        const teamSection = document.getElementById('summaryTeamSection');
        if (currentMode === 'team') {
            teamSection.style.display = 'block';
            const teamMap = {};
            players.forEach(p => {
                if (!teamMap[p.team]) teamMap[p.team] = { total: 0, members: [] };
                teamMap[p.team].total += p.total;
                teamMap[p.team].members.push(p.nickname || p.name || '');
            });
            const teamRanked = Object.entries(teamMap)
                .map(([name, data]) => ({ name, total: data.total, members: data.members.join(', ') }))
                .sort((a, b) => b.total - a.total);
            const teamTbody = document.getElementById('summaryTeamTableBody');
            teamTbody.innerHTML = '';
            teamRanked.forEach((t, i) => {
                const rank = i + 1;
                let icon = '', rowBg = '';
                if (rank === 1) { icon = '🏆'; rowBg = 'background:#fffbe6;'; }
                const rankCell  = icon ? `<span class="rank-icon">${icon}</span>` : String(rank);
                const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
                teamTbody.innerHTML += `<tr style="${rowBg}">
                    <td class="rank-col ${rankClass}">${rankCell}</td>
                    <td class="name-col">${t.name}</td>
                    <td class="asset-col ${rank === 1 ? 'top' : ''}">${t.total.toLocaleString()}</td>
                    <td class="member-col">${t.members}</td>
                </tr>`;
            });
        } else {
            teamSection.style.display = 'none';
        }
    }

    function prevPlayer() {
        if (viewingPlayerIndex > 0) { viewingPlayerIndex--; showReport(viewingPlayerIndex); }
        else if (viewingPlayerIndex === 0) { viewingPlayerIndex = -1; showReport(-1); }
    }
    function nextPlayer() {
        if (viewingPlayerIndex === -1) { viewingPlayerIndex = 0; showReport(0); }
        else if (viewingPlayerIndex < players.length - 1) { viewingPlayerIndex++; showReport(viewingPlayerIndex); }
    }

    // ✅ [수정] downloadPDF 함수 (문법/옵션 구조 정상화)
    async function downloadPDF(type) {
        const areaId = type === 'report'
            ? (viewingPlayerIndex === -1 ? 'pdfAreaRankingSummary' : 'pdfAreaReport')
            : 'pdfAreaFame';
        const target = document.getElementById(areaId);

        if (!target) {
            alert("PDF 대상 영역을 찾을 수 없습니다.");
            return;
        }

        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const opt = {
            margin: 0,
            filename: type === 'report'
                ? (viewingPlayerIndex === -1
                    ? `${(loadedDate ? loadedDate.trim() : formatFolderDate(new Date())).replace(/-/g, '')}_최종순위.pdf`
                    : buildReportPdfFileName(players[viewingPlayerIndex], viewingPlayerIndex))
                : `${formatFolderDate(new Date()).replace(/-/g, '')}_명예의전당.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.clientWidth,
                windowHeight: document.documentElement.clientHeight,
                onclone: (doc) => {
                    const cloned = doc.getElementById(areaId);
                    if (!cloned) return;

                    cloned.classList.add('pdf-export');
                    cloned.style.boxShadow = 'none';
                    cloned.querySelectorAll('.no-print').forEach(el => { el.style.display = 'none'; });

                    // input -> span 치환
                    cloned.querySelectorAll('input').forEach((inp) => {
                        const span = doc.createElement('span');
                        span.className = `${inp.className || ''} pdf-input`;
                        span.textContent = (inp.value ?? '').toString();
                        span.style.cssText = inp.style.cssText || '';
                        span.style.border = 'none';
                        span.style.background = 'transparent';

                        const w = inp.offsetWidth;
                        if (w > 0) span.style.width = `${w}px`;

                        inp.replaceWith(span);
                    });
                }
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        await html2pdf().set(opt).from(target).save();
    }

    async function getPdfBase64FromElement(areaId, filename) {
        const target = document.getElementById(areaId);
        if (!target) throw new Error("PDF 대상 영역을 찾을 수 없습니다.");

        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const opt = {
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.clientWidth,
                windowHeight: document.documentElement.clientHeight,
                onclone: (doc) => {
                    const cloned = doc.getElementById(areaId);
                    if (!cloned) return;

                    cloned.classList.add('pdf-export');
                    cloned.style.boxShadow = 'none';
                    cloned.querySelectorAll('.no-print').forEach(el => { el.style.display = 'none'; });

                    cloned.querySelectorAll('input').forEach((inp) => {
                        const span = doc.createElement('span');
                        span.className = `${inp.className || ''} pdf-input`;
                        span.textContent = (inp.value ?? '').toString();
                        span.style.cssText = inp.style.cssText || '';
                        span.style.border = 'none';
                        span.style.background = 'transparent';

                        const w = inp.offsetWidth;
                        if (w > 0) span.style.width = `${w}px`;

                        inp.replaceWith(span);
                    });

                    // file:// 이미지 제거 — HTTP 서버 환경에서는 불필요, file:// 직접 실행 시 canvas taint 방지
                    cloned.querySelectorAll('img').forEach(img => {
                        const src = img.getAttribute('src') || '';
                        if (src && !src.startsWith('data:') && !src.startsWith('http')) {
                            img.removeAttribute('src');
                        }
                    });
                    cloned.querySelectorAll('*').forEach(el => {
                        const bg = el.style.backgroundImage;
                        if (bg && bg.includes('url(') && !bg.includes('data:') && !bg.includes('http')) {
                            el.style.backgroundImage = 'none';
                        }
                    });
                }
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        const worker = html2pdf().set(opt).from(target);
        const dataUriString = await worker.outputPdf('datauristring');

        // 쉼표 뒤만 취해서 순수 base64만 남김
        return String(dataUriString)
            .split(',')
            .pop()
            .replace(/\s/g, '');
    }

    function shareReport() {
        const modal    = document.getElementById('shareModal');
        const urlRow   = document.getElementById('shareUrlRow');
        const urlInput = document.getElementById('shareUrlInput');
        const noUrlMsg = document.getElementById('shareNoUrlMsg');

        let url;
        if (viewingPlayerIndex === -1) {
            url = _summaryDriveFileUrl;
        } else {
            const p = players[viewingPlayerIndex];
            url = (p && p.reportFileUrl) || _driveFileUrls[viewingPlayerIndex];
        }

        if (url) {
            urlInput.value = url;
            urlRow.style.display = 'flex';
            noUrlMsg.style.display = 'none';
        } else {
            urlRow.style.display = 'none';
            noUrlMsg.style.display = 'block';
        }
        modal.classList.add('show');
    }

    function closeShareModal() {
        document.getElementById('shareModal').classList.remove('show');
    }

    function copyShareLink() {
        const url = document.getElementById('shareUrlInput').value;
        navigator.clipboard.writeText(url)
            .then(() => {
                const btn = document.querySelector('#shareModal .btn-primary');
                const orig = btn.textContent;
                btn.textContent = '✅ 복사됨';
                setTimeout(() => { btn.textContent = orig; }, 1500);
            })
            .catch(() => prompt('아래 링크를 복사하세요:', url));
    }

    async function uploadPdfToDrive() {
        const btn = document.getElementById('btnSaveDriveReport');

        if (!players || players.length === 0) {
            alert("저장할 참가자가 없습니다.");
            return;
        }

        if (isSampleMode) {
            alert("⚠️ 견본(샘플) 데이터는 출력 폴더로 업로드할 수 없습니다.\n실제 게임 결과만 업로드해주세요.");
            return;
        }

        if (isSavingDrive) return;
        isSavingDrive = true;

        const originalHtml = btn.innerHTML;
        const originalIndex = viewingPlayerIndex;

        btn.disabled = true;
        btn.innerHTML = `📄 PDF 일괄 저장 중...`;

        try {
            const gameDate = loadedDate ? loadedDate.trim()
                : ((document.getElementById('rptDateInput')?.value || '').trim() || formatFolderDate(new Date()));

            // 결과 요약 페이지 먼저 저장
            viewingPlayerIndex = -1;
            showReport(-1);
            await waitForRenderFrame();
            const summaryFileName = `${gameDate.replace(/-/g, '')}_최종순위.pdf`;
            const summaryPdfBase64 = await getPdfBase64FromElement('pdfAreaRankingSummary', summaryFileName);
            const summaryRes = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "uploadPDF", pdfBase64: summaryPdfBase64, fileName: summaryFileName, category: "asset_report", gameDate, nickname: "summary", real_name: "" })
            });
            const summaryJson = await summaryRes.json();
            if (!summaryJson.success) throw new Error(`요약 업로드 실패\n${summaryJson?.message || ''}`);
            const summaryFileUrl = summaryJson.fileUrl || (summaryJson.fileId ? `https://drive.google.com/file/d/${summaryJson.fileId}/view` : null);
            if (summaryFileUrl) _summaryDriveFileUrl = summaryFileUrl;

            for (let i = 0; i < players.length; i++) {
                viewingPlayerIndex = i;
                showReport(i);
                await waitForRenderFrame();

                const p = players[i];
                const nickname = (p.nickname || p.name || `참가자${i + 1}`).trim();
                const realName = (p.realName || p.name || '').trim();

                const fileName = buildReportPdfFileName(p, i);
                const pdfBase64 = await getPdfBase64FromElement('pdfAreaReport', fileName);

                const payload = {
                    action: "uploadPDF",
                    pdfBase64,
                    fileName,
                    category: "asset_report",
                    gameDate,
                    nickname,
                    real_name: realName
                };

                const res  = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (!json.success) {
                    throw new Error(`업로드 실패 (${i + 1}/${players.length})\n${json?.message || ''}`);
                }
                const fileUrl = json.fileUrl || (json.fileId ? `https://drive.google.com/file/d/${json.fileId}/view` : null);
                if (fileUrl) {
                    _driveFileUrls[i] = fileUrl;
                    players[i].reportFileUrl = fileUrl;
                }
            }

            alert(`✅ 결과 요약 1개 + 참가자 ${players.length}명의 PDF를 모두 드라이브에 저장했습니다.`);
        } catch (err) {
            console.error("[uploadPdfToDrive] ERROR", err);
            alert("❌ PDF 일괄 저장 실패:\n" + (err?.message || String(err)));
        } finally {
            viewingPlayerIndex = originalIndex;
            if (originalIndex === -1 || players[originalIndex]) showReport(originalIndex);

            isSavingDrive = false;
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
    async function uploadFamePdfToDrive() {
        const btn = document.getElementById('btnSaveFameDrive');
        if (!btn) return;

        const originalHtml    = btn.innerHTML;
        const originalVariant = currentFameVariant;
        btn.disabled = true;

        const variants = [
            { key: 'basic',       label: '기본' },
            { key: 'advanced',    label: '심화' },
            { key: 'rich_vessel', label: '부자의그릇' }
        ];

        try {
            const gameDate    = formatFolderDate(new Date());
            const dateCompact = gameDate.replace(/-/g, '');

            for (let i = 0; i < variants.length; i++) {
                const { key, label } = variants[i];
                btn.innerHTML = `☁️ 저장 중... (${i + 1}/${variants.length})`;

                switchFameTab(key);
                await waitForRenderFrame();

                const fileName  = `${dateCompact}_${label}_명예의전당.pdf`;
                const pdfBase64 = await getPdfBase64FromElement('pdfAreaFame', fileName);

                const res  = await fetch(SCRIPT_URL, {
                    method:  'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body:    JSON.stringify({
                        action: "uploadPDF", pdfBase64, fileName,
                        category: "hall_of_fame", gameDate,
                        nickname: "hall_of_fame", real_name: ""
                    })
                });
                const json = await res.json();
                if (!json.success) {
                    throw new Error(`${label} 저장 실패: ${json?.message || ''}`);
                }
            }

            alert(`✅ 명예의 전당 PDF 3개가 드라이브에 저장됐습니다.\n(기본 / 심화 / 부자의그릇)`);
        } catch (err) {
            console.error("[uploadFamePdfToDrive] ERROR", err);
            alert("❌ 명예의 전당 PDF 저장 실패:\n" + (err?.message || String(err)));
        } finally {
            switchFameTab(originalVariant);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    async function uploadCurrentReportToDrive() {
        const btn = document.getElementById('btnSaveDriveReportSingle');
        if (isSampleMode) { alert("⚠️ 견본(샘플) 데이터는 드라이브에 저장할 수 없습니다."); return; }
        if (isSavingDrive) return;
        isSavingDrive = true;

        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '☁️ 저장 중...';

        try {
            const gameDate = loadedDate ? loadedDate.trim()
                : ((document.getElementById('rptDateInput')?.value || '').trim() || formatFolderDate(new Date()));

            if (viewingPlayerIndex === -1) {
                const dateCompact = gameDate.replace(/-/g, '');
                const fileName = `${dateCompact}_최종순위.pdf`;
                const pdfBase64 = await getPdfBase64FromElement('pdfAreaRankingSummary', fileName);
                const res = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: "uploadPDF", pdfBase64, fileName, category: "asset_report", gameDate, nickname: "summary", real_name: "" })
                });
                const json = await res.json();
                if (!json.success) throw new Error(json?.message || '업로드 실패');
                const fileUrl = json.fileUrl || (json.fileId ? `https://drive.google.com/file/d/${json.fileId}/view` : null);
                if (fileUrl) _summaryDriveFileUrl = fileUrl;
                alert('✅ 결과 요약 PDF가 드라이브에 저장됐습니다.');
                return;
            }

            if (!players || players.length === 0) throw new Error('저장할 참가자가 없습니다.');
            const i = viewingPlayerIndex;
            const p = players[i];
            const nickname = (p.nickname || p.name || `참가자${i + 1}`).trim();
            const realName = (p.realName || p.name || '').trim();
            const fileName = buildReportPdfFileName(p, i);
            const pdfBase64 = await getPdfBase64FromElement('pdfAreaReport', fileName);

            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "uploadPDF", pdfBase64, fileName, category: "asset_report", gameDate, nickname, real_name: realName })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json?.message || '업로드 실패');

            const fileUrl = json.fileUrl || (json.fileId ? `https://drive.google.com/file/d/${json.fileId}/view` : null);
            if (fileUrl) { _driveFileUrls[i] = fileUrl; players[i].reportFileUrl = fileUrl; }

            alert(`✅ ${nickname}의 자산 리포트가 드라이브에 저장됐습니다.`);
        } catch (err) {
            console.error("[uploadCurrentReportToDrive] ERROR", err);
            alert("❌ 드라이브 저장 실패:\n" + (err?.message || String(err)));
        } finally {
            isSavingDrive = false;
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    async function uploadCurrentFamePdfToDrive() {
        const btn = document.getElementById('btnSaveFameDriveSingle');
        if (!btn) return;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '☁️ 저장 중...';

        const variantLabels = { basic: '기본', advanced: '심화', rich_vessel: '부자의그릇' };
        const key = currentFameVariant || 'basic';
        const label = variantLabels[key] || key;

        try {
            const gameDate = formatFolderDate(new Date());
            const dateCompact = gameDate.replace(/-/g, '');
            const fileName = `${dateCompact}_${label}_명예의전당.pdf`;
            const pdfBase64 = await getPdfBase64FromElement('pdfAreaFame', fileName);

            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "uploadPDF", pdfBase64, fileName, category: "hall_of_fame", gameDate, nickname: "hall_of_fame", real_name: "" })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json?.message || '업로드 실패');

            const fileUrl = json.fileUrl || (json.fileId ? `https://drive.google.com/file/d/${json.fileId}/view` : null);
            if (fileUrl) _fameDriveFileUrls[key] = fileUrl;

            alert(`✅ [${label}] 명예의 전당 PDF가 드라이브에 저장됐습니다.`);
        } catch (err) {
            console.error("[uploadCurrentFamePdfToDrive] ERROR", err);
            alert("❌ 드라이브 저장 실패:\n" + (err?.message || String(err)));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    function shareFame() {
        const key = currentFameVariant || 'basic';
        const url = _fameDriveFileUrls[key];
        const modal = document.getElementById('shareModal');
        const urlRow = document.getElementById('shareUrlRow');
        const urlInput = document.getElementById('shareUrlInput');
        const noUrlMsg = document.getElementById('shareNoUrlMsg');

        if (url) {
            urlRow.style.display = 'flex';
            urlInput.value = url;
            noUrlMsg.style.display = 'none';
        } else {
            urlRow.style.display = 'none';
            noUrlMsg.style.display = 'block';
        }
        modal.classList.add('show');
    }

    function printReport() { window.print(); }
    function printFame() { window.print(); }


    // 중복제거 안됨
    async function saveTraits(gameId, players) {
        return await sbSaveTraits(gameId, players);
    }

    async function saveToDrive(_fromFinish = false) {
        if (isSavingDrive) return;

        const btn = null;
        const originalHtml = '';

        try {
            if (isSampleMode) {
                alert("⚠️ 견본(샘플) 데이터는 드라이브에 저장할 수 없습니다.\n실제 게임을 진행한 후 저장해주세요.");
                console.warn("[saveToDrive] blocked: sample mode");
                return;
            }

            if (!_fromFinish) {
                const ok = confirm("현재 게임 결과를 [명예의 전당] 데이터베이스에 저장하시겠습니까?");
                console.log("[saveToDrive] confirm =", ok);
                if (!ok) return;
            }

            isSavingDrive = true;
            if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> 저장 중...`; }

            // 날짜 포맷 깔끔하게 (디버그에도 좋음)
            let dateStr;
            if (loadedDate){
                dateStr = loadedDate.trim();
            } else {
                dateStr = formatFolderDate();
            }
            let gameId;
            if (loadedDate) {
                // 과거 데이터 수정 시: 기존 game_id 유지
                gameId = players[0]?.gameId ?? null;
            } else if (players[0]?.gameId) {
                // sbInitGame에서 이미 stock_price 삽입 완료 — 재사용
                gameId = players[0].gameId;
            } else {
                const stockValues = Object.values(stockInfo).map(s => s.price);
                gameId = await saveStockValue(stockValues);
                players.forEach(p => p.gameId = gameId);
            }

            if (currentGameVariant !== 'basic') {
                await Promise.all(players.map(p => sbSaveEstateBalance(p.nickname, gameId, p.assets)));
                await sbSaveSuccessFactors(gameId, players);
            } else {
                await Promise.all(players.map(p => saveUserBalance(p.nickname, gameId, p.assets)));
                await saveTraits(gameId, players);
            }
            await Promise.all(players.map(p => {
                const saves = [];
                if (p.depositReward !== undefined) saves.push(sbSaveDepositReward(gameId, p.nickname, p.depositReward));
                if (p.questReward   !== undefined) saves.push(sbSaveQuestReward(gameId,   p.nickname, p.questReward));
                return Promise.all(saves);
            }));

            recalculateAllRankings();

            const exportData = {
                action: "saveGameResult",
                mode: currentMode,
                date: dateStr,
                game_variant: currentGameVariant,
                individuals: players.map(p => ({
                    game_id: p.gameId || null,
                    nickname: p.nickname || '',
                    real_name: p.realName || p.name || '',
                    efti_type: p.efti || '',
                    total: p.total,
                    manualCash: p.manualCash,
                    diligence_reward: p.diligenceReward || 0,
                    questReward: p.questReward || 0,
                    depositReward: p.depositReward || 0,
                    stockVal: calcActiveAsset(p.assets),
                    team: p.team || '-',
                    team_id: p.teamId || '',
                    traits: p.traits || initTraitsState()
                })),
                teams: []
            };

            if (currentMode === 'team') {
                const teamMap = {};
                players.forEach(p => {
                    if (!teamMap[p.team]) teamMap[p.team] = { total: 0, memberObjs: [] };
                    teamMap[p.team].total += p.total;
                    teamMap[p.team].memberObjs.push(p);
                });

                for (const tName in teamMap) {
                    const sortedMembers = teamMap[tName].memberObjs.sort((a, b) => b.total - a.total);

                    exportData.teams.push({
                        team_id: sortedMembers[0]?.teamId || '',
                        game_id: sortedMembers[0]?.gameId || '',
                        name: tName,
                        total: teamMap[tName].total,
                        members: sortedMembers
                            .map(m => (m.nickname || '').trim())
                            .filter(Boolean)
                            .join(", ")
                    });
                }
            }

            console.log("[saveToDrive] payload preview", exportData);
            // alert("DEBUG: 요청 보냄 (콘솔/네트워크 탭 확인)");

            const result = await sbSaveGameResult(exportData);
            if (!result.success) {
                alert("❌ 저장 실패");
                return;
            }

            alert("✅ 저장 완료");
        } catch (err) {
            console.error("[saveToDrive] ERROR", err);
            alert("❌ fetch 예외 발생:\n" + (err?.message || String(err)));
        } finally {
            isSavingDrive = false;
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
        }
    }

    function buildReportPdfFileName(p, index) {
        const date = loadedDate ? loadedDate.trim() : formatFolderDate(new Date());
        const teamPrefix = (currentMode === 'team' && p.team && p.team !== '-') ? `${p.team}_` : '';
        const displayName = (p.nickname || p.realName || p.name || `참가자${index + 1}`).trim();
        const dateCompact = date.replace(/-/g, '');
        return `${dateCompact}_${teamPrefix}${displayName}_자산리포트.pdf`;
    }
    // ── 과거 게임 모달 ──────────────────────────────────────────
    async function promptAndLoadPastAssets() {
        const modal = document.getElementById('pastGameModal');
        const select = document.getElementById('pastGameDateSelect');
        const grid = document.getElementById('pastGameCardsGrid');
        const loading = document.getElementById('pastGameLoading');

        // 초기화
        select.innerHTML = '<option value="">-- 날짜를 선택하세요 --</option>';
        grid.innerHTML = '';
        loading.style.display = 'none';
        modal.classList.add('show');

        // 날짜 목록 로드
        try {
            loading.style.display = 'block';
            const dates = await sbGetGameDates();
            loading.style.display = 'none';
            if (dates.length === 0) {
                grid.innerHTML = '<p style="color:#888; font-size:13px; text-align:center;">저장된 게임 기록이 없습니다.</p>';
                return;
            }
            dates.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                select.appendChild(opt);
            });
        } catch(e) {
            loading.style.display = 'none';
            grid.innerHTML = '<p style="color:#d32f2f; font-size:13px; text-align:center;">날짜 목록 불러오기 실패</p>';
        }
    }

    function closePastGameModal() {
        document.getElementById('pastGameModal').classList.remove('show');
    }

    function handlePastGameBackdrop(e) {
        if (e.target === document.getElementById('pastGameModal')) closePastGameModal();
    }

    let _selectedPastGame = null;

    function _setPastGameActionButtons(visible) {
        document.getElementById('btnPastGameLoad').style.display = visible ? 'inline-flex' : 'none';
        document.getElementById('btnPastGameDelete').style.display = visible ? 'inline-flex' : 'none';
    }

    async function onPastGameDateChange() {
        const date = document.getElementById('pastGameDateSelect').value;
        const grid = document.getElementById('pastGameCardsGrid');
        const loading = document.getElementById('pastGameLoading');

        grid.innerHTML = '';
        _selectedPastGame = null;
        _setPastGameActionButtons(false);
        if (!date) return;

        loading.style.display = 'block';
        try {
            const games = await sbGetGamesByDate(date);
            loading.style.display = 'none';
            if (!games || games.length === 0) {
                grid.innerHTML = '<p style="color:#888; font-size:13px; text-align:center;">해당 날짜에 게임 기록이 없습니다.</p>';
                return;
            }
            games.forEach(g => {
                const sectionLabel = String(g.section_num).padStart(2, '0') + '분반';
                const typeLabel = g.game_type === 'team' ? '팀전' : '개인전';
                const typeTag = g.game_type === 'team' ? 'tag-team' : 'tag-individual';
                const names = (g.preview_names || []).join(', ') + (g.player_count > 6 ? ' 등' : '');
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
                card.onclick = () => {
                    document.querySelectorAll('#pastGameCardsGrid .past-game-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    _selectedPastGame = { gameId: g.game_id, date: g.date, gameVariant: g.game_variant || 'basic' };
                    _setPastGameActionButtons(true);
                };
                grid.appendChild(card);
            });
        } catch(e) {
            loading.style.display = 'none';
            grid.innerHTML = '<p style="color:#d32f2f; font-size:13px; text-align:center;">불러오기 실패: ' + e.message + '</p>';
        }
    }

    function confirmLoadPastGame() {
        if (!_selectedPastGame) return;
        _loadPastGame(_selectedPastGame.gameId, _selectedPastGame.date, _selectedPastGame.gameVariant);
    }

    async function confirmDeletePastGame() {
        if (!_selectedPastGame) return;
        const { gameId, date } = _selectedPastGame;
        if (!confirm(`이 게임 기록을 삭제하시겠습니까?\n(${date} / game_id: ${gameId})\n\n삭제된 데이터는 복구할 수 없습니다.`)) return;

        const btn = document.getElementById('btnPastGameDelete');
        btn.disabled = true;
        btn.textContent = '삭제 중...';
        try {
            await sbDeleteGame(gameId);
            alert('✅ 게임 기록이 삭제되었습니다.');
            _selectedPastGame = null;
            _setPastGameActionButtons(false);
            onPastGameDateChange();
        } catch(e) {
            alert('❌ 삭제 실패: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '삭제하기';
        }
    }

    async function _loadPastGame(gameId, gameDate, gameVariant = 'basic') {
        closePastGameModal();
        currentGameVariant = gameVariant;
        try {
            const data = await sbLoadAssetsByGameId(gameId);
            if (!data.success || !Array.isArray(data.history) || data.history.length === 0) {
                alert(`ℹ️ 해당 게임(${gameId})의 데이터가 없습니다.`);
                return;
            }

            players = data.history.map((p, index) => {
                const nameValue = p.real_name || 'Unknown';
                return {
                    id: index,
                    gameId: p.game_id || null,
                    nickname: p.nickname || '',
                    realName: nameValue,
                    name: nameValue,
                    efti: p.efti || '-',
                    team: p.team || '-',
                    teamId: p.team_id || null,
                    assets: p.assets || (typeof initAssets === 'function' ? initAssets() : {}),
                    total: Number(p.total_asset) || 0,
                    manualCash: Number(p.cash) || 0,
                    diligenceReward: Number(p.diligence_reward) || 0,
                    questReward:     Number(p.quest_reward)     || 0,
                    depositReward:   Number(p.deposit_reward)   || 0,
                    rankIndiv: 0,
                    rankTeam: 0,
                    teamTotal: 0,
                    traits: p.traits || (typeof initTraitsState === 'function' ? initTraitsState() : {})
                };
            });

            // EFTI 반영
            if (citizenListData.length === 0) {
                try { await fetchCitizenList(); } catch(e) { console.warn("시민권자 목록 불러오기 실패:", e); }
            }
            players.forEach(p => {
                const citizen = citizenListData.find(c => c.nickname === p.nickname);
                if (citizen && citizen.default_EFTI) p.efti = citizen.default_EFTI;
            });

            // 심화 모드: estate 가격 복원 (저장 당시 가격으로 총자산 재계산)
            if (gameVariant !== 'basic') {
                const savedPrices = await sbLoadEstatePrice(gameId);
                if (savedPrices) {
                    for (const k in savedPrices) {
                        if (estateInfo[k]) estateInfo[k].price = savedPrices[k];
                    }
                }
            }

            // 자산 보유 수량 로드 (기본: 주식, 심화: 부동산)
            console.group(`[loadBalance] gameId=${gameId} variant=${gameVariant}`);
            await Promise.all(players.map(async p => {
                if (!p.gameId) { console.warn(`  no gameId: ${p.nickname}`); return; }
                if (gameVariant !== 'basic') {
                    const estates = await sbLoadEstateBalance(p.nickname, p.gameId);
                    if (estates) {
                        Object.assign(p.assets, estates);
                        const base = (p.manualCash || 0) + calcEstate(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
                        p.total = base * calcSuccessMultiplier(p.successFactors || {});
                    } else {
                        console.warn(`  no estate balance: ${p.nickname}`);
                    }
                } else {
                    const stocks = await sbLoadUserBalance(p.nickname, p.gameId);
                    if (stocks) {
                        Object.assign(p.assets, stocks);
                        p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
                    } else {
                        console.warn(`  no stock balance: ${p.nickname}`);
                    }
                }
            }));
            console.groupEnd();

            // 특성/성공요소 로드
            try {
                if (gameVariant !== 'basic') {
                    const sfData = await sbLoadSuccessFactorsByGameId(gameId);
                    if (sfData.success && Array.isArray(sfData.factors)) {
                        const sfMap = {};
                        sfData.factors.forEach(f => { sfMap[f.nickname] = f; });
                        players.forEach(p => {
                            const f = sfMap[p.nickname];
                            if (f) p.successFactors = {
                                financial_management: !!f.financial_management,
                                communication:        !!f.communication,
                                critical_thinking:    !!f.critical_thinking,
                                global_economy:       !!f.global_economy,
                                credit_trust:         !!f.credit_trust,
                                entrepreneurship:     !!f.entrepreneurship,
                            };
                        });
                    }
                } else {
                    const traitsData = await sbLoadTraitsByGameId(gameId);
                    if (traitsData.success && Array.isArray(traitsData.traits)) {
                        const traitsMap = {};
                        traitsData.traits.forEach(t => { traitsMap[t.nickname] = t; });
                        players.forEach(p => {
                            const t = traitsMap[p.nickname];
                            if (t) p.traits = { diligent: !!t.diligent, saving: !!t.saving, invest: !!t.invest, career: !!t.career, luck: !!t.luck, adventure: !!t.adventure };
                        });
                    }
                }
            } catch(e) { console.warn("[loadTraitsOrFactors] 실패:", e); }

            // 팀 이름 로드 (game_individual에는 team_id만 있고 team_name은 game_team에 있음)
            const teamIds = [...new Set(players.map(p => p.teamId).filter(Boolean))];
            if (teamIds.length > 0) {
                try {
                    const { data: teams } = await _sb.from('game_team')
                        .select('team_id, team_name').in('team_id', teamIds);
                    const teamNameMap = Object.fromEntries((teams || []).map(t => [t.team_id, t.team_name]));
                    players.forEach(p => {
                        if (p.teamId) p.team = teamNameMap[p.teamId] || '-';
                    });
                } catch(e) { console.warn('[loadPastGame] 팀 이름 로드 실패:', e); }
            }

            loadedDate = gameDate;
            currentMode = teamIds.length > 0 ? 'team' : 'individual';
            recalculateAllRankings();
            switchScreen('countingScreen');
            renderSidebar();
            selectCountingPlayer(0);
            alert(`✅ 참가자 ${players.length}명의 데이터를 불러왔습니다.`);
        } catch(error) {
            console.error("_loadPastGame 오류:", error);
            alert("❌ 불러오기 실패: " + error.message);
        }
    }
