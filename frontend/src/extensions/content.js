// Minute-Reminder content script. Runs in every tab.
// 1) Relays start/end messages from the app page to the background.
// 2) Shows a blocking modal on the visible tab every 10 seconds while a session is locked.

;(() => {
  if (window.__minuteReminderLoaded) return
  window.__minuteReminderLoaded = true

  const MODAL_INTERVAL_MS = 10_000
  const ACK_DELAY_SECONDS = 2

  const SNARK = {
    early: [
      'Plenty of time. That’s what everyone says.',
      'Your tasks are still waiting. Cute.',
      'Take your time. (Don’t.)',
    ],
    mid: [
      'You’re halfway to regret.',
      'Your tasks are starting to take this personally.',
      'Procrastinating is just stress with extra steps.',
    ],
    late: [
      'This is fine. (It is not fine.)',
      'Panic is a valid productivity tool.',
      'You said you’d finish. We believed you. Why.',
    ],
    final: [
      'Hope you enjoy disappointment.',
      'Last chance. Last-minute person, as usual.',
      'No pressure. (All the pressure.)',
    ],
  }

  let state = { isLocked: false, modalOpen: false, nextModalAt: 0, startTime: 0, endTime: 0 }
  let host = null
  let countdownTimer = null

  // Lets the app know the extension is installed.
  document.documentElement.dataset.minuteReminderExt = '1'

  function send(message) {
    try {
      chrome.runtime.sendMessage(message).catch(() => {})
    } catch {
      // Extension was reloaded; this page needs a refresh.
    }
  }

  // ---------- Bridge: app page -> background ----------

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data
    if (!data || data.source !== 'minute-reminder') return

    if (data.type === 'START_LOCK') {
      send({
        action: 'LOCK_TAB',
        url: location.href,
        startTime: data.startTime,
        endTime: data.endTime,
      })
    } else if (data.type === 'END_LOCK') {
      send({ action: 'UNLOCK_TAB' })
    }
  })

  // ---------- Message text ----------

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)]
  }

  function getStage() {
    const total = state.endTime - state.startTime
    const left = state.endTime - Date.now()
    if (total <= 0) return 'early'
    if (left <= 60_000) return 'final'
    const elapsed = 1 - left / total
    if (elapsed < 0.34) return 'early'
    if (elapsed < 0.67) return 'mid'
    return 'late'
  }

  function formatLeft() {
    const seconds = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000))
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  function buildMessage() {
    return `${formatLeft()} left. ${pick(SNARK[getStage()])}`
  }

  // ---------- Modal ----------

  function onBeforeUnload(event) {
    event.preventDefault()
    event.returnValue = ''
  }

  function removeModal() {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    if (host) {
      const el = host
      host = null // set first so the dialog's close handler doesn't reopen it
      el.remove()
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }

  function acknowledge() {
    removeModal()
    // Update local state right away so the next tick doesn't reopen it.
    state.modalOpen = false
    state.nextModalAt = Date.now() + MODAL_INTERVAL_MS
    send({ action: 'MODAL_ACK' })
  }

  function showModal() {
    if (host) return

    host = document.createElement('div')
    host.id = 'minute-reminder-root'
    const root = host.attachShadow({ mode: 'open' })

    root.innerHTML = `
      <style>
        :host { all: initial; }
        dialog {
          border: 0;
          padding: 0;
          background: transparent;
          width: min(460px, 92vw);
          max-width: 92vw;
          overflow: visible;
        }
        dialog::backdrop { background: rgba(23, 39, 43, 0.85); }
        .card {
          background: #ffffff;
          border-top: 6px solid #c74132;
          border-radius: 6px;
          padding: 28px;
          color: #1d3136;
          font-family: 'Arial Narrow', 'Franklin Gothic Medium', Arial, sans-serif;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          animation: shake 0.45s ease;
        }
        .kicker {
          margin: 0 0 8px;
          color: #c74132;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.6px;
        }
        h2 {
          margin: 0 0 10px;
          font-family: Impact, 'Arial Narrow', sans-serif;
          font-size: 36px;
          font-weight: 900;
          line-height: 1;
          text-transform: uppercase;
        }
        .message {
          margin: 0 0 22px;
          color: #50686b;
          font-size: 17px;
          line-height: 1.5;
        }
        button {
          width: 100%;
          min-height: 48px;
          border: 0;
          border-radius: 3px;
          background: #167668;
          color: #ffffff;
          cursor: pointer;
          font: 600 15px Arial, sans-serif;
        }
        button:disabled { background: #9db8b2; cursor: not-allowed; }
        button:focus-visible { outline: 3px solid #c74132; outline-offset: 3px; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .card { animation: none; }
        }
      </style>
      <dialog aria-labelledby="mr-title" aria-describedby="mr-message">
        <div class="card">
          <p class="kicker">FOCUS SESSION REMINDER</p>
          <h2 id="mr-title">Back to your task.</h2>
          <p class="message" id="mr-message"></p>
          <button type="button"></button>
        </div>
      </dialog>
    `

    const dialog = root.querySelector('dialog')
    const button = root.querySelector('button')
    root.querySelector('.message').textContent = buildMessage()

    // Block Escape, and reopen if the browser closes it anyway.
    dialog.addEventListener('cancel', (event) => event.preventDefault())
    dialog.addEventListener('close', () => {
      if (host && !dialog.open) dialog.showModal()
    })

    // Short delay before the button works, so it can't be dismissed on reflex.
    let secondsLeft = ACK_DELAY_SECONDS
    button.disabled = true
    button.textContent = `Acknowledge and continue (${secondsLeft})`
    countdownTimer = setInterval(() => {
      secondsLeft -= 1
      if (secondsLeft <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
        button.disabled = false
        button.textContent = 'Acknowledge and continue'
        button.focus()
      } else {
        button.textContent = `Acknowledge and continue (${secondsLeft})`
      }
    }, 1000)
    button.addEventListener('click', acknowledge)

    document.documentElement.appendChild(host)
    dialog.showModal()
    window.addEventListener('beforeunload', onBeforeUnload)

    state.modalOpen = true
    send({ action: 'MODAL_OPEN', url: location.href })
  }

  // ---------- Schedule ----------

  function tick() {
    if (!state.isLocked) {
      removeModal()
      return
    }

    // Safety net: if the app never reported the end, release the lock after the session time passes.
    if (state.endTime && Date.now() > state.endTime + 3000) {
      send({ action: 'UNLOCK_TAB' })
      removeModal()
      return
    }

    if (host) return
    if (document.visibilityState !== 'visible') return

    // state.modalOpen being true here means a modal was already up (reload, navigation, respawn).
    if (state.modalOpen || Date.now() >= state.nextModalAt) showModal()
  }

  chrome.storage.local
    .get(['isLocked', 'modalOpen', 'nextModalAt', 'startTime', 'endTime'])
    .then((saved) => {
      Object.assign(state, saved)
      tick()
    })
    .catch(() => {})

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    for (const [key, change] of Object.entries(changes)) {
      if (key in state) state[key] = change.newValue
    }
    // Acknowledged in another tab or window -> close this one too.
    if (host && state.isLocked && !state.modalOpen) removeModal()
    tick()
  })

  document.addEventListener('visibilitychange', tick)
  setInterval(tick, 1000)
})()