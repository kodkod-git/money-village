    function renderPlayStyleReport(p){
        // 1) 배지 영역
        const badgeWrap = document.getElementById('rptTraitBadges');
        if(badgeWrap){
            badgeWrap.innerHTML = '';
            if(!p.traits) p.traits = initTraitsState();

            const onList = TRAITS.filter(t => p.traits[t.key]);
            if(onList.length === 0){
                badgeWrap.innerHTML = `<span class="rpt-badge">선택 없음</span>`;
            } else {
                onList.forEach(t => {
                    badgeWrap.innerHTML += `<span class="rpt-badge on">${t.emo} ${t.king}</span>`;
                });
            }
        }

        // 2) 우측 하단(기존 경제활동 가이드 자리) 출력용 그리드
        const grid = document.getElementById('rptPlayStyleGrid');
        if(!grid) return;
        grid.innerHTML = '';

        TRAITS.forEach(t => {
            const isOn = !!(p.traits && p.traits[t.key]);
            const title = isOn ? `${t.base} → ${t.king}` : t.base;

            grid.innerHTML += `
                <div class="booth-item ${isOn ? 'selected' : ''}">
                    <div class="booth-icon">${t.emo}</div>
                    <div class="booth-text">
                        <h4>${title}</h4>
                        <p>${t.desc}</p>
                    </div>
                </div>
            `;
        });
    }
    function finishGame() {
        if(!confirm("결과를 발표하시겠습니까?")) return;
        recalculateAllRankings();
        switchScreen('reportScreen');
        initStockGrid('rptStockGrid', false, false);
        viewingPlayerIndex = 0;
        showReport(0);
    }
    function showReport(idx) {
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
        const reportArea = document.getElementById('pdfAreaReport');

        if (currentMode === 'team') {
            document.getElementById('rptTeamWrapper').style.display = 'inline-flex';
            document.getElementById('rptTeamInput').value = p.team;
            reportArea.classList.add('team-mode');
        } else {
            document.getElementById('rptTeamWrapper').style.display = 'none';
            reportArea.classList.remove('team-mode');
        }
        document.getElementById('rptCashInput').value = p.manualCash;
        const rptDiligenceInput = document.getElementById('rptDiligenceInput');
        if (rptDiligenceInput) {
            rptDiligenceInput.value = p.diligenceReward || 0;
        }
        for(let k in stockInfo) {
            document.getElementById(`rpt_cnt_input_${k}`).value = p.assets[k];
            document.getElementById(`rpt_val_${k}`).innerText = (p.assets[k] * stockInfo[k].price).toLocaleString() + "원";
        }
        document.getElementById('rptEftiInput').value = p.efti || '-';
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
        const cash = Number(p.manualCash || 0);
        const stock = Number(calcStock(p.assets) || 0);
        const diligence = Number(p.diligenceReward || 0);
        const total = cash + stock + diligence;

        p.total = total;

        document.getElementById('rptTotalAsset').innerText = total.toLocaleString() + " 원";
        document.getElementById('rptStock').innerText = stock.toLocaleString();

        const rptDiligenceInput = document.getElementById('rptDiligenceInput');
        if (rptDiligenceInput) rptDiligenceInput.value = diligence;

        for (let k in stockInfo) {
            document.getElementById(`rpt_val_${k}`).innerText =
                (p.assets[k] * stockInfo[k].price).toLocaleString() + "원";
        }

        const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0;
        document.getElementById('rptCashPct').innerText = `${cashPct}%`;

        const cashCircle = document.getElementById('rptArcCash');
        const stockCircle = document.getElementById('rptArcStock');
        const diligenceCircle = document.getElementById('rptArcDiligence');

        if (total <= 0) {
            clearDonutSegment(cashCircle);
            clearDonutSegment(stockCircle);
            clearDonutSegment(diligenceCircle);
            return;
        }

        const cashPercent = (cash / total) * 100;
        const stockPercent = (stock / total) * 100;
        const diligencePercent = (diligence / total) * 100;

        setDonutSegment(cashCircle, cashPercent, 0);
        setDonutSegment(stockCircle, stockPercent, cashPercent);
        setDonutSegment(diligenceCircle, diligencePercent, cashPercent + stockPercent);
    }
    function prevPlayer() { if(viewingPlayerIndex>0) { viewingPlayerIndex--; showReport(viewingPlayerIndex); } }
    function nextPlayer() { if(viewingPlayerIndex<players.length-1) { viewingPlayerIndex++; showReport(viewingPlayerIndex); } }

    // ✅ [수정] downloadPDF 함수 (문법/옵션 구조 정상화)
    async function downloadPDF(type) {
        const areaId = type === 'report' ? 'pdfAreaReport' : 'pdfAreaFame';
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
            filename: `머니빌리지_${type}.pdf`,
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

        const worker = html2pdf().set(opt).from(target);
        const dataUriString = await worker.outputPdf('datauristring');

        // 쉼표 뒤만 취해서 순수 base64만 남김
        return String(dataUriString)
            .split(',')
            .pop()
            .replace(/\s/g, '');
    }

    async function uploadPdfToDrive() {
        const btn = document.getElementById('btnUploadPdf');

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
            const rawDateText = (document.getElementById('rptDateInput')?.value || '').trim();
            const gameDate = rawDateText || formatFolderDate(new Date());

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

                const json = await sbUploadPDF(payload);
                if (!json.success) {
                    throw new Error(`업로드 실패 (${i + 1}/${players.length})\n${json?.message || ''}`);
                }
            }

            alert(`✅ 현재 세션 참가자 ${players.length}명의 PDF를 모두 드라이브에 저장했습니다.`);
        } catch (err) {
            console.error("[uploadPdfToDrive] ERROR", err);
            alert("❌ PDF 일괄 저장 실패:\n" + (err?.message || String(err)));
        } finally {
            viewingPlayerIndex = originalIndex;
            if (players[originalIndex]) showReport(originalIndex);

            isSavingDrive = false;
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
    async function uploadFamePdfToDrive() {
        const btn = document.getElementById('btnUploadFamePdf');
        if (!btn) return;

        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '📄 PDF 저장 중...';

        try {
            await waitForRenderFrame();

            const rawDateText = (document.getElementById('rptDateInput')?.value || '').trim();
            const gameDate = rawDateText || formatFolderDate(new Date());
            const fileName = `${gameDate.replace(/-/g, '')}_HallOfFame.pdf`;
            const pdfBase64 = await getPdfBase64FromElement('pdfAreaFame', fileName);


            const payload = {
                action: "uploadPDF",
                pdfBase64,
                fileName,
                category: "hall_of_fame",
                gameDate,
                nickname: "hall_of_fame",
                real_name: ""
            };

            const json = await sbUploadPDF(payload);
            if (!json.success) {
                throw new Error(json?.message || "명예의 전당 PDF 저장에 실패했습니다.");
            }

            alert(`✅ 명예의 전당 PDF가 저장됐습니다.\n경로: ${json.path}`);
        } catch (err) {
            console.error("[uploadFamePdfToDrive] ERROR", err);
            alert("❌ 명예의 전당 PDF 저장 실패:\n" + (err?.message || String(err)));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    function printReport() { window.print(); }
    function printFame() { window.print(); }


    // 중복제거 안됨
    async function saveTraits(gameId, players) {
        return await sbSaveTraits(gameId, players);
    }

    async function saveToDrive() {
        if (isSavingDrive) return;

        const btn = document.getElementById('btnSaveDrive');
        const originalHtml = btn.innerHTML;

        try {
            if (isSampleMode) {
                alert("⚠️ 견본(샘플) 데이터는 드라이브에 저장할 수 없습니다.\n실제 게임을 진행한 후 저장해주세요.");
                console.warn("[saveToDrive] blocked: sample mode");
                return;
            }

            const ok = confirm("현재 게임 결과를 [명예의 전당] 데이터베이스에 저장하시겠습니까?");
            console.log("[saveToDrive] confirm =", ok);
            if (!ok) return;

            isSavingDrive = true;
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner"></span> 저장 중...`;

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

            await Promise.all(players.map(p => saveUserBalance(p.nickname, gameId, p.assets)));
            await saveTraits(gameId, players);

            const exportData = {
                action: "saveGameResult",
                mode: currentMode,
                date: dateStr,
                individuals: players.map(p => ({
                    game_id: p.gameId || null,
                    nickname: p.nickname || '',
                    real_name: p.real_name || p.name || '',
                    efti_type: p.efti || '',
                    total: p.total,
                    manualCash: p.manualCash,
                    diligence_reward: p.diligenceReward || 0,
                    stockVal: calcStock(p.assets),
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
        }   finally {
            isSavingDrive = false;
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    function buildReportPdfFileName(p, index) {
        const date = loadedDate ? loadedDate.trim() : formatFolderDate(new Date());
        const teamPrefix = (currentMode === 'team' && p.team && p.team !== '-') ? `[${p.team}]_` : '';
        const displayName = (p.nickname || p.realName || p.name || `참가자${index + 1}`).trim();
        const dateCompact = date.replace(/-/g, '');
        return `${dateCompact}_${teamPrefix}${displayName}_AssetReport.pdf`;
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

    async function onPastGameDateChange() {
        const date = document.getElementById('pastGameDateSelect').value;
        const grid = document.getElementById('pastGameCardsGrid');
        const loading = document.getElementById('pastGameLoading');

        grid.innerHTML = '';
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
                const card = document.createElement('div');
                card.className = 'past-game-card';
                card.innerHTML = `
                    <div class="past-game-card-title">${sectionLabel}</div>
                    <div class="past-game-card-meta">
                        <span>${names || '참가자 정보 없음'}</span>
                        <span>참여인원: ${g.player_count}명</span>
                        <span class="${typeTag}">${typeLabel}</span>
                    </div>`;
                card.onclick = () => _loadPastGame(g.game_id, g.date);
                grid.appendChild(card);
            });
        } catch(e) {
            loading.style.display = 'none';
            grid.innerHTML = '<p style="color:#d32f2f; font-size:13px; text-align:center;">불러오기 실패: ' + e.message + '</p>';
        }
    }

    async function _loadPastGame(gameId, gameDate) {
        closePastGameModal();
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

            // 주식 보유 수량 로드
            console.group(`[loadUserBalance] gameId=${gameId}`);
            await Promise.all(players.map(async p => {
                if (!p.gameId) { console.warn(`  ⚠️ ${p.nickname}: gameId 없음`); return; }
                const stocks = await sbLoadUserBalance(p.nickname, p.gameId);
                if (stocks) {
                    Object.assign(p.assets, stocks);
                    p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0);
                } else {
                    console.warn(`  ❌ ${p.nickname}: 잔고 없음`);
                }
            }));
            console.groupEnd();

            // Traits 로드
            try {
                const traitsData = await sbLoadTraitsByGameId(gameId);
                if (traitsData.success && Array.isArray(traitsData.traits)) {
                    const traitsMap = {};
                    traitsData.traits.forEach(t => { traitsMap[t.nickname] = t; });
                    players.forEach(p => {
                        const t = traitsMap[p.nickname];
                        if (t) p.traits = { diligent: !!t.diligent, saving: !!t.saving, invest: !!t.invest, career: !!t.career, luck: !!t.luck, adventure: !!t.adventure };
                    });
                }
            } catch(e) { console.warn("[loadTraits] 실패:", e); }

            loadedDate = gameDate;
            currentMode = (players[0] && players[0].team !== '-') ? 'team' : 'individual';
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
