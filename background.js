// 아이콘 클릭 시 대시보드 열기
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'dashboard.html' });
});

// 모든 다운로드를 감시하여 ezsync_ 접두사가 붙은 파일만 폴더 할당
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.filename.startsWith("ezsync_")) {
    chrome.storage.local.get(['folder'], (data) => {
      let subFolder = data.folder || 'ezShare_Sync';
      
      // 강력한 경로 정제 (역슬래시 변환, 앞뒤 슬래시 제거, 예약어 제거)
      subFolder = subFolder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/[:*?"<>|]/g, '').trim();
      
      // 'ezsync_' 접두사를 제거하여 원본 파일명 복구
      let cleanFilename = item.filename.replace("ezsync_", "");
      
      // 최종 경로 조합
      let finalPath = subFolder ? `${subFolder}/${cleanFilename}` : cleanFilename;

      console.log("원본 요청:", item.filename);
      console.log("최종 제안 경로:", finalPath);

      suggest({
        filename: finalPath,
        conflictAction: 'overwrite'
      });
    });
    return true; // 비동기 처리를 위해 true 반환
  }
});