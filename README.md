# Minute-Reminder

Minute-Reminder is an intentionally inconvenient Pomodoro-style task tracker that makes procrastination more difficult. It combines a React JS focus timer with a Chrome extension that helps enforce the app’s session rules across browser tabs.

## Problem

Traditional task timers make it easy to pause, reset, or abandon a session. Minute-Reminder adds pressure by limiting escape options and keeping the user focused until tasks are completed or the timer ends.

## Solution

The React JS application lets users create a short task list and set a focus-session timer. During an active session, task editing is locked and the interface is visually subdued. Completing tasks or reaching zero finishes the session, while the Chrome extension watches for tab changes, shows notifications, and supports the system’s session-lock behavior.

## Features

- Customizable task list
- User-set countdown timer
- Locked task editing during an active session
- Subdued active-session timer and task panels
- High-urgency visual style and repeated reminder messages
- Desktop notifications through the Chrome extension
- Random alarm challenges while a session remains open
- Multi-step task confirmation and congratulations flow
- Task list clearing when all tasks are completed or the timer reaches zero
- Browser-session persistence

## Tech Stack

- Frontend: React JS
- UI: JavaScript, HTML, and CSS
- Build tool: Vite
- Browser integration: Chrome Manifest V3 extension
- Notifications and tab controls: Chrome extension APIs
- State persistence: Browser local storage

## Getting Started

### Run the React application

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173/`.

### Build the frontend

```bash
cd frontend
npm run build
```

### Load the Chrome extension

1. Open `chrome://extensions/` in Google Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `frontend/src/extensions` folder.
5. Keep the extension enabled and open the local React app.

## Current System Rules

- At least one task and a timer longer than zero are required to start.
- The task list and timer settings lock during an active session.
- Random alarms can interrupt a session until the required math answers are solved.
- Completing every task requires passing the task confirmation flow.
- The task list clears after all tasks are complete or once the timer reaches `0:00`.
- The browser extension can display reminders and enforce the lock behavior.

## Team High-5

| Name | Role |
|------|------|
| Angel Anel Beato | Lead Developer |
|Sigrid Allison Laputan | Developer/UI/UX Developer |
| Yuri Anne Queen Aquino | Developer, Pitcher |
| Maria Mae Cadungog| Developer |
|  Zephemae Niegas | Developer, Pitcher |

## Demo

Add the demo video, presentation link, or deployed site URL here.

## License

MIT