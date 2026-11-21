async function respawnLockedTab(url) {
  const windows = await chrome.windows.getAll();

  if (windows.length > 0) {
    // At least one Chrome window is still open -> open a new tab in it
    const newTab = await chrome.tabs.create({ url, active: true });
    await chrome.windows.update(newTab.windowId, { focused: true });
    await chrome.storage.local.set({ lockedTabId: newTab.id });
  } else {
    // They closed the entire window -> spawn a brand-new Chrome window
    const newWin = await chrome.windows.create({ url, focused: true });
    if (newWin?.tabs?.[0]) {
      await chrome.storage.local.set({ lockedTabId: newWin.tabs[0].id });
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "LOCK_TAB" && sender.tab) {
    chrome.storage.local.set({
      lockedTabId: sender.tab.id,
      lockedUrl: msg.url,
      isLocked: true
    });
  }

  if (msg.action === "UNLOCK_TAB") {
    chrome.storage.local.set({ isLocked: false, lockedTabId: null });
  }

  if (msg.action === "NOTIFY") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: msg.title || "Minute-Reminder",
      message: msg.message,
      priority: 2
    });
  }
});

// Fires when either the single tab OR its parent window is closed
chrome.tabs.onRemoved.addListener(async (closedTabId) => {
  const data = await chrome.storage.local.get(["isLocked", "lockedTabId", "lockedUrl"]);

  if (data.isLocked && closedTabId === data.lockedTabId && data.lockedUrl) {
    await respawnLockedTab(data.lockedUrl);
  }
});

// Fires if they killed the entire Chrome app and reopen Chrome later
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(["isLocked", "lockedUrl"]);

  if (data.isLocked && data.lockedUrl) {
    await respawnLockedTab(data.lockedUrl);
  }
});