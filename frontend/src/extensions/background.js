// Minute-Reminder background service worker.
// Rule: while the blocking modal is open, any attempt to leave gets reversed.

const MODAL_INTERVAL_MS = 10_000
const STATE_KEYS = ['isLocked', 'modalOpen', 'modalTabId', 'modalUrl', 'nextModalAt', 'startTime', 'endTime']

// In-memory flag, only used for the short moment a tab is being respawned.
let respawning = false

const CLEARED_STATE = {
  isLocked: false,
  modalOpen: false,
  modalTabId: null,
  modalUrl: null,
}

function getState() {
  return chrome.storage.local.get(STATE_KEYS)
}

// Pages where our content script can't run (chrome://, the Web Store, etc.)
function isRestricted(url = '') {
  if (!/^https?:\/\//.test(url)) return true
  return /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/.test(url)
}

async function focusModalTab() {
  const { modalOpen, modalTabId } = await getState()
  if (!modalOpen || modalTabId == null) return
  try {
    const tab = await chrome.tabs.get(modalTabId)
    await chrome.windows.update(tab.windowId, { focused: true })
    await chrome.tabs.update(modalTabId, { active: true })
  } catch {
    // The tab is gone; onRemoved will respawn it.
  }
}

async function respawnModalTab(url) {
  respawning = true
  try {
    const windows = await chrome.windows.getAll()
    if (windows.length > 0) {
      const tab = await chrome.tabs.create({ url, active: true })
      await chrome.windows.update(tab.windowId, { focused: true })
      await chrome.storage.local.set({ modalTabId: tab.id })
    } else {
      const win = await chrome.windows.create({ url, focused: true })
      const first = win?.tabs?.[0]
      if (first) await chrome.storage.local.set({ modalTabId: first.id })
    }
  } finally {
    respawning = false
  }
}

// ---------- Messages from content scripts ----------

chrome.runtime.onMessage.addListener((msg, sender) => {
  handleMessage(msg, sender).catch((error) => console.error('Minute-Reminder:', error))
})

async function handleMessage(msg, sender) {
  switch (msg.action) {
    case 'LOCK_TAB': {
      const prev = await getState()
      // The app re-sends this on every state change. Don't reset the schedule if it's the same session.
      if (prev.isLocked && prev.endTime === msg.endTime) return
      await chrome.storage.local.set({
        ...CLEARED_STATE,
        isLocked: true,
        startTime: msg.startTime,
        endTime: msg.endTime,
        nextModalAt: Date.now() + MODAL_INTERVAL_MS,
      })
      break
    }

    case 'UNLOCK_TAB':
      await chrome.storage.local.set(CLEARED_STATE)
      break

    case 'MODAL_OPEN': {
      const { isLocked } = await getState()
      if (!isLocked || !sender.tab) return
      await chrome.storage.local.set({
        modalOpen: true,
        modalTabId: sender.tab.id,
        modalUrl: msg.url || sender.tab.url,
      })
      break
    }

    case 'MODAL_ACK':
      await chrome.storage.local.set({
        modalOpen: false,
        modalTabId: null,
        modalUrl: null,
        nextModalAt: Date.now() + MODAL_INTERVAL_MS,
      })
      break

    case 'NOTIFY':
      // Needs an icon.png (any PNG) in the extension folder.
      chrome.notifications.create(
        'minute-reminder',
        {
          type: 'basic',
          iconUrl: 'icon.png',
          title: msg.title || 'Minute-Reminder',
          message: msg.message || '',
          priority: 2,
          requireInteraction: true,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error('Notification failed:', chrome.runtime.lastError.message)
          }
        },
      )
      break

    default:
      break
  }
}

// ---------- Guards: only active while the modal is open ----------

// 1. Switching to another tab -> snap back
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (respawning) return
  const { modalOpen, modalTabId } = await getState()
  if (modalOpen && tabId !== modalTabId) focusModalTab()
})

// 2. Clicking into another Chrome window -> snap back
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (respawning || windowId === chrome.windows.WINDOW_ID_NONE) return
  const { modalOpen, modalTabId } = await getState()
  if (!modalOpen || modalTabId == null) return
  try {
    const tab = await chrome.tabs.get(modalTabId)
    if (tab.windowId !== windowId) focusModalTab()
  } catch {
    // Modal tab is gone; onRemoved handles it.
  }
})

// 3. Opening a new tab -> close it and go back
chrome.tabs.onCreated.addListener(async (tab) => {
  if (respawning) return
  const { modalOpen, modalTabId } = await getState()
  if (modalOpen && tab.id !== modalTabId) {
    try {
      await chrome.tabs.remove(tab.id)
    } catch {
      // Already gone.
    }
    focusModalTab()
  }
})

// 4. Closing the modal tab (or its whole window) -> reopen it
chrome.tabs.onRemoved.addListener(async (closedTabId) => {
  const { isLocked, modalOpen, modalTabId, modalUrl } = await getState()
  if (isLocked && modalOpen && closedTabId === modalTabId && modalUrl) {
    await respawnModalTab(modalUrl)
  }
})

// 5. Navigating the modal tab to a page we can't run on (chrome://, etc.) -> send it back
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return
  const { modalOpen, modalTabId, modalUrl } = await getState()
  if (modalOpen && tabId === modalTabId && modalUrl && isRestricted(changeInfo.url)) {
    chrome.tabs.update(tabId, { url: modalUrl })
  }
})

// 6. Chrome was quit and reopened mid-modal -> bring it back
chrome.runtime.onStartup.addListener(async () => {
  const { isLocked, modalOpen, modalUrl, endTime } = await getState()
  if (isLocked && endTime && Date.now() > endTime) {
    await chrome.storage.local.set(CLEARED_STATE)
    return
  }
  if (isLocked && modalOpen && modalUrl) {
    await respawnModalTab(modalUrl)
  }
})

// ---------- Presenter kill switch (Ctrl+Shift+K / Cmd+Shift+K) ----------

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'kill-switch') {
    await chrome.storage.local.set(CLEARED_STATE)
  }
})