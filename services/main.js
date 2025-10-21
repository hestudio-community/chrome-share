chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "share",
    title: "Share",
    contexts: ["page"],
    documentUrlPatterns: ["http://*/*", "https://*/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (String(info.menuItemId) === "share") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          navigator.share({
            title: document.title,
            url: window.location.href,
          });
        } catch {
          alert("This page cannot be shared!");
        }
      },
    });
  }
});
