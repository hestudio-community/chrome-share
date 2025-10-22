const OFFSCREEN_URL = chrome.runtime.getURL("services/offscreen.html");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureOffscreen() {
  let hasDoc = false;
  if (chrome.offscreen && chrome.offscreen.hasDocument) {
    hasDoc = await chrome.offscreen.hasDocument();
    if (hasDoc) return;
  }
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["CLIPBOARD"],
    justification:
      "Copy text to system clipboard without injecting into page DOM",
  });
  await sleep(150);
}

async function copyToClipboard(text) {
  await ensureOffscreen();
  const maxAttempts = 5;
  let attempt = 0;
  let lastErr = null;
  while (attempt < maxAttempts) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "COPY_TEXT", text });
      if (!res || !res.ok) {
        throw new Error(res?.error || "Clipboard write failed");
      }
      return;
    } catch (e) {
      const msg = e?.message || String(e);
      lastErr = e;
      if (
        msg.includes("Receiving end does not exist") ||
        msg.includes("Could not establish connection")
      ) {
        await sleep(100 * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("Clipboard write failed after retries");
}
// --------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "share",
    title: "Share",
    contexts: ["page"],
    documentUrlPatterns: ["http://*/*", "https://*/*"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (String(info.menuItemId) === "share") {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (activeTab) {
      chrome.scripting
        .executeScript({
          target: { tabId: activeTab.id },
          func: (title, url) => {
            navigator.share({
              title: title,
              url: url,
            });
          },
          args: [activeTab.title, activeTab.url],
        })
        .catch(() => {
          (async () => {
            try {
              await copyToClipboard(activeTab.url);
              chrome.notifications.create(String(Date.now()), {
                type: "basic",
                title: "Share",
                message: `The link for "${activeTab.title}" has been copied to the clipboard.`,
                iconUrl: "/assets/icons/default-128.png",
              });
            } catch (e) {
              console.error(
                "Failed to copy URL to clipboard:",
                e && (e.message || e)
              );
            }
          })();
        });
    }
  }
});
