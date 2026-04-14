    function initStockConfig() {
        const grid = document.getElementById('stockConfigInputs');
        grid.innerHTML = '';
        for(let k in stockInfo) {
            grid.innerHTML += `<div class="stock-input-item"><label>${stockInfo[k].name}</label><input type="number" id="conf_${k}" value="${stockInfo[k].price}"></div>`;
        }
    }
    function resetNameInputsUI() {
        const area = document.getElementById('nameInputArea');
        const btn = document.getElementById('toggleNameBtn');
        const startBtn = document.getElementById('startGameBtn');

        area.innerHTML = '';
        area.style.display = 'none';

        startBtn.style.display = 'none';
        btn.innerText = '명단 입력하기 ▼';

        nameInputsVisible = false;
    }

    function selectMode(m) {
        if (currentMode !== m) {
            resetNameInputsUI();
        }

        currentMode = m;

        document.getElementById('btnIndiv').className = m === 'individual' ? 'mode-btn selected' : 'mode-btn';
        document.getElementById('btnTeam').className  = m === 'team' ? 'mode-btn selected' : 'mode-btn';

        document.getElementById('individualConfig').style.display = m === 'individual' ? 'block' : 'none';
        document.getElementById('teamConfig').style.display       = m === 'team' ? 'block' : 'none';

        // 아래 버튼/영역 상태 강제 복구
        document.getElementById('toggleNameBtn').style.display = 'inline-flex';
        document.getElementById('toggleNameBtn').innerText = '명단 입력하기 ▼';
        document.getElementById('startGameBtn').style.display = 'none';
        document.getElementById('nameInputArea').style.display = 'none';
        document.getElementById('nameInputArea').innerHTML = '';

        nameInputsVisible = false;
    }
    function generateInputs() {
        const area = document.getElementById('nameInputArea');
        area.innerHTML = '';

        if (currentMode === 'individual') {
            const cnt = parseInt(document.getElementById('playerCount').value, 10) || 1;
            for (let i = 0; i < cnt; i++) {
                area.innerHTML += makeInp(`참가자 ${i + 1}`, `참가자 ${i + 1}`, '');
            }
        } else {
            const tCnt = Math.min(20, Math.max(2, parseInt(document.getElementById('teamCount').value, 10) || 2));
            const mCnt = Math.min(20, Math.max(1, parseInt(document.getElementById('memberPerTeam').value, 10) || 1));
            area.innerHTML += `
            <div style="display:flex; justify-content:center; gap:10px; margin-bottom:10px;">
                <button class="btn btn-primary btn-mini" onclick="addTeam()">➕ 팀 추가</button>
                <button class="btn btn-dark btn-mini" onclick="normalizeTeamNames()">🔤 팀명 A,B,C 정렬</button>
            </div>
            `;

            for (let t = 0; t < tCnt; t++) {
                const teamName = String.fromCharCode(65 + t) + "팀";
                const teamEl = addTeam(teamName, false);
                for (let m = 0; m < mCnt; m++) addMember(teamEl, false);
                renumberMembers(teamEl);
            }

            syncTeamCountInput();
        }

        document.getElementById('startGameBtn').style.display = 'block';
        afterGenerateInputsUI();
        applyNameLengthBindings(area);
    }

    function syncTeamUiToConfig() {
        if (currentMode !== 'team' || !nameInputsVisible) return;

        const area = document.getElementById('nameInputArea');
        if (!area || area.innerHTML.trim() === '') return;

        const desiredTeamCount = Math.min(20, Math.max(2, parseInt(document.getElementById('teamCount').value, 10) || 2));
        const desiredMemberCount = Math.min(20, Math.max(1, parseInt(document.getElementById('memberPerTeam').value, 10) || 1));
        let teamSections = Array.from(area.querySelectorAll('.team-section'));

        while (teamSections.length < desiredTeamCount) {
            const nextIndex = teamSections.length;
            const teamName = String.fromCharCode(65 + nextIndex) + "팀";
            const teamEl = addTeam(teamName, false);
            for (let i = 0; i < desiredMemberCount; i++) addMember(teamEl, false);
            renumberMembers(teamEl);
            teamSections = Array.from(area.querySelectorAll('.team-section'));
        }

        while (teamSections.length > desiredTeamCount) {
            teamSections[teamSections.length - 1].remove();
            teamSections = Array.from(area.querySelectorAll('.team-section'));
        }

        teamSections.forEach(teamEl => {
            let members = teamEl.querySelectorAll('.p-input-group');
            while (members.length < desiredMemberCount) {
                addMember(teamEl, false);
                members = teamEl.querySelectorAll('.p-input-group');
            }
            while (members.length > desiredMemberCount) {
                members[members.length - 1].remove();
                members = teamEl.querySelectorAll('.p-input-group');
            }
            renumberMembers(teamEl);
        });

        syncTeamCountInput();
        applyNameLengthBindings(area);
    }

    async function toggleNameInputs() {
        const area = document.getElementById('nameInputArea');
        const btn = document.getElementById('toggleNameBtn');
        const startBtn = document.getElementById('startGameBtn');

        if (!nameInputsVisible) {
            if (citizenListData.length === 0) {
                try { await fetchCitizenList(); } catch(e) {}
            }

            if (area.innerHTML.trim() === '') generateInputs();
            area.style.display = 'block';
            btn.innerText = '명단 접기 ▲';
            startBtn.style.display = 'block';
            nameInputsVisible = true;
        } else {
            area.style.display = 'none';
            btn.innerText = '명단 입력하기 ▼';
            startBtn.style.display = 'none';
            nameInputsVisible = false;
        }
    }
    function afterGenerateInputsUI() {
        document.getElementById('nameInputArea').style.display = 'block';
        document.getElementById('toggleNameBtn').innerText = '명단 접기 ▲';
        document.getElementById('startGameBtn').style.display = 'block';
        nameInputsVisible = true;
    }
    function buildCitizenOptions() {
        let opts = `<option value="">시민권자 선택</option>`;
        citizenListData.forEach((c, idx) => {
            const label = `${c.nickname || '-'} / ${c.real_name || '-'}`;
            opts += `<option value="${idx}">${label}</option>`;
        });
        return opts;
    }
    function makeInp(lbl, realName = '', nickname = '', team='') {
        return `
        <div class="p-input-group citizen-row" style="align-items:flex-start; flex-direction:column; gap:6px; padding:10px; border:1px solid #eee; border-radius:10px; background:#fafafa;">
            <div style="font-weight:bold; color:#555; font-size:14px;">${lbl}</div>

            <div style="display:flex; gap:8px; width:100%; flex-wrap:wrap;">
                <input type="text" class="realname-input" placeholder="실명" value="${realName}" data-team="${team}">
                <input type="text" class="nickname-input" placeholder="닉네임" value="${nickname}" data-team="${team}">
            </div>

            <div style="display:flex; gap:8px; width:100%; flex-wrap:wrap;">
                <select class="citizen-select" style="flex:1; min-width:180px;">
                    ${buildCitizenOptions()}
                </select>
                <button type="button" class="btn btn-primary btn-mini" onclick="applyCitizenToRow(this)">불러오기</button>
            </div>

            <div class="citizen-efti-view" style="font-size:12px; color:#666; font-weight:700;">
                EFTI: <span class="citizen-efti-text">-</span>
            </div>
        </div>`;
    }
    function applyCitizenToRow(btn) {
        const row = btn.closest('.citizen-row');
        if (!row) return;

        const sel = row.querySelector('.citizen-select');
        const idx = sel.value;
        if (idx === '') {
            alert("불러올 시민권자를 선택하세요.");
            return;
        }

        const citizen = citizenListData[Number(idx)];
        if (!citizen) return;

        const realNameInput = row.querySelector('.realname-input');
        const nicknameInput = row.querySelector('.nickname-input');

        realNameInput.value = sanitizeLimitedText(citizen.real_name || '');
        nicknameInput.value = sanitizeNickname(citizen.nickname || '');

        const nextEfti = citizen.default_EFTI || '-';
        row.querySelector('.citizen-efti-text').innerText = nextEfti;
        row.dataset.efti = nextEfti;
    }
    function startGame() {
        isSampleMode = false;
        document.getElementById('btnEditPrev').style.display = 'inline-flex';

        for(let k in stockInfo) {
            const v = document.getElementById(`conf_${k}`).value;
            if(v) stockInfo[k].price = parseInt(v);
        }
        players = [];
        if (currentMode === 'individual') {
            document.querySelectorAll('#nameInputArea .citizen-row').forEach((row, i) => {
            const realName = row.querySelector('.realname-input')?.value?.trim() || `참가자 ${i + 1}`;
            const nickname = row.querySelector('.nickname-input')?.value?.trim() || realName;
            const efti = row.dataset.efti || '-';

            players.push({
                id: i,
                nickname,
                realName,
                name: realName,
                efti: efti,
                team: '-',
                assets: initAssets(),
                total: 0,
                rankIndiv: 0,
                rankTeam: 0,
                teamTotal: 0,
                manualCash: 0,
                diligenceReward: 0,
                traits: initTraitsState()
            });
        });
        } else {
            let idx = 0;
            const teamIdMap = {};
            document.querySelectorAll('#nameInputArea .team-section').forEach(teamSec => {
                const teamName = (teamSec.querySelector('.team-name-input')?.value || '').trim() || '팀';
                if (!teamIdMap[teamName]) {
                    teamIdMap[teamName] = 'T' + Math.random().toString(36).substr(2, 8).toUpperCase();
                }
                const teamId = teamIdMap[teamName];

                teamSec.querySelectorAll('.citizen-row').forEach(row => {
                    const realName = row.querySelector('.realname-input')?.value?.trim() || `참가자${idx + 1}`;
                    const nickname = row.querySelector('.nickname-input')?.value?.trim() || realName;
                    const efti = row.dataset.efti || '-';

                    players.push({
                        id: idx++,
                        nickname,
                        realName,
                        name: realName,
                        efti: efti,
                        team: teamName,
                        teamId: teamId,
                        assets: initAssets(),
                        total: 0,
                        rankIndiv: 0,
                        rankTeam: 0,
                        teamTotal: 0,
                        manualCash: 0,
                        diligenceReward: 0,
                        traits: initTraitsState()
                    });
                });
            });
        }
        if(players.length===0) return alert("명단을 입력하세요.");
 
        switchScreen('countingScreen');
        renderSidebar();
        selectCountingPlayer(0);
    }
    function addTeam(teamName = null, focus = true) {
        const area = document.getElementById('nameInputArea');

        // teamName 없으면 "새 팀" 기본값
        const nextIdx = area.querySelectorAll('.team-section').length;
        const defaultName = teamName || (`${String.fromCharCode(65 + nextIdx)}팀`);

        const wrapper = document.createElement('div');
        wrapper.className = 'team-section';
        wrapper.innerHTML = `
        <div class="team-toolbar">
            <div class="team-name-wrap">
            <span>팀명</span>
            <input class="team-name-input" type="text" value="${defaultName}">
            </div>
            <div class="team-btns">
            <button class="btn btn-primary btn-mini" onclick="addMember(this.closest('.team-section'))">➕ 인원</button>
            <button class="btn btn-dark btn-mini" onclick="removeMember(this.closest('.team-section'))">➖ 인원</button>
            <button class="btn btn-danger btn-mini" onclick="removeTeam(this.closest('.team-section'))">🗑️ 팀 삭제</button>
            </div>
        </div>
        <div class="team-members"></div>
        `;

        area.appendChild(wrapper);
        if (focus) wrapper.querySelector('.team-name-input')?.focus();

        syncTeamCountInput();
        return wrapper;
    }

    function removeTeam(teamSection) {
        if (!teamSection) return;
        teamSection.remove();
        syncTeamCountInput();
    }

    function addMember(teamSection, focus = true) {
        if (!teamSection) return;
        const members = teamSection.querySelector('.team-members');
        const count = members.querySelectorAll('.citizen-row').length;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = makeInp(`참가자 ${count + 1}`, `참가자${count + 1}`, '');
        const row = wrapper.firstElementChild;

        members.appendChild(row);

        renumberMembers(teamSection);
        if (focus) row.querySelector('.realname-input')?.focus();
    }

    function removeMember(teamSection) {
        if (!teamSection) return;
        const members = teamSection.querySelector('.team-members');
        const rows = members.querySelectorAll('.citizen-row');
        if (rows.length <= 1) {
            alert("팀당 최소 1명은 있어야 합니다.");
            return;
        }
        rows[rows.length - 1].remove();
        renumberMembers(teamSection);
    }

    function renumberMembers(teamSection) {
        if (!teamSection) return;
        const rows = teamSection.querySelectorAll('.team-members .citizen-row');
        rows.forEach((row, i) => {
            const label = row.querySelector('div');
            if (label) label.innerText = `참가자${i + 1}`;
        });
    }
    function syncTeamCountInput() {
        // teamCount 입력값을 현재 팀 섹션 수로 동기화 (사용자 혼란 방지)
        const area = document.getElementById('nameInputArea');
        const teamCountEl = document.getElementById('teamCount');
        const tCnt = area.querySelectorAll('.team-section').length;
        if (teamCountEl) teamCountEl.value = Math.max(1, tCnt);
    }

    function normalizeTeamNames() {
        // 팀명을 A팀,B팀,C팀...로 강제 정렬 (선택 기능)
        const teams = document.querySelectorAll('#nameInputArea .team-section');
        teams.forEach((t, i) => {
            const inp = t.querySelector('.team-name-input');
            if (inp) inp.value = `${String.fromCharCode(65 + i)}팀`;
        });
    }

    function initCitizenForm() {
        const targets = [
            document.getElementById('citizenEFTI'),
            document.getElementById('citizenEFTIInline')
        ].filter(Boolean);

        targets.forEach(sel => {
            sel.innerHTML = '';
            EFTI_OPTIONS.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                if (v === '-') opt.selected = true;
                sel.appendChild(opt);
            });
        });
    }

    function toggleCitizenPanel() {
        const panel = document.getElementById('citizenPanel');
        const btn = document.getElementById('toggleCitizenPanelBtn');
        const isOpen = panel.style.display === 'block';

        panel.style.display = isOpen ? 'none' : 'block';
        btn.innerText = isOpen ? '👥 시민권자 관리 열기 ▼' : '👥 시민권자 관리 닫기 ▲';

        if (!isOpen && citizenListData.length === 0) {
            fetchCitizenList();
        }
    }

    function setCitizenFormErrorInline(msg) {
        const err = document.getElementById('citizenFormErrorInline');
        if (err) err.innerText = msg || '';
    }

    function setCitizenSubmitLoadingInline(isLoading) {
        const btn = document.getElementById('citizenSubmitBtnInline');
        const txt = document.getElementById('citizenSubmitTextInline');
        if (!btn || !txt) return;

        if (isLoading) {
            btn.disabled = true;
            txt.innerHTML = `<span class="spinner"></span> 저장 중...`;
        } else {
            btn.disabled = false;
            txt.innerText = '등록하기';
        }
    }

    function resetCitizenFormInline() {
        document.getElementById('citizenRealNameInline').value = '';
        document.getElementById('citizenNicknameInline').value = '';
        document.getElementById('citizenEFTIInline').value = '-';        setCitizenFormErrorInline('');
        setCitizenSubmitLoadingInline(false);
    }

    function openCitizenModal() {
        resetCitizenForm(false);
        document.getElementById('citizenModal').classList.add('show');
    }

    function closeCitizenModal() {
        document.getElementById('citizenModal').classList.remove('show');
    }

    function handleCitizenBackdrop(e) {
        if (e.target.id === 'citizenModal') {
            closeCitizenModal();
        }
    }

    function resetCitizenForm(clearError = true) {
        const realName = document.getElementById('citizenRealName');
        const nickname = document.getElementById('citizenNickname');
        const efti = document.getElementById('citizenEFTI');
        const err = document.getElementById('citizenFormError');

        if (realName) realName.value = '';
        if (nickname) nickname.value = '';
        if (efti) efti.value = '-';
        if (clearError && err) err.innerText = '';
        setCitizenSubmitLoading(false);
    }

    function setCitizenFormError(msg) {
        const err = document.getElementById('citizenFormError');
        if (err) err.innerText = msg || '';
    }

    function setCitizenSubmitLoading(isLoading) {
        const btn = document.getElementById('citizenSubmitBtn');
        const txt = document.getElementById('citizenSubmitText');

        if (!btn || !txt) return;

        if (isLoading) {
            btn.disabled = true;
            txt.innerHTML = `<span class="spinner"></span> 저장 중...`;
        } else {
            btn.disabled = false;
            txt.innerText = '등록하기';
        }
    }

    async function submitCitizenRegistration() {
        const realNameEl = document.getElementById('citizenRealName');
        const nicknameEl = document.getElementById('citizenNickname');
        const eftiEl = document.getElementById('citizenEFTI');

        const realName = sanitizeLimitedText(realNameEl.value);
        const nickname = sanitizeNickname(nicknameEl.value);

        realNameEl.value = realName;
        nicknameEl.value = nickname;
        const defaultEFTI = String(eftiEl?.value ?? '-').trim() || '-';
        nicknameEl.value = nickname;
        setCitizenFormError('');

        if (!realName) {
            setCitizenFormError("실명을 입력해주세요.");
            realNameEl.focus();
            return;
        }

        if (!nickname) {
            setCitizenFormError("닉네임을 입력해주세요.");
            nicknameEl.focus();
            return;
        }

        setCitizenSubmitLoading(true);

        try {
            const payload = {
                action: "registerCitizen",
                real_name: realName,
                nickname: nickname,
                default_EFTI: defaultEFTI
            };

            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                cache: "no-store",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            console.log("[submitCitizenRegistration] status =", res.status, res.statusText);
            console.log("[submitCitizenRegistration] raw response =", text);

            let json = null;
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error("서버 응답이 JSON 형식이 아닙니다: " + text.slice(0, 200));
            }

            if (!res.ok || !json.success) {
                if (json && json.code === 'DUPLICATE_NICKNAME') {
                    setCitizenFormError("이미 존재하는 닉네임입니다. 다른 닉네임을 사용해주세요.");
                    nicknameEl.focus();
                    return;
                }
                throw new Error(json?.message || "저장에 실패했습니다.");
            }

            const errEl = document.getElementById('citizenFormError');
            errEl.style.color = '#22c55e';
            errEl.innerText = `✅ 등록 완료! 다음 학생을 입력하세요.`;

            resetCitizenForm(false);
            await fetchCitizenList();
            refreshCitizenSelectOptions();

        } catch (err) {
            console.error("[submitCitizenRegistration] ERROR", err);
            setCitizenFormError(err?.message || "저장에 실패했습니다. 인터넷 연결을 확인하거나 관리자에게 문의하세요.");
        } finally {
            setCitizenSubmitLoading(false);
        }
    }
    async function submitCitizenRegistrationInline() {
        const realNameEl = document.getElementById('citizenRealNameInline');
        const nicknameEl = document.getElementById('citizenNicknameInline');
        const eftiEl = document.getElementById('citizenEFTIInline');

        const realName = sanitizeLimitedText(realNameEl.value);
        const nickname = sanitizeNickname(nicknameEl.value);

        realNameEl.value = realName;
        nicknameEl.value = nickname;
        const defaultEFTI = String(eftiEl?.value ?? '-').trim() || '-';
        nicknameEl.value = nickname;
        setCitizenFormErrorInline('');

        if (!realName) {
            setCitizenFormErrorInline("실명을 입력해주세요.");
            realNameEl.focus();
            return;
        }

        if (!nickname) {
            setCitizenFormErrorInline("닉네임을 입력해주세요.");
            nicknameEl.focus();
            return;
        }

        setCitizenSubmitLoadingInline(true);

        try {
            const payload = {
                action: "registerCitizen",
                real_name: realName,
                nickname: nickname,
                default_EFTI: defaultEFTI
            };

            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                cache: "no-store",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            let json = null;

            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error("서버 응답이 JSON 형식이 아닙니다: " + text.slice(0, 200));
            }

            if (!res.ok || !json.success) {
                if (json && json.code === 'DUPLICATE_NICKNAME') {
                    setCitizenFormErrorInline("이미 존재하는 닉네임입니다. 다른 닉네임을 사용해주세요.");
                    nicknameEl.focus();
                    return;
                }
                throw new Error(json?.message || "저장에 실패했습니다.");
            }

            alert("✅ 학생 시민권자 등록이 완료되었습니다.");
            resetCitizenFormInline();
            await fetchCitizenList();
            refreshCitizenSelectOptions();
        } catch (err) {
            console.error("[submitCitizenRegistrationInline] ERROR", err);
            setCitizenFormErrorInline(err?.message || "저장에 실패했습니다. 인터넷 연결을 확인하거나 관리자에게 문의하세요.");
        } finally {
            setCitizenSubmitLoadingInline(false);
        }
    }

    async function fetchCitizenList() {
        const loadingEl = document.getElementById('citizenTableLoading');
        const tbody = document.getElementById('citizenTableBody');

        if (loadingEl) loadingEl.style.display = 'block';
        tbody.innerHTML = `<tr><td colspan="5" style="padding:16px; text-align:center; color:#999;">불러오는 중...</td></tr>`;

        try {
            const url = `${SCRIPT_URL}?action=listCitizens&_ts=${Date.now()}`;
            const response = await fetch(url, { method: 'GET', cache: 'no-store' });
            const text = await response.text();

            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error("서버 응답이 JSON 형식이 아닙니다: " + text.slice(0, 200));
            }

            const rows = Array.isArray(json.users) ? json.users : [];
            citizenListData = rows;
            renderCitizenTable(rows);
            refreshCitizenSelectOptions();
            document.getElementById('btnEditCitizens').style.display = 'inline-flex';
        } catch (err) {
            console.error("[fetchCitizenList] ERROR", err);
            alert("데이터를 불러오는 데 실패했습니다.");
            tbody.innerHTML = `<tr><td colspan="5" style="padding:16px; text-align:center; color:#d32f2f;">불러오기 실패</td></tr>`;
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }
    function renderCitizenTable(rows) {
        const tbody = document.getElementById('citizenTableBody');
        const checkAll = document.getElementById('citizenCheckAll');
        if (checkAll) checkAll.checked = false;

        if (!rows || rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:16px; text-align:center; color:#999;">등록된 시민권자가 없습니다.</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(row => `
            <tr data-original-nickname="${row.nickname || ''}"
                data-original-realname="${row.real_name || ''}"
                data-original-efti="${row.default_EFTI || '-'}"
                data-original-status="${row.status || 'active'}">
                <td class="citizen-check-cell" style="padding:10px; border-bottom:1px solid #eee; text-align:center;">
                    <input type="checkbox" class="citizen-row-check" data-nickname="${row.nickname || ''}">
                </td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${row.nickname || '-'}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${row.real_name || '-'}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${row.default_EFTI || '-'}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${row.join_date || '-'}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${row.status || '-'}</td>
            </tr>
        `).join('');
    }
    function toggleAllCitizenChecks(masterCheckbox) {
        document.querySelectorAll('.citizen-row-check').forEach(cb => {
            cb.checked = masterCheckbox.checked;
        });
        updateDeleteButtonVisibility();
    }
    async function deleteSelectedCitizens() {
        const checked = Array.from(document.querySelectorAll('.citizen-row-check:checked'));
        if (checked.length === 0) return;

        const nicknames = checked.map(cb => cb.dataset.nickname).filter(Boolean);
        if (!confirm(`선택한 ${nicknames.length}명을 삭제하시겠습니까?`)) return;

        const btn = document.getElementById('btnDeleteCitizens');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '삭제 중...';

        const errors = [];
        for (const nickname of nicknames) {
            try {
                const res = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    cache: 'no-store',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'deleteCitizen', nickname })
                });
                const json = await res.json();
                if (!res.ok || !json.success) {
                    errors.push(`${nickname}: ${json?.message || '실패'}`);
                }
            } catch (e) {
                errors.push(`${nickname}: 네트워크 오류`);
            }
        }

        btn.disabled = false;
        btn.innerHTML = originalHtml;

        if (errors.length > 0) {
            alert(`일부 삭제 실패:\n${errors.join('\n')}`);
        } else {
            alert(`${nicknames.length}명이 삭제되었습니다.`);
        }

        await fetchCitizenList();
        refreshCitizenSelectOptions();
    }
    function refreshCitizenSelectOptions() {
        document.querySelectorAll('.citizen-select').forEach(sel => {
            const current = sel.value;
            sel.innerHTML = buildCitizenOptions();
            if (current && sel.querySelector(`option[value="${current}"]`)) {
                sel.value = current;
            }
        });
    }
    function filterCitizenTable() {
        const keyword = (document.getElementById('citizenSearchInput').value || '').trim().toLowerCase();

        if (!keyword) {
            renderCitizenTable(citizenListData);
            return;
        }

        const filtered = citizenListData.filter(row => {
            const nickname = (row.nickname || '').toLowerCase();
            const realName = (row.real_name || '').toLowerCase();
            return nickname.includes(keyword) || realName.includes(keyword);
        });

        renderCitizenTable(filtered);
    }

    function enterCitizenEditMode() {
        document.getElementById('citizenCheckColHeader').style.display = 'none';
        document.getElementById('btnEditCitizens').style.display = 'none';
        document.getElementById('btnSaveCitizens').style.display = 'inline-flex';
        document.getElementById('btnDeleteCitizens').style.display = 'none';
        document.getElementById('btnFetchCitizens').disabled = true;
        const searchInput = document.getElementById('citizenSearchInput');
        if (searchInput) { searchInput.disabled = true; searchInput.style.opacity = '0.4'; }

        const tbody = document.getElementById('citizenTableBody');
        if (!citizenListData || citizenListData.length === 0) return;

        const inputStyle = 'width:90px; padding:4px 6px; border:1px solid #d6dbe3; border-radius:6px; text-align:center; font-size:13px; box-sizing:border-box;';
        const selectStyle = 'padding:4px 6px; border:1px solid #d6dbe3; border-radius:6px; font-size:13px; background:#fff;';

        tbody.innerHTML = citizenListData.map(row => {
            const nickname  = row.nickname     || '';
            const realName  = row.real_name    || '';
            const efti      = row.default_EFTI || '-';
            const joinDate  = row.join_date    || '-';
            const status    = row.status       || 'active';

            const eftiOptions = EFTI_OPTIONS.map(v =>
                `<option value="${v}"${v === efti ? ' selected' : ''}>${v}</option>`
            ).join('');

            const statusOptions = ['active', 'inactive'].map(v =>
                `<option value="${v}"${v === status ? ' selected' : ''}>${v}</option>`
            ).join('');

            return `
                <tr data-original-nickname="${nickname}"
                    data-original-realname="${realName}"
                    data-original-efti="${efti}"
                    data-original-status="${status}">
                    <td class="citizen-check-cell" style="display:none; padding:10px; border-bottom:1px solid #eee;"></td>
                    <td style="padding:6px 8px; border-bottom:1px solid #eee; text-align:center;">
                        <input type="text" class="citizen-edit-nickname" value="${nickname}" style="${inputStyle}">
                    </td>
                    <td style="padding:6px 8px; border-bottom:1px solid #eee; text-align:center;">
                        <input type="text" class="citizen-edit-realname" value="${realName}" style="${inputStyle}">
                    </td>
                    <td style="padding:6px 8px; border-bottom:1px solid #eee; text-align:center;">
                        <select class="citizen-edit-efti" style="${selectStyle}">${eftiOptions}</select>
                    </td>
                    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center; color:#888;">${joinDate}</td>
                    <td style="padding:6px 8px; border-bottom:1px solid #eee; text-align:center;">
                        <select class="citizen-edit-status" style="${selectStyle}">${statusOptions}</select>
                    </td>
                </tr>`;
        }).join('');
    }

    function exitCitizenEditMode() {
        document.getElementById('citizenCheckColHeader').style.display = '';
        document.getElementById('btnEditCitizens').style.display = 'inline-flex';
        document.getElementById('btnSaveCitizens').style.display = 'none';
        document.getElementById('btnDeleteCitizens').style.display = '';
        document.getElementById('btnFetchCitizens').disabled = false;
        const searchInput = document.getElementById('citizenSearchInput');
        if (searchInput) { searchInput.disabled = false; searchInput.style.opacity = ''; }
        renderCitizenTable(citizenListData);
    }

    async function saveCitizenEdits() {
        const rows = document.querySelectorAll('#citizenTableBody tr');
        const updates = [];

        rows.forEach(tr => {
            const nicknameInput  = tr.querySelector('.citizen-edit-nickname');
            const realnameInput  = tr.querySelector('.citizen-edit-realname');
            const eftiSelect     = tr.querySelector('.citizen-edit-efti');
            const statusSelect   = tr.querySelector('.citizen-edit-status');
            if (!nicknameInput) return;

            const originalNickname = tr.dataset.originalNickname || '';
            const originalRealname = tr.dataset.originalRealname || '';
            const originalEfti     = tr.dataset.originalEfti     || '-';
            const originalStatus   = tr.dataset.originalStatus   || 'active';

            const newNickname = nicknameInput.value.trim();
            const newRealname = realnameInput.value.trim();
            const newEfti     = eftiSelect.value;
            const newStatus   = statusSelect.value;

            if (newNickname !== originalNickname || newRealname !== originalRealname ||
                newEfti !== originalEfti         || newStatus  !== originalStatus) {
                updates.push({
                    original_nickname: originalNickname,
                    nickname:          newNickname,
                    real_name:         newRealname,
                    default_EFTI:      newEfti,
                    status:            newStatus
                });
            }
        });

        if (updates.length === 0) {
            exitCitizenEditMode();
            return;
        }

        const btn = document.getElementById('btnSaveCitizens');
        btn.disabled = true;
        btn.innerHTML = '저장 중...';

        const errors = [];
        for (const update of updates) {
            try {
                const res = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    cache: 'no-store',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'updateCitizen', ...update })
                });
                const json = await res.json();
                if (!res.ok || !json.success) {
                    errors.push(`${update.original_nickname}: ${json?.message || '실패'}`);
                }
            } catch (e) {
                errors.push(`${update.original_nickname}: 네트워크 오류`);
            }
        }

        btn.disabled = false;
        btn.innerHTML = '💾 저장하기';

        if (errors.length > 0) {
            alert(`일부 저장 실패:\n${errors.join('\n')}`);
        } else {
            alert(`${updates.length}건의 수정사항이 저장되었습니다.`);
        }

        await fetchCitizenList();
        refreshCitizenSelectOptions();
        exitCitizenEditMode();
    }

    function loadLogo(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) { customLogoData = e.target.result; };
            reader.readAsDataURL(file);
        }
    }

    function clampTeamConfigInput(el, min, max) {
        let v = String(el.value || '').replace(/[^\d]/g, '');

        if (v === '') {
            el.value = '';
            return;
        }

        v = parseInt(v, 10);

        if (isNaN(v)) {
            el.value = min;
            return;
        }

        if (v > max) v = max;
        if (v < min) v = min;

        el.value = v;

        if (currentMode === 'team' && nameInputsVisible) {
            syncTeamUiToConfig();
        }
    }
    // =======================
    // [초기화 - 이벤트 바인딩]
    // =======================
    window.addEventListener('DOMContentLoaded', () => {

        // 팀 개수 바뀔 때
        document.getElementById('teamCount')?.addEventListener('input', syncTeamUiToConfig);

        // 팀당 인원 바뀔 때
        document.getElementById('memberPerTeam')?.addEventListener('input', syncTeamUiToConfig);

        // 개인전 인원 바뀔 때
        document.getElementById('playerCount')?.addEventListener('input', () => {
            if (currentMode === 'individual' && nameInputsVisible) {
                generateInputs();
            }
        });

    });
