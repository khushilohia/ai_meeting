// Open the side panel when the toolbar icon is clicked.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// The side panel can't call tabCapture directly for an arbitrary tab; it asks us for a stream ID.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_STREAM_ID") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return sendResponse({ error: "no active tab" });
      chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
        if (chrome.runtime.lastError) return sendResponse({ error: chrome.runtime.lastError.message });
        sendResponse({ streamId, tabTitle: tab.title });
      });
    });
    return true; // async response
  }
});
