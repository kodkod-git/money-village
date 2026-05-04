    // [1] 데이터 및 설정
    let currentMode = 'individual';
    let players = [];
    let viewingPlayerIndex = 0;
    let activeCountingIndex = 0;
    let customLogoData = null;
    let loadedDate = null;
    let fameIndivData = [];
    let fameTeamData = [];
    let isSampleMode = false;
    let nameInputsVisible = false;
    let citizenListData = [];
    let isSavingDrive = false;


    const stockInfo = {
        "SASUNG": { name: "SASUNG", price: 1500, color: "#1428a0" },
        "LGI":    { name: "LGI",   price: 600,  color: "#a50034" },
        "SKEI":   { name: "SKEI",   price: 1600, color: "#ff6600" },
        "CACAO":  { name: "CACAO", price: 4000, color: "#fee500", textColor: "#3c1e1e" },
        "HYUNDE":{ name: "HYUNDE", price: 6000, color: "#002c5f" },
        "NABER":  { name: "NABER", price: 7000, color: "#03c75a" }
    };
    const TRAITS = [
        { key:"diligent",  emo:"👷", base:"노동",  king:"성실왕",  desc:"성실한 미션 수행과 보상 그대로 가기" },
        { key:"saving",    emo:"🏦", base:"은행",  king:"저축왕",  desc:"저축을 통한 이자 수익" },
        { key:"invest",    emo:"📈", base:"주식",  king:"투자왕",  desc:"시장 분석을 통한 투자" },
        { key:"career",    emo:"🎓", base:"직업",  king:"커리어왕", desc:"전문성을 높여 수익 증가" },
        { key:"luck",      emo:"🍀", base:"행운",  king:"행운왕",  desc:"우연한 기회와 행운 포착" },
        { key:"adventure", emo:"⚔️", base:"퀘스트", king:"모험왕", desc:"도전과 성취 보상" }
    ];
    const EFTI_OPTIONS = [
        "-",
        "FAEN", "FAEC", "FASN", "FASC",
        "FTEN", "FTEC", "FTSN", "FTSC",
        "PAEN", "PAEC", "PASN", "PASC",
        "PTEN", "PTEC", "PTSN", "PTSC"
    ];

    function initTraitsState(){
        const obj = {};
        TRAITS.forEach(t => obj[t.key] = false);
        return obj;
    }
    window.onload = function() {
        initStockConfig();
        initCitizenForm();
        applyNameLengthBindings(document);
    };

    function switchScreen(id){
        document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active-screen'));
        document.getElementById(id).classList.add('active-screen');

        document.querySelectorAll('.report-paper').forEach(p => p.classList.remove('active-print'));
        if(id === 'reportScreen') document.getElementById('pdfAreaReport').classList.add('active-print');
        if(id === 'fameScreen') document.getElementById('pdfAreaFame').classList.add('active-print');
    }

    function initAssets(){ return { "100":0,"500":0,"1000":0,"5000":0,"10000":0,"50000":0,"SASUNG":0,"LGI":0,"SKEI":0,"CACAO":0,"HYUNDE":0,"NABER":0 }; }

    function applyInputsToPlayer(p, prefix) {
        if (!p) return;

        const cashEl = document.getElementById(prefix === 'cnt' ? 'cntCashInput' : 'rptCashInput');
        const diligenceEl = document.getElementById(prefix === 'cnt' ? 'cntDiligenceInput' : 'rptDiligenceInput');

        p.manualCash = parseInt(cashEl?.value, 10) || 0;
        p.diligenceReward = parseInt(diligenceEl?.value, 10) || 0;

        const stockPrefix = prefix === 'cnt' ? 'ui' : 'rpt';
        for (let k in stockInfo) {
            const input = document.getElementById(`${stockPrefix}_cnt_input_${k}`);
            if (input) {
                p.assets[k] = parseInt(input.value, 10) || 0;
            }
        }

        p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0);
    }

    function recalculateAllRankings() {
        players.forEach(p => {
            p.total = (p.manualCash || 0) + calcStock(p.assets) + (p.diligenceReward || 0);
        });

        let sorted = [...players].sort((a, b) => b.total - a.total);
        sorted.forEach((p, i) => p.rankIndiv = i + 1);

        if (currentMode === 'team') {
            let teamMap = {};
            players.forEach(p => {
                if (!teamMap[p.team]) teamMap[p.team] = 0;
                teamMap[p.team] += p.total;
            });

            let sortedTeams = Object.keys(teamMap).sort((a, b) => teamMap[b] - teamMap[a]);
            players.forEach(p => {
                p.rankTeam = sortedTeams.indexOf(p.team) + 1;
                p.teamTotal = teamMap[p.team];
            });
        }
    }

    function formatFolderDate(d = new Date()) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function waitForRenderFrame() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    }

    const NAME_MAX_LEN = 5;

    function sanitizeLimitedText(value, maxLen = NAME_MAX_LEN) {
        return String(value ?? '')
            .replace(/\s+/g, ' ')   // 연속 공백 정리
            .trim()
            .slice(0, maxLen);
    }

    // 닉네임: 한글/영문/숫자/한자/공백 허용
    function sanitizeNickname(value, maxLen = NAME_MAX_LEN) {
        return String(value ?? '')
            .replace(/[^\p{L}\p{N}\s]/gu, '')   // 0 포함 숫자 허용
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLen);
    }

    function bindMaxLenInput(input, sanitizer = sanitizeLimitedText) {
        if (!input) return;

        input.maxLength = NAME_MAX_LEN;

        const apply = () => {
            const next = sanitizer(input.value);
            if (input.value !== next) input.value = next;
        };

        input.addEventListener('input', apply);
        input.addEventListener('change', apply);
        apply(); // 초기값도 즉시 정제
    }

    function applyNameLengthBindings(root = document) {
        root.querySelectorAll('.team-name-input').forEach(el => bindMaxLenInput(el, sanitizeLimitedText));
        root.querySelectorAll('.nickname-input').forEach(el => bindMaxLenInput(el, sanitizeNickname));
        root.querySelectorAll('.realname-input').forEach(el => bindMaxLenInput(el, sanitizeLimitedText));

        bindMaxLenInput(document.getElementById('rptTeamInput'), sanitizeLimitedText);
        bindMaxLenInput(document.getElementById('rptNicknameInput'), sanitizeNickname);
        bindMaxLenInput(document.getElementById('rptRealNameInput'), sanitizeLimitedText);

        bindMaxLenInput(document.getElementById('citizenNicknameInline'), sanitizeNickname);
        bindMaxLenInput(document.getElementById('citizenRealNameInline'), sanitizeLimitedText);

        bindMaxLenInput(document.getElementById('citizenNickname'), sanitizeNickname);
        bindMaxLenInput(document.getElementById('citizenRealName'), sanitizeLimitedText);
    }

    function confirmResetSession() {
        const ok = confirm("현재 세션이 초기화됩니다.\n정말 처음으로 돌아가시겠습니까?");
        if (!ok) return;
        location.reload();
        loadedDate = null;
    }

    function calcCashFromBills(a){ return a["100"]*100+a["500"]*500+a["1000"]*1000+a["5000"]*5000+a["10000"]*10000+a["50000"]*50000; }
    function calcStock(a){ let s=0; for(let k in stockInfo) s+=a[k]*stockInfo[k].price; return s; }



    function runSample(mode) {
        isSampleMode = true;
        // [수정] 샘플 모드 시 수정 버튼 숨기기
        document.getElementById('btnEditPrev').style.display = 'none';

        currentMode = mode;
        for(let k in stockInfo) {
            const v = document.getElementById(`conf_${k}`).value;
            if(v) stockInfo[k].price = parseInt(v);
        }
        players = [];
        if(mode==='individual') for(let i=1;i<=5;i++) players.push(randP(`참가자 ${i}`, '-'));
        else ['A팀','B팀'].forEach(t=>{ for(let i=1;i<=3;i++) players.push(randP(`참가자${i}`, t)); });
        finishGame();
    }
    function randP(n,t) {
        let p = {
            id: Math.random(),
            nickname: n,
            realName: n,
            name: n,
            efti: '',
            team: t,
            assets: initAssets(),
            total: 0,
            rankIndiv: 0,
            rankTeam: 0,
            teamTotal: 0,
            manualCash: 0,
            diligenceReward: 0,
            traits: initTraitsState()
        };

        p.manualCash = (Math.floor(Math.random() * 20) + 1) * 10000;
        p.diligenceReward = Math.floor(Math.random() * 11) * 10000; // 0 ~ 100,000
        for (let k in p.assets) p.assets[k] = Math.floor(Math.random() * 5) + 1;

        return p;
    }

    async function loadUserBalance(nickname, gameId) {
        try {
            return await sbLoadUserBalance(nickname, gameId);
        } catch (e) {
            console.error(`[loadUserBalance] ${nickname} 오류:`, e);
            return null;
        }
    }

    async function saveUserBalance(nickname, gameId, assets) {
        try {
            await sbSaveUserBalance(nickname, gameId, assets);
        } catch (e) {
            console.error('[saveUserBalance] 오류:', e);
        }
    }

    async function saveStockValue(stockValues) {
        try {
            return await sbSaveStockValue(stockValues);
        } catch (e) {
            console.error('[saveStockValue] 오류:', e);
            return null;
        }
    }
