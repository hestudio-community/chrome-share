chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "COPY_TEXT") return;
  (async () => {
    const text = String(msg.text ?? "");
    try {
      await navigator.clipboard.writeText(text);
      sendResponse({ ok: true });
    } catch {
      try {
        const el = document.createElement(
          /[\r\n]/.test(text) ? "textarea" : "input"
        );
        el.value = text;
        el.setAttribute("readonly", "");
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        el.remove();
        sendResponse({ ok });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    }
  })();
  return true;
});
