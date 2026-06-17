// [테스트 보고서] 경제적 잠재력 테스트 보고서 출력

const REPORT_IMAGES = {
    'Red Group':    'red',
    'Green Group':  'green',
    'Orange Group': 'orange',
    'Blue Group':   'blue',
};

let _testReports = [];

function showTestReportScreen() {
    switchScreen('testReportScreen');
    fetchTestReports();
}

function fetchTestReports() {
    const container = document.getElementById('testReportCards');
    container.innerHTML = '<div class="tr-status-msg">불러오는 중...</div>';

    if (!SURVEY_SCRIPT_URL) {
        container.innerHTML = '<div class="tr-status-msg">❌ SURVEY_SCRIPT_URL이 설정되지 않았습니다.<br>js/config.js를 확인해주세요.</div>';
        return;
    }

    const cbName = '_trCb_' + Date.now();
    const script = document.createElement('script');

    const timeout = setTimeout(() => {
        delete window[cbName];
        if (document.body.contains(script)) document.body.removeChild(script);
        container.innerHTML = '<div class="tr-status-msg">❌ 불러오기 실패: 응답 시간 초과<br><small style="color:#aaa">GAS 배포 URL을 확인하거나 잠시 후 재시도해 주세요.</small><br><br><button onclick="fetchTestReports()" style="padding:8px 16px;background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer;">🔄 재시도</button></div>';
    }, 12000);

    window[cbName] = function(data) {
        clearTimeout(timeout);
        delete window[cbName];
        document.body.removeChild(script);
        if (!data.success) {
            const detail = data.message ? `<br><small style="color:#aaa">${data.message}</small>` : '';
            container.innerHTML = `<div class="tr-status-msg">❌ 오류: ${data.code || 'FETCH_ERROR'}${detail}<br><br><button onclick="fetchTestReports()" style="padding:8px 16px;background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer;">🔄 재시도</button></div>`;
            return;
        }
        _testReports = (data.reports || [])
            .filter(r => r.name && String(r.name).trim() && r.age && String(r.age).trim())
            .sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1);
        const searchEl = document.getElementById('trSearchInput');
        if (searchEl) searchEl.value = '';
        renderTestReportCards();
    };

    script.onerror = function() {
        clearTimeout(timeout);
        delete window[cbName];
        document.body.removeChild(script);
        container.innerHTML = '<div class="tr-status-msg">❌ 불러오기 실패: 네트워크 오류<br><br><button onclick="fetchTestReports()" style="padding:8px 16px;background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer;">🔄 재시도</button></div>';
    };

    script.src = `${SURVEY_SCRIPT_URL}?action=listTestReports&callback=${cbName}`;
    document.body.appendChild(script);
}

function filterTestReportCards(query) {
    const q = (query || '').trim().toLowerCase();
    const filtered = q
        ? _testReports.filter(r => {
            const dateStr = (r.createdAt || '').replace(/-/g, '');
            const title = `${dateStr}_${r.name}_테스트결과보고서`.toLowerCase();
            return title.includes(q);
        })
        : _testReports;
    renderTestReportCards(filtered);
}

function renderTestReportCards(reports) {
    const container = document.getElementById('testReportCards');
    const list = reports !== undefined ? reports : _testReports;

    if (!list.length) {
        container.innerHTML = '<div class="tr-status-msg">결과가 없습니다.</div>';
        return;
    }

    container.innerHTML = list.map((r, i) => {
        const originalIdx = _testReports.indexOf(r);
        const color   = REPORT_IMAGES[r.result];
        const dateStr = (r.createdAt || '').replace(/-/g, '');
        const title   = `${dateStr}_${r.name}_테스트결과보고서`;
        const imgSrc  = color ? `image/reports/${color}.png` : '';

        return `
            <div class="tr-card">
                <div class="tr-thumbnail" onclick="printTestReport(${originalIdx})">
                    ${imgSrc
                        ? `<img src="${imgSrc}" alt="${r.result}" onerror="this.parentElement.style.background='#f0f0f0'"><div class="tr-thumbnail-overlay">🖨️ 출력하기</div>`
                        : `<div style="height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px;">이미지 없음</div>`
                    }
                </div>
                <div class="tr-card-title" title="${title}">${title}</div>
            </div>
        `;
    }).join('');
}

function printTestReport(idx) {
    const r = _testReports[idx];
    if (!r) return;

    const color = REPORT_IMAGES[r.result];
    if (!color) {
        alert(`알 수 없는 그룹입니다: "${r.result}"\n출력을 중단합니다.`);
        return;
    }

    const ageText   = /^\d+$/.test(String(r.age).trim()) ? `${r.age}세` : r.age;
    const imagePath = `image/reports/${color}.png`;

    const area = document.getElementById('testReportPrintArea');
    area.innerHTML = `
        <div style="position:relative; display:inline-block; width:100%;">
            <img src="${imagePath}" style="width:100%; display:block;">
            <span class="tr-overlay tr-name">${r.name}</span>
            <span class="tr-overlay tr-age">${ageText}</span>
            <span class="tr-overlay tr-date">${r.createdAt || ''}</span>
        </div>
    `;

    document.body.classList.add('printing-test-report');
    window.print();
    document.body.classList.remove('printing-test-report');
    area.innerHTML = '';
}
