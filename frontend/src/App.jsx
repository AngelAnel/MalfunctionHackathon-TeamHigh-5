import { useEffect, useState } from 'react'
import './App.css'
<<<<<<< HEAD
import { startLock, endLock } from './utils/extensionBridge.js'
import ReminderModal from './components/ReminderModal.jsx'
=======
import DoneFlow from './Doneflow'
import RandomAlarm from './RandomAlarm'
>>>>>>> 8fe8c253d8d55bc7c96bd5a9ff1da6c782658ad0

const STORAGE_KEY = 'minute_reminder_state_v3'
const startingTasks = []


function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const saved = loadSavedState()

  const initialRemaining =
    saved?.isRunning && saved?.endTime
      ? Math.max(0, Math.ceil((saved.endTime - Date.now()) / 1000))
      : (saved?.minutes ?? 0) * 60

  const [tasks, setTasks] = useState(saved?.tasks ?? startingTasks)
  const [taskInput, setTaskInput] = useState('')
  const [minutes, setMinutes] = useState(saved?.minutes ?? 0)
  const [endTime, setEndTime] = useState(saved?.isRunning ? saved.endTime : null)
  const [secondsLeft, setSecondsLeft] = useState(initialRemaining)
  const [isRunning, setIsRunning] = useState(Boolean(saved?.isRunning && initialRemaining > 0))
  const [escapeAttempts, setEscapeAttempts] = useState(saved?.escapeAttempts ?? 0)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [notice, setNotice] = useState(
    saved?.isRunning && initialRemaining > 0
      ? 'Nice try closing the tab. Get back to work.'
      : ''
  )

  const completedCount = tasks.filter((task) => task.done).length
  const allTasksDone = tasks.length > 0 && completedCount === tasks.length
  const progress = minutes > 0 ? secondsLeft / (minutes * 60) : 0

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tasks, minutes, isRunning, endTime, escapeAttempts })
    )

    if (isRunning && endTime) {
    startLock({ startTime: endTime - minutes * 60 * 1000, endTime })
    } else {
    endLock()
}
  }, [tasks, minutes, isRunning, endTime, escapeAttempts])


  useEffect(() => {
    if (!isRunning) return undefined

    const handleBeforeUnload = (event) => {
      setEscapeAttempts((prev) => prev + 1)
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isRunning])

  // Accurate countdown based on real clock (prevents background tab throttling)
  useEffect(() => {
    if (!isRunning || !endTime) return undefined

    let lastMinuteBucket = Math.ceil(Math.max(0, endTime - Date.now()) / 60_000)
    let activeMinuteMsg = `${lastMinuteBucket} minute${lastMinuteBucket === 1 ? '' : 's'} left. Stop stalling.`
    let nextNotificationAt = Date.now() + 10_000

    const intervalId = window.setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      setSecondsLeft(remaining)

      if (remaining <= 0) {
        activeMinuteMsg = ''
        setIsRunning(false)
        setEndTime(null)
        window.postMessage({ type: 'END_LOCK' }, '*')
        setNotice('Time is up. You failed to finish in time.')
        return
      }

      const minuteBucket = Math.ceil(remaining / 60)
      if (minuteBucket < lastMinuteBucket) {
        lastMinuteBucket = minuteBucket
        activeMinuteMsg = `${minuteBucket} minute${minuteBucket === 1 ? '' : 's'} left. Stop stalling.`
        setNotice(activeMinuteMsg)
      }

      if (now >= nextNotificationAt) {
        setReminderMessage(activeMinuteMsg)
        setReminderOpen(true)
        window.postMessage(
          {
            type: 'SHOW_NOTIFICATION',
            title: 'Minute-Reminder',
            message: activeMinuteMsg,
          },
          '*'
        )
        const intervalsElapsed = Math.floor((now - nextNotificationAt) / 10_000)
        nextNotificationAt += (intervalsElapsed + 1) * 10_000
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRunning, endTime])

  
  function startTimer() {
<<<<<<< HEAD
    if (allTasksDone) {
      setTasks((current) => current.map((task) => ({ ...task, done: false })))
    }

    const durationSeconds = minutes * 60
    const targetEnd = Date.now() + durationSeconds * 1000

    setSecondsLeft(durationSeconds)
    setEndTime(targetEnd)
    setEscapeAttempts(0)
    setReminderOpen(false)
    setReminderMessage('')
    setNotice('')
    setIsRunning(true)
    window.postMessage({ type: 'START_LOCK' }, '*')
=======
  if (tasks.length === 0) {
    setNotice('Add at least one task before you start the timer.')
    return
>>>>>>> 8fe8c253d8d55bc7c96bd5a9ff1da6c782658ad0
  }

  if (allTasksDone) {
    setTasks((current) => current.map((task) => ({ ...task, done: false })))
  }

  const durationSeconds = minutes * 60
  const targetEnd = Date.now() + durationSeconds * 1000

  setSecondsLeft(durationSeconds)
  setEndTime(targetEnd)
  setEscapeAttempts(0)
  setNotice('')
  setIsRunning(true)
  window.postMessage({ type: 'START_LOCK' }, '*')
}


  function resetTimer() {
    setIsRunning(false)
    setEndTime(null)
    setSecondsLeft(minutes * 60)
    setNotice('')
    window.postMessage({ type: 'END_LOCK' }, '*')
  }

  function endSession() {
    setIsRunning(false)
    setEndTime(null)
    setNotice('Session ended early. Coward.')
    window.postMessage({ type: 'END_LOCK' }, '*')
  }

  // Called by DoneFlow after the user survives every "Are you sure?" round
  function finishSession() {
    setIsRunning(false)
    setEndTime(null)
    setNotice('All tasks complete. You are finally free to leave.')
    window.postMessage({ type: 'END_LOCK' }, '*')
  }

  function updateMinutes(value) {
  const nextMinutes = Math.min(180, Math.max(0, Number(value) || 0))
  setMinutes(nextMinutes)
  if (!isRunning) setSecondsLeft(nextMinutes * 60)
  } 

  function addTask(event) {
    event.preventDefault()
    const title = taskInput.trim()
    if (!title) return
    setTasks((current) => [...current, { id: Date.now(), title, done: false }])
    setTaskInput('')
  }

  // Ticking a box now only ticks the box. Finishing happens through the Done button.
  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    )
  }

  return (
    <main className="workspace">
      <RandomAlarm isRunning={isRunning} />
      <header className="topbar">
        <a className="wordmark" href="#home" aria-label="Morrow home">
          <span className="brand-mark" aria-hidden="true">m</span>
          <span>morrow</span>
        </a>
        <span className="topbar-note">
          <span className="status-dot" />{' '}
          {isRunning ? `Tab locked • Escape attempts: ${escapeAttempts}` : 'A little space to focus'}
        </span>
      </header>

      <section className="dashboard" id="home">
        <div className="intro">
          <p className="eyebrow">YOUR FOCUS SESSION <span>01 / TODAY</span></p>
          <h1>Time to<br /><em>LOCK IN.</em></h1>
          <p className="intro-copy">No more negotiating. Pick your next task, set the clock, and start now.</p>
        </div>

        <section className={`timer-panel ${isRunning ? 'is-running' : ''}`} aria-label="Focus timer">
          <div className="timer-heading">
            <span className="section-label">FOCUS TIMER</span>
            <span className={`session-state ${isRunning ? 'is-live' : ''}`}>
              <span className="state-dot" /> {isRunning ? 'TAB LOCKED' : 'READY WHEN YOU ARE'}
            </span>
          </div>

          <div className="clock-wrap" aria-live="off">
            <svg className="clock-progress" viewBox="0 0 240 240" aria-hidden="true">
              <circle className="clock-track" cx="120" cy="120" r="109" />
              <circle
                className="clock-arc"
                cx="120"
                cy="120"
                r="109"
                style={{ strokeDashoffset: `${684.86 * (1 - progress)}` }}
              />
            </svg>
            <div className="clock-face">
              <span className="clock-caption">{isRunning ? 'NO ESCAPE' : 'YOUR TIME'}</span>
              <span className="clock-time" role="timer" aria-label={`${Math.floor(secondsLeft / 60)} minutes ${secondsLeft % 60} seconds remaining`}>
                {formatTime(secondsLeft)}
              </span>
              <span className="clock-subtitle">{isRunning ? 'Finish your tasks to unlock.' : 'Make it yours.'}</span>
            </div>
          </div>

          <div className="duration-control">
            <label htmlFor="duration">SESSION LENGTH</label>
            <div className="duration-input-wrap">
              <input
                id="duration"
                type="number"
                min="1"
                max="180"
                value={minutes}
                disabled={isRunning}
                onChange={(event) => updateMinutes(event.target.value)}
                aria-label="Session length in minutes"
              />
              <span>min</span>
            </div>
          </div>

          <div className="timer-actions">
            {!isRunning ? (
              <>
                <button className="start-button" type="button" onClick={startTimer}>
                  <span className="play-icon" aria-hidden="true">▶</span> Start timer
                </button>
                <button className="reset-button" type="button" onClick={resetTimer} aria-label="Reset timer" title="Reset timer">↺</button>
              </>
            ) : (
              /* Remove or keep this button depending on whether you want a "ragequit" escape hatch */
              <button className="start-button" type="button" disabled title="Finish all tasks or wait for timer to unlock">
                🔒 Locked until tasks done
              </button>
            )}
          </div>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss reminder" onClick={() => setNotice('')}>×</button>
            </div>
          )}
        </section>

        <section className={`tasks-panel ${isRunning ? 'is-running' : ''}`} aria-label="Your task list">
          <div className="tasks-heading">
            <div>
              <span className="section-label">THE SHORT LIST</span>
              <h2>Things to do</h2>
            </div>
            <span className="task-count">{completedCount}<span> / </span>{tasks.length}</span>
          </div>

          <div className="task-list">
            {tasks.map((task, index) => (
              <label className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  aria-label={`${task.done ? 'Mark incomplete' : 'Complete'}: ${task.title}`}
                />
                <span className="custom-check" aria-hidden="true">✓</span>
                <span className="task-title">{task.title}</span>
                <span className="task-index">0{index + 1}</span>
              </label>
            ))}
            {tasks.length === 0 && <p className="empty-tasks">A clear page is a good place to start.</p>}
          </div>

          <DoneFlow allDone={allTasksDone} onConfirmed={finishSession} />

          <form className="add-task-form" onSubmit={addTask}>
            <span aria-hidden="true">+</span>
            <input
              type="text"
              value={taskInput}
              onChange={(event) => setTaskInput(event.target.value)}
              placeholder="Add a task to your list"
              aria-label="New task"
              disabled={isRunning}
              maxLength={100}
            />
            <button type="submit" disabled={isRunning || !taskInput.trim()} aria-label="Add task">Add</button>
          </form>

          <div className="tasks-footer">
            <span>{isRunning ? 'Check off every task to unlock this tab.' : 'Keep it small. Keep it kind.'}</span>
            <span className="task-lock" aria-label={isRunning ? 'Task editing locked' : 'Task editing unlocked'}>
              {isRunning ? '◉ LOCKED' : '◯ OPEN'}
            </span>
          </div>
        </section>
      </section>

      <footer className="page-footer">
        <span>MADE FOR THE MOMENT YOU’RE IN</span>
        <span>TAKE IT ONE THING AT A TIME <span className="footer-spark">✳</span></span>
      </footer>

      <ReminderModal
        open={isRunning && reminderOpen}
        message={reminderMessage}
        onAcknowledge={() => setReminderOpen(false)}
      />
    </main>

    
  )
}

export default App
