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
    let currentGameVariant = 'basic'; // 'basic' | 'advanced' | 'rich_vessel'


    const stockInfo = {
        "SASUNG": { name: "SASUNG", price: 1500, color: "#1428a0" },
        "LGI":    { name: "LGI",   price: 600,  color: "#a50034" },
        "SKEI":   { name: "SKEI",   price: 1600, color: "#ff6600" },
        "CACAO":  { name: "CACAO", price: 4000, color: "#fee500", textColor: "#3c1e1e" },
        "HYUNDE":{ name: "HYUNDE", price: 6000, color: "#002c5f" },
        "NABER":  { name: "NABER", price: 7000, color: "#03c75a" }
    };

    const estateInfo = {
        "GAONGAEMI":   { name: "가온개미 단독주택",   price: 10000, color: "#4e7c3f" },
        "NURIGOYANGI": { name: "누리고양이 단독주택", price: 10000, color: "#7b5ea7" },
        "DAMIWONSUNGI":{ name: "다미원숭이 다세대주택", price: 10000, color: "#c0773d" },
        "MARUSURI":    { name: "마루수리 다세대주택", price: 10000, color: "#2e7d9b" },
        "CHORONGBUNGI":{ name: "초롱부엉이 아파트",   price: 10000, color: "#c94b4b" },
        "HANIYUWOO":   { name: "하늬여우 아파트",     price: 10000, color: "#3d7a5e" },
    };

    const SUCCESS_FACTORS = [
        { key: "financial_management", emo: "\u{1FA99}", name: "재정관리능력",           img: "image/icon/money.png",         desc: "용돈을 어떻게 쓰고 얼마나 남길지 스스로 결정하고\n관리하는 능력" },
        { key: "communication",        emo: "\u{1F4AC}", name: "의사소통 및 협상능력",   img: "image/icon/communication.png", desc: "자신의 생각을 논리적으로 전달하고 타인과 조화롭게\n의견을 조율하는 능력" },
        { key: "critical_thinking",    emo: "\u{1F914}", name: "비판적 사고와\n문제 해결 능력", img: "image/icon/thinking.png",   desc: "어려운 상황에 직면했을 때 다양한 대안을 고민하여\n최적의 선택을 내리는 능력" },
        { key: "global_economy",       emo: "\u{1F4A1}", name: "글로벌경제이해력",       img: "image/icon/global.png",        desc: "국내외 경제 변화에 관심을 갖고 복잡한 경제 흐름을\n파악하는 태도" },
        { key: "credit_trust",         emo: "\u{1F91D}", name: "신용과 신뢰",           img: "image/icon/trust.png",         desc: "맡은 일을 끝까지 책임감 있게 완수하여 타인에게 신뢰를\n주는 태도" },
        { key: "entrepreneurship",     emo: "\u{1F3E2}", name: "기업가정신",             img: "image/icon/idea.png",          desc: "세상에 도움이 되는 새로운 가치를 상상하고 이를\n실천에 옮기는 창의적인 힘" },
    ];

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
    function initSuccessFactorsState() {
        const obj = {};
        SUCCESS_FACTORS.forEach(f => obj[f.key] = false);
        return obj;
    }
    function autoResizeInput(el) {
        const ph = document.createElement('span');
        const cs = window.getComputedStyle(el);
        ph.style.font          = cs.font;
        ph.style.letterSpacing = cs.letterSpacing;
        ph.style.visibility    = 'hidden';
        ph.style.position      = 'absolute';
        ph.style.whiteSpace    = 'pre';
        ph.textContent = el.value || ' ';
        document.body.appendChild(ph);
        el.style.width = Math.max(ph.offsetWidth + 4, 20) + 'px';
        document.body.removeChild(ph);
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

    function initAssets() {
        const bills = { "100":0,"500":0,"1000":0,"5000":0,"10000":0,"50000":0 };
        if (currentGameVariant !== 'basic') {
            const est = {};
            for (let k in estateInfo) est[k] = 0;
            return { ...bills, ...est };
        }
        return { ...bills, "SASUNG":0,"LGI":0,"SKEI":0,"CACAO":0,"HYUNDE":0,"NABER":0 };
    }

    function applyInputsToPlayer(p, prefix) {
        if (!p) return;

        const cashEl      = document.getElementById(prefix === 'cnt' ? 'cntCashInput'      : 'rptCashInput');
        const diligenceEl = document.getElementById(prefix === 'cnt' ? 'cntDiligenceInput' : 'rptDiligenceInput');
        const depositEl   = prefix === 'rpt' ? document.getElementById('rptDepositInput') : null;
        const questEl     = prefix === 'rpt' ? document.getElementById('rptQuestInput')   : null;

        p.manualCash      = parseInt(cashEl?.value,      10) || 0;
        p.diligenceReward = parseInt(diligenceEl?.value, 10) || 0;
        if (depositEl) p.depositReward = parseInt(depositEl.value, 10) || 0;
        if (questEl)   p.questReward   = parseInt(questEl.value,   10) || 0;

        const stockPrefix = prefix === 'cnt' ? 'ui' : 'rpt';
        const activeInfo = getActiveAssetInfo();
        for (let k in activeInfo) {
            const input = document.getElementById(`${stockPrefix}_cnt_input_${k}`);
            if (input) {
                p.assets[k] = parseInt(input.value, 10) || 0;
            }
        }

        const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.depositReward || 0) + (p.questReward || 0);
        p.total = currentGameVariant !== 'basic'
            ? base * calcSuccessMultiplier(p.successFactors || {})
            : base;
    }

    function recalculateAllRankings() {
        players.forEach(p => {
            const base = (p.manualCash || 0) + calcActiveAsset(p.assets) + (p.diligenceReward || 0) + (p.questReward || 0) + (p.depositReward || 0);
            p.total = currentGameVariant !== 'basic'
                ? base * calcSuccessMultiplier(p.successFactors || {})
                : base;
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

    function calcEstate(a) {
        let s = 0;
        for (let k in estateInfo) s += (a[k] || 0) * estateInfo[k].price;
        return s;
    }

    function calcActiveAsset(assets) {
        return currentGameVariant !== 'basic' ? calcEstate(assets) : calcStock(assets);
    }

    function calcSuccessMultiplier(sf) {
        return Object.values(sf || {}).filter(Boolean).length * 0.25;
    }

    function getActiveAssetInfo() {
        return currentGameVariant !== 'basic' ? estateInfo : stockInfo;
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

// ── 스테퍼 꾹 누르기 ────────────────────────────────────────────────
let _holdTimer = null;

function startHold(fn) {
    fn();
    _holdTimer = setTimeout(function() {
        _holdTimer = setInterval(fn, 80);
    }, 400);
}

function stopHold() {
    clearTimeout(_holdTimer);
    clearInterval(_holdTimer);
    _holdTimer = null;
}
