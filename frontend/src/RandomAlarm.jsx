import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* ---------- TWEAK THESE ---------- */
const MIN_DELAY_SECONDS = 30 // earliest an alarm can ring after the last one
const MAX_DELAY_SECONDS = 120 // latest
const CORRECT_NEEDED = 2 // math answers in a row needed to stop it
/* --------------------------------- */

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

function newProblem() {
  const a = rand(12, 29)
  const b = rand(6, 9)
  return { a, b, answer: a * b }
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2147483647,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'alarmPulse 0.8s infinite',
  },
  modal: {
    width: 400,
    maxWidth: '92vw',
    boxSizing: 'border-box',
    padding: '28px 24px',
    background: '#fff',
    color: '#241719',
    textAlign: 'center',
    border: '3px solid #c91f2d',
  },
  title: { margin: 0, color: '#c91f2d', fontSize: 28, letterSpacing: 2 },
  sub: { margin: '8px 0 18px', fontSize: 14 },
  problem: { fontSize: 36, fontWeight: 800, margin: '8px 0 14px' },
  input: {
    width: 140,
    padding: '10px',
    fontSize: 20,
    textAlign: 'center',
    border: '2px solid #777',
  },
  button: {
    marginLeft: 8,
    padding: '12px 20px',
    border: 'none',
    background: '#c91f2d',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  notice: { minHeight: 18, margin: '12px 0 0', fontSize: 13, color: '#c91f2d' },
  progress: { marginTop: 6, fontSize: 12, color: '#76585c' },
}

export default function RandomAlarm({ isRunning }) {
  const [ringing, setRinging] = useState(false)
  const [problem, setProblem] = useState(newProblem)
  const [streak, setStreak] = useState(0)
  const [guess, setGuess] = useState('')
  const [notice, setNotice] = useState('')
  const ctxRef = useRef(null)

  function getContext() {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) ctxRef.current = new AC()
    }
    return ctxRef.current
  }

  // Browsers only allow sound after the user has interacted with the page
  useEffect(() => {
    const unlock = () => getContext()?.resume?.()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Schedule the next surprise alarm while a session is running
  useEffect(() => {
    if (!isRunning) {
      setRinging(false)
      return undefined
    }
    if (ringing) return undefined

    const delay = rand(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS) * 1000
    const timeoutId = setTimeout(() => {
      setProblem(newProblem())
      setStreak(0)
      setGuess('')
      setNotice('')
      setRinging(true)
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [isRunning, ringing])

  // Beep loop while ringing
  useEffect(() => {
    if (!ringing) return undefined

    function beep(freq) {
      const ctx = getContext()
      if (!ctx) return
      ctx.resume?.()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.value = 0.12
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    }

    let high = true
    beep(880)
    const intervalId = setInterval(() => {
      high = !high
      beep(high ? 880 : 660)
    }, 400)

    return () => clearInterval(intervalId)
  }, [ringing])

  function submit(event) {
    event.preventDefault()
    if (Number(guess) === problem.answer) {
      if (streak + 1 >= CORRECT_NEEDED) {
        setRinging(false) // alarm stops, next one gets scheduled
      } else {
        setStreak((s) => s + 1)
        setProblem(newProblem())
        setGuess('')
        setNotice('Correct. One more.')
      }
    } else {
      setStreak(0)
      setProblem(newProblem())
      setGuess('')
      setNotice('Wrong. Back to zero. Still ringing.')
    }
  }

  if (!ringing) return null

  return createPortal(
    <div style={styles.overlay} role="alertdialog" aria-modal="true">
      <style>{`@keyframes alarmPulse {
        0%, 100% { background: rgba(201, 31, 45, 0.75); }
        50% { background: rgba(0, 0, 0, 0.75); }
      }`}</style>
      <div style={styles.modal}>
        <h2 style={styles.title}>ALARM</h2>
        <p style={styles.sub}>Solve it to make it stop.</p>
        <div style={styles.problem}>
          {problem.a} × {problem.b} = ?
        </div>
        <form onSubmit={submit}>
          <input
            style={styles.input}
            type="number"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            autoFocus
          />
          <button style={styles.button} type="submit">
            Stop
          </button>
        </form>
        <p style={styles.notice}>{notice}</p>
        <p style={styles.progress}>
          {streak} / {CORRECT_NEEDED} correct in a row
        </p>
      </div>
    </div>,
    document.body
  )
}
