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

    window[cbName] = function(data) {
        delete window[cbName];
        document.body.removeChild(script);
        if (!data.success) {
            container.innerHTML = `<div class="tr-status-msg">❌ 오류: ${data.code || 'FETCH_ERROR'}</div>`;
            return;
        }
        _testReports = data.reports || [];
        renderTestReportCards();
    };

    script.onerror = function() {
        delete window[cbName];
        document.body.removeChild(script);
        container.innerHTML = '<div class="tr-status-msg">❌ 불러오기 실패: 네트워크 오류</div>';
    };

    script.src = `${SURVEY_SCRIPT_URL}?action=listTestReports&callback=${cbName}`;
    document.body.appendChild(script);
}

function renderTestReportCards() {
    const container = document.getElementById('testReportCards');

    if (!_testReports.length) {
        container.innerHTML = '<div class="tr-status-msg">결과가 없습니다.</div>';
        return;
    }

    container.innerHTML = _testReports.map((r, i) => {
        const color   = REPORT_IMAGES[r.result];
        const dateStr = (r.createdAt || '').replace(/-/g, '');
        const title   = `${dateStr}_${r.name}_테스트결과보고서`;
        const imgSrc  = color ? `image/reports/${color}.png` : '';

        return `
            <div class="tr-card">
                <div class="tr-thumbnail">
                    ${imgSrc
                        ? `<img src="${imgSrc}" alt="${r.result}" onerror="this.parentElement.style.background='#f0f0f0'">`
                        : `<div style="height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px;">이미지 없음</div>`
                    }
                </div>
                <div class="tr-card-body">
                    <div class="tr-card-title" title="${title}">${title}</div>
                    <button class="tr-print-btn" onclick="printTestReport(${i})">🖨️ 출력하기</button>
                </div>
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
        </div>
    `;

    window.print();
    area.innerHTML = '';
}
