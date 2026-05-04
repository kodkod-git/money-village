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

        fetchFameData();
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
                    diligence_reward: Number(d.diligence_reward ?? 0)
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

            if (fameIndivData.length === 0 && fameTeamData.length === 0) {
                loadFameSamples(false);
            } else {
                renderFame();
                document.getElementById('todayDate').innerText = formatFolderDate();
            }
        } catch (e) {
            console.error("DB 로드 실패:", e);
            loadFameSamples(false);
        } finally {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }

    function loadFameSamples(alertMsg = true) {
        const S_INDIV = [
            { name: "이영재", total: 6000000, cash: 2300000, stock: 3200000, diligence_reward: 500000, date: "2025.12.25" },
            { name: "정주식", total: 5500000, cash: 400000, stock: 4800000, diligence_reward: 300000, date: "2026.01.10" },
            { name: "강현금", total: 5200000, cash: 4700000, stock: 200000, diligence_reward: 300000, date: "2025.12.30" },
            { name: "김부자", total: 4850000, cash: 1550000, stock: 2900000, diligence_reward: 400000, date: "2026.01.05" },
            { name: "박스마트", total: 4120000, cash: 920000, stock: 2800000, diligence_reward: 400000, date: "2025.12.30" },
            { name: "최성실", total: 3900000, cash: 700000, stock: 2800000, diligence_reward: 400000, date: "2025.12.25" },
            { name: "조전략", total: 3050000, cash: 850000, stock: 1800000, diligence_reward: 400000, date: "2026.01.05" },
            { name: "윤행운", total: 2980000, cash: 780000, stock: 1800000, diligence_reward: 400000, date: "2025.12.25" },
            { name: "장투자", total: 2800000, cash: 500000, stock: 2000000, diligence_reward: 300000, date: "2026.01.10" },
            { name: "임저축", total: 2750000, cash: 1800000, stock: 650000, diligence_reward: 300000, date: "2025.12.30" }
        ];
        const S_TEAM = [
            { name: "어벤져스팀", total: 12500000, members: "김철수, 박민지, 최동훈, 이서연", date: "2026.01.05" },
            { name: "황금거위팀", total: 10200000, members: "이영희, 정우성, 강동원, 한지민", date: "2025.12.30" },
            { name: "미래에셋팀", total: 9800000, members: "장투자, 정주식, 박수익, 김성공", date: "2026.01.10" },
            { name: "주식왕팀", total: 8500000, members: "최성실, 윤행운, 김노력, 이도전", date: "2025.12.25" },
            { name: "티끌모아팀", total: 7200000, members: "임저축, 강현금, 송성실, 나부자", date: "2025.12.30" }
        ];
        fameIndivData = S_INDIV;
        fameTeamData = S_TEAM;
        renderFame();
        document.getElementById('todayDate').innerText = "Sample Data";
        if(alertMsg) alert("샘플 데이터를 불러왔습니다.");
    }

    function renderFame() {
        fameIndivData.sort((a,b) => b.total - a.total);
        fameTeamData.sort((a,b) => b.total - a.total);

        renderRankingTable(fameIndivData.slice(0, 10), 'indivTableBody', false);
        renderRankingTable(fameTeamData.slice(0, 5), 'teamTableBody', true);
        setSpecialAwards(fameIndivData);
    }

    function renderRankingTable(data, tableId, isTeam) {
        const tbody = document.getElementById(tableId);
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">데이터가 없습니다.</td></tr>`;
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
                <td class="asset-col ${rank === 1 ? 'top' : ''}">${Number(item.total).toLocaleString()}</td>`;

            if (isTeam) {
                row += `<td class="member-col">${item.members || '-'}</td>`;
            } else {
                row += `<td class="sub-asset-col">${item.cash ? Number(item.cash).toLocaleString() : 0}</td>
                        <td class="sub-asset-col stock">${item.stock ? Number(item.stock).toLocaleString() : 0}</td>
                        <td class="sub-asset-col">${item.diligence_reward ? Number(item.diligence_reward).toLocaleString() : 0}</td>`;
            }

            row += `<td class="date-col">${item.date || '-'}</td></tr>`;
            tbody.innerHTML += row;
        });
    }

    function setSpecialAwards(data) {
        if(data.length === 0) return;
        let cashKing = [...data].sort((a,b) => b.cash - a.cash)[0];
        let stockKing = [...data].sort((a,b) => b.stock - a.stock)[0];

        if(cashKing) {
            document.getElementById('awardCashName').innerText = cashKing.nickname || cashKing.name || '-';
            document.getElementById('awardCashVal').innerText = cashKing.cash.toLocaleString();
        }
        if(stockKing) {
            document.getElementById('awardStockName').innerText = stockKing.nickname || stockKing.name || '-';
            document.getElementById('awardStockVal').innerText = stockKing.stock.toLocaleString();
        }
    }
