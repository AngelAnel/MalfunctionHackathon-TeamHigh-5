import { useEffect, useState } from 'react'
import './App.css'

const startingTasks = [
  { id: 1, title: 'Choose one thing to focus on', done: false },
  { id: 2, title: 'Clear your desk', done: false },
]

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function App() {
  const [tasks, setTasks] = useState(startingTasks)
  const [taskInput, setTaskInput] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [notice, setNotice] = useState('')

  const completedCount = tasks.filter((task) => task.done).length
  const allTasksDone = tasks.length > 0 && completedCount === tasks.length
  const progress = minutes > 0 ? secondsLeft / (minutes * 60) : 0

  useEffect(() => {
    if (!isRunning) return undefined

    const timeoutId = window.setTimeout(() => {
      if (secondsLeft <= 1) {
        setSecondsLeft(0)
        setIsRunning(false)
        setNotice('Time is up. Take a moment before your next session.')
        return
      }

      const nextSeconds = secondsLeft - 1
      setSecondsLeft(nextSeconds)
      if (nextSeconds % 60 === 0) {
        setNotice('One minute down. Keep going at your own pace.')
      }
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [isRunning, secondsLeft])

  function startTimer() {
    if (allTasksDone) {
      setTasks((current) => current.map((task) => ({ ...task, done: false })))
    }
    setSecondsLeft(minutes * 60)
    setNotice('')
    setIsRunning(true)
  }

  function resetTimer() {
    setIsRunning(false)
    setSecondsLeft(minutes * 60)
    setNotice('')
  }

  function endSession() {
    setIsRunning(false)
    setNotice('Session ended.')
  }

  function updateMinutes(value) {
    const nextMinutes = Math.min(180, Math.max(1, Number(value) || 1))
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

  function toggleTask(id) {
    const completingLastTask = isRunning && tasks.every((task) => task.id === id || task.done)
    setTasks((current) => current.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task,
    ))
    if (completingLastTask) {
      setIsRunning(false)
      setNotice('Lovely work. Your task list is complete.')
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="wordmark" href="#home" aria-label="Morrow home">
          <span className="brand-mark" aria-hidden="true">m</span>
          <span>morrow</span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> A little space to focus</span>
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
              <span className="state-dot" /> {isRunning ? 'IN SESSION' : 'READY WHEN YOU ARE'}
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
              <span className="clock-caption">{isRunning ? 'TIME TO FOCUS' : 'YOUR TIME'}</span>
              <span className="clock-time" role="timer" aria-label={`${Math.floor(secondsLeft / 60)} minutes ${secondsLeft % 60} seconds remaining`}>
                {formatTime(secondsLeft)}
              </span>
              <span className="clock-subtitle">{isRunning ? 'You’re doing just fine.' : 'Make it yours.'}</span>
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
              <button className="start-button" type="button" onClick={startTimer}>
                <span className="play-icon" aria-hidden="true">▶</span> Start timer
              </button>
            ) : (
              <button className="start-button" type="button" onClick={endSession}>
                <span className="stop-icon" aria-hidden="true">■</span> End session
              </button>
            )}
            <button className="reset-button" type="button" onClick={resetTimer} aria-label="Reset timer" title="Reset timer">↺</button>
          </div>
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss reminder" onClick={() => setNotice('')}>×</button>
            </div>
          )}
          <p className="timer-footnote">A gentle reminder will appear here every minute.</p>
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
            <span>{isRunning ? 'Your list is resting while you focus.' : 'Keep it small. Keep it kind.'}</span>
            <span className="task-lock" aria-label={isRunning ? 'Task editing locked' : 'Task editing unlocked'}>{isRunning ? '◉ LOCKED' : '◯ OPEN'}</span>
          </div>
        </section>
      </section>

      <footer className="page-footer">
        <span>MADE FOR THE MOMENT YOU’RE IN</span>
        <span>TAKE IT ONE THING AT A TIME <span className="footer-spark">✳</span></span>
      </footer>
    </main>
  )
}

export default App
