let isSyncing = false; 
let syncTimer = null;  

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const resetBtn = document.getElementById('resetHistoryBtn');
  const inputs = ['urlInput', 'folderInput', 'historyKeyInput', 'intervalInput'];
  const elements = {};

  // DOM 요소 안전 할당
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) elements[id] = el;
  });

  // 기존 설정 로드
  chrome.storage.local.get(['isRunning', 'url', 'folder', 'historyKey', 'interval'], (data) => {
    if (data.url && elements.urlInput) elements.urlInput.value = data.url;
    if (data.folder && elements.folderInput) elements.folderInput.value = data.folder;
    if (data.historyKey && elements.historyKeyInput) elements.historyKeyInput.value = data.historyKey;
    if (data.interval && elements.intervalInput) elements.intervalInput.value = data.interval;
    
    if (data.isRunning) { 
      setUIState(true); 
      startSyncLoop(); 
    } else {
      addLog('시스템이 준비되었습니다. (v0.0.5)', 'info');
    }
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      chrome.storage.local.get(['isRunning'], (data) => {
        const willRun = !data.isRunning;
        const settings = {
          isRunning: willRun,
          url: elements.urlInput ? elements.urlInput.value : 'http://localhost:8080',
          folder: elements.folderInput ? elements.folderInput.value : 'Fuji_Photos',
          historyKey: elements.historyKeyInput ? elements.historyKeyInput.value : 'session_01',
          interval: elements.intervalInput ? parseInt(elements.intervalInput.value, 10) : 3000
        };
        
        chrome.storage.local.set(settings, () => {
          setUIState(willRun);
          if (willRun) startSyncLoop();
          else stopSyncLoop();
        });
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const key = elements.historyKeyInput ? elements.historyKeyInput.value : 'history_log';
      if (confirm(`'${key}' 기록을 초기화하시겠습니까?`)) {
        chrome.storage.local.set({ [key]: [] }, () => {
          const logContainer = document.getElementById('historyLog');
          if (logContainer) {
            logContainer.innerHTML = ''; 
            addLog('로그가 초기화되었습니다.', 'warning');
          }
        });
      }
    });
  }
});

function setUIState(isRunning) {
  const toggleBtn = document.getElementById('toggleBtn');
  const connStatus = document.getElementById('connStatus');

  if (toggleBtn) {
    toggleBtn.innerText = isRunning ? '동기화 정지' : '동기화 시작';
    toggleBtn.className = isRunning ? 'btn-stop' : 'btn-start';
  }

  if (!isRunning && connStatus) {
    connStatus.innerText = '네트워크: 대기 중';
    connStatus.style.color = 'inherit';
  }
}

function startSyncLoop() {
  if (isSyncing) return;
  isSyncing = true;
  chrome.storage.local.get(['url', 'folder', 'historyKey', 'interval'], (settings) => {
     addLog('동기화 모니터링을 시작합니다.', 'info');
     runSyncCycle(settings);
  });
}

function stopSyncLoop() {
  isSyncing = false;
  if (syncTimer) { 
    clearTimeout(syncTimer); 
    syncTimer = null; 
  }
  addLog('동기화가 정지되었습니다.', 'warning');
}

// 스레드 겹침 방지 비동기 루프
async function runSyncCycle(settings) {
  if (!isSyncing) return; 
  
  await performSync(settings); 
  
  if (isSyncing) {
    syncTimer = setTimeout(() => runSyncCycle(settings), settings.interval || 3000);
  }
}

async function performSync(settings) {
  const connStatus = document.getElementById('connStatus');
  const currFile = document.getElementById('currFile');

  try {
    const response = await fetch(settings.url, { cache: 'no-store' });
    if (!response.ok) throw new Error();

    if (connStatus) {
      connStatus.innerText = '네트워크: 접속 성공 ✅';
      connStatus.style.color = '#4CAF50';
    }

    const htmlText = await response.text();
    const regex = />([^<]+\.JPG)</gi;
    let match;

    const storageData = await chrome.storage.local.get([settings.historyKey]);
    let history = storageData[settings.historyKey] || [];
    let isChanged = false;

    while ((match = regex.exec(htmlText)) !== null) {
      const filename = match[1];
      if (!history.includes(filename)) {
        if (currFile) currFile.innerText = `처리 중: ${filename} ⬇️`;

        const downloadUrl = settings.url.includes('dir?')
          ? settings.url.split('dir?')[0] + filename
          : settings.url.replace(/\/$/, "") + '/' + filename;

        chrome.downloads.download({
          url: downloadUrl,
          filename: "ezsync_" + filename,
          conflictAction: 'overwrite'
        });

        history.push(filename);
        isChanged = true;
        addLog(`파일 다운로드 요청 완료: ${filename}`, 'success');
      }
    }

    if (isChanged) {
      await chrome.storage.local.set({ [settings.historyKey]: history });
      addLog(`히스토리 업데이트 완료 (총 ${history.length}개)`, 'info');
    }

    if (currFile) currFile.innerText = '처리 중: 대기 중 💤';
  } catch (error) {
    if (connStatus) {
      connStatus.innerText = '네트워크: 연결 오류 ❌';
      connStatus.style.color = '#f44336';
    }
    addLog('서버 접속에 실패했습니다.', 'error');
  }
}

// [XSS 보안 패치] innerHTML 대신 DOM 노드 생성 및 textContent 사용
function addLog(message, type = 'info') {
  const logContainer = document.getElementById('historyLog');
  if (!logContainer) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  const logItem = document.createElement('div');
  logItem.className = 'log-item';

  let color = '#333';
  if (type === 'success') color = '#4CAF50';
  else if (type === 'error') color = '#f44336';
  else if (type === 'warning') color = '#ff9800';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `[${timeStr}] `;

  const msgSpan = document.createElement('span');
  msgSpan.style.color = color;
  msgSpan.style.fontWeight = '500';
  msgSpan.textContent = message; // 안전한 텍스트 렌더링

  logItem.appendChild(timeSpan);
  logItem.appendChild(msgSpan);
  
  logContainer.appendChild(logItem);
  logContainer.scrollTop = logContainer.scrollHeight; 
}