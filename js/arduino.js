let port, reader;
async function connectArduino() {
    try{
        port=await navigator.serial.requestPort(); await port.open({baudRate:115200});
        document.getElementById('connStatus').innerText="✅";
        alert("연결되었습니다.");
        const dec=new TextDecoderStream(); port.readable.pipeTo(dec.writable); reader=dec.readable.getReader(); readLoop();
        document.getElementById('arduinoWarning').style.display = 'none';
    }catch(e){
        document.getElementById('arduinoWarning').style.display = 'block';
    }
}

async function readLoop(){
    let buf=""; while(true){ const {value,done}=await reader.read(); if(done)break; buf+=value; let lines=buf.split('\n'); buf=lines.pop();
    lines.forEach(l=>{
        if(l.trim().startsWith('{')){
            try{
                let d=JSON.parse(l.trim());
                let targetIdx = (document.getElementById('reportScreen').classList.contains('active-screen')) ? viewingPlayerIndex : activeCountingIndex;
                if(players[targetIdx]) {
                    players[targetIdx].assets[d.type] = d.count;
                    if(document.getElementById('reportScreen').classList.contains('active-screen')) {
                        if(!isNaN(d.type)) { players[targetIdx].manualCash = calcCashFromBills(players[targetIdx].assets); }
                        manualUpdate();
                    } else {
                        if(!isNaN(d.type)) { players[targetIdx].manualCash = calcCashFromBills(players[targetIdx].assets); }
                        updateDash();
                    }
                }
            }catch(e){}
        }
    }); }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectBtn').addEventListener('click', connectArduino);
});
