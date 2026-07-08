// [경제적 유형 보고서] EFTI 기반 즉시 출력 보고서

function showReportHubScreen() {
    switchScreen('reportHubScreen');
}

function showEftiReportScreen() {
    switchScreen('eftiReportScreen');
    populateEftiTypeOptions();
    resetEftiReportForm();
}

function populateEftiTypeOptions() {
    const select = document.getElementById('eftiType');
    if (select.options.length) return;
    EFTI_OPTIONS.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
    });
}

function resetEftiReportForm() {
    document.getElementById('eftiName').value = '';
    document.getElementById('eftiAge').value = '';
    document.getElementById('eftiType').value = '-';
    document.getElementById('eftiDate').value = new Date().toISOString().slice(0, 10);
}

function printEftiReport() {
    const name = document.getElementById('eftiName').value.trim();
    const age  = document.getElementById('eftiAge').value.trim();
    const efti = document.getElementById('eftiType').value;
    const date = document.getElementById('eftiDate').value;

    if (!name) { alert('이름을 입력해주세요'); return; }
    if (!age)  { alert('나이를 입력해주세요'); return; }
    if (efti === '-') { alert('EFTI 유형을 선택해주세요'); return; }

    const imagePath = `image/efti/${efti}.png`;

    const preload = new Image();
    preload.onload = preload.onerror = function () {
        const area = document.getElementById('testReportPrintArea');
        area.innerHTML = `
            <div style="position:relative; display:inline-block; width:100%;">
                <img src="${imagePath}" style="width:100%; display:block;">
                <span class="tr-overlay efti-report-name">${name}</span>
                <span class="tr-overlay efti-report-age">${age}세</span>
                <span class="tr-overlay efti-report-date">${date}</span>
            </div>
        `;

        document.body.classList.add('printing-test-report');
        window.print();
        document.body.classList.remove('printing-test-report');
        area.innerHTML = '';

        resetEftiReportForm();
    };
    preload.src = imagePath;
}
