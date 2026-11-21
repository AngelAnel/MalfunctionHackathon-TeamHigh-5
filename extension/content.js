window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "START_LOCK") {
    chrome.runtime.sendMessage({
      action: "LOCK_TAB",
      url: window.location.href
    });
  }

  if (event.data?.type === "END_LOCK") {
    chrome.runtime.sendMessage({ action: "UNLOCK_TAB" });
  }

  if (event.data?.type === "SHOW_NOTIFICATION") {
    chrome.runtime.sendMessage({
      action: "NOTIFY",
      title: event.data.title,
      message: event.data.message
    });
  }
});