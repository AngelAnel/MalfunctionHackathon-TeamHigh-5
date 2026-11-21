import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/* ---------- TWEAK THESE TO CHANGE HOW EVIL IT IS ---------- */
const MIN_ROUNDS = 5
const MAX_ROUNDS = 7
const COOLDOWN_SECONDS = 2 // Yes is locked this long every round
const DODGES_PER_ROUND = 2 // times Yes runs away from the cursor each round
const FINAL_PHRASE = 'i am done' // typed on the last round (case-insensitive)
/* ---------------------------------------------------------- */

const QUESTIONS = [
  'Are you sure you are done?',
  'Really sure?',
  'Like, 100% sure?',
  'Your future self is watching. Still sure?',
  'Did you double-check everything?',
  'Are you NOT unfinished? (Think about it.)',
  'Cross your heart?',
]
const FINAL_QUESTION = 'Last chance. Are you REALLY done?'

const MODAL_W = 440
const MODAL_H = 310
const TOPS = [120, 170, 220]
const LEFTS = [16, 150, 284]
const BTN_H = 38

const rand = (n) => Math.floor(Math.random() * n)
const randomRounds = () => MIN_ROUNDS + rand(MAX_ROUNDS - MIN_ROUNDS + 1)

// Yes shrinks, No grows as rounds go on
function widths(round) {
  return {
    yes: Math.max(56, 120 - round * 10),
    no: Math.min(200, 120 + round * 14),
  }
}

function place(row, col, width) {
  return { top: TOPS[row], left: Math.min(LEFTS[col], MODAL_W - 20 - width) }
}

// Yes and No always land on different rows so they never overlap
function pickLayout(round) {
  const w = widths(round)
  const yesRow = rand(3)
  let noRow = rand(3)
  while (noRow === yesRow) noRow = rand(3)
  return {
    yes: place(yesRow, rand(3), w.yes),
    no: place(noRow, rand(3), w.no),
    yesRow,
    noRow,
  }
}

function moveYes(layout, round) {
  const w = widths(round)
  let yesRow = rand(3)
  while (yesRow === layout.noRow) yesRow = rand(3)
  return { ...layout, yes: place(yesRow, rand(3), w.yes), yesRow }
}

const styles = {
  doneButton: (enabled) => ({
    width: '100%',
    marginTop: 20,
    padding: '16px 0',
    border: 'none',
    background: enabled ? '#c81e2b' : '#9a9a9a',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: enabled ? 'pointer' : 'not-allowed',
  }),
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 2147483647,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
  },
  modal: {
    position: 'relative',
    width: MODAL_W,
    height: MODAL_H,
    maxWidth: '92vw',
    boxSizing: 'border-box',
    padding: 20,
    background: '#d9d9d9',
    color: '#111',
    fontFamily: 'inherit',
  },
  x: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    border: 'none',
    background: '#777',
    color: '#fff',
    cursor: 'not-allowed',
  },
  question: {
    margin: '24px 0 0',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 600,
  },
  notice: {
    margin: '6px 0 0',
    textAlign: 'center',
    fontSize: 13,
    color: '#c81e2b',
    minHeight: 16,
  },
  phraseWrap: {
    position: 'absolute',
    top: 78,
    left: 16,
    right: 16,
    textAlign: 'center',
    fontSize: 13,
  },
  phraseInput: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    marginTop: 4,
    padding: '6px 8px',
    border: '1px solid #777',
    fontSize: 14,
  },
  choice: (pos, width, { bg, disabled, fontSize = 14 }) => ({
    position: 'absolute',
    top: pos.top,
    left: pos.left,
    width,
    height: BTN_H,
    border: 'none',
    background: disabled ? '#aaa' : bg,
    color: '#fff',
    fontSize,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'top 0.12s, left 0.12s',
  }),
  congrats: { height: 'auto', textAlign: 'center', padding: '32px 24px' },
  close: {
    marginTop: 12,
    padding: '10px 28px',
    border: 'none',
    background: '#c81e2b',
    color: '#fff',
    cursor: 'pointer',
  },
}

export default function DoneFlow({ allDone, onConfirmed }) {
  // stage: 'idle' | 'confirm' | 'congrats'
  const [stage, setStage] = useState('idle')
  const [round, setRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(MIN_ROUNDS)
  const [layout, setLayout] = useState(() => pickLayout(0))
  const [cooldown, setCooldown] = useState(0)
  const [dodges, setDodges] = useState(DODGES_PER_ROUND)
  const [phrase, setPhrase] = useState('')
  const [notice, setNotice] = useState('')

  const isFinalRound = round === totalRounds - 1
  const w = widths(round)
  const phraseOk = !isFinalRound || phrase.trim().toLowerCase() === FINAL_PHRASE
  const yesLocked = cooldown > 0 || !phraseOk

  // No escape: swallow the Esc key while the confirm overlay is open
  useEffect(() => {
    if (stage !== 'confirm') return undefined
    const block = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', block, true)
    return () => window.removeEventListener('keydown', block, true)
  }, [stage])

  // Cooldown countdown
  useEffect(() => {
    if (stage !== 'confirm' || cooldown <= 0) return undefined
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [stage, cooldown])

  function startRound(nextRound) {
    setRound(nextRound)
    setLayout(pickLayout(nextRound))
    setCooldown(COOLDOWN_SECONDS)
    setDodges(DODGES_PER_ROUND)
    setPhrase('')
  }

  function openConfirm() {
    setTotalRounds(randomRounds())
    setNotice('')
    startRound(0)
    setStage('confirm')
  }

  function handleYes() {
    if (yesLocked) return
    setNotice('')
    if (round + 1 >= totalRounds) {
      onConfirmed()
      setStage('congrats')
    } else {
      startRound(round + 1)
    }
  }

  // "No" is not an exit. It restarts everything with a fresh round count.
  function handleNo() {
    setTotalRounds(randomRounds())
    setNotice('Wrong answer. Starting over.')
    startRound(0)
  }

  // Yes runs away from the cursor a few times per round
  function handleYesHover() {
    if (dodges <= 0) return
    setDodges((d) => d - 1)
    setLayout((l) => moveYes(l, round))
  }

  const question = isFinalRound ? FINAL_QUESTION : QUESTIONS[round % QUESTIONS.length]

  return (
    <>
      <button
        type="button"
        style={styles.doneButton(allDone)}
        onClick={openConfirm}
        disabled={!allDone}
        title={allDone ? '' : 'Finish all tasks first'}
      >
        Done?
      </button>

      {stage === 'confirm' &&
        createPortal(
          <div style={styles.overlay} role="alertdialog" aria-modal="true">
            <div style={styles.modal}>
              <button type="button" style={styles.x} disabled aria-label="Close disabled">
                x
              </button>

              <p style={styles.question}>{question}</p>
              <p style={styles.notice}>{notice}</p>

              {isFinalRound && (
                <label style={styles.phraseWrap}>
                  Type "{FINAL_PHRASE}" to unlock Yes
                  <input
                    style={styles.phraseInput}
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </label>
              )}

              <button
                type="button"
                style={styles.choice(layout.yes, w.yes, { bg: '#777', disabled: yesLocked })}
                onMouseEnter={handleYesHover}
                onClick={handleYes}
              >
                {cooldown > 0 ? `Yes (${cooldown})` : 'Yes'}
              </button>

              <button
                type="button"
                style={styles.choice(layout.no, w.no, {
                  bg: '#555',
                  disabled: false,
                  fontSize: 14 + round,
                })}
                onClick={handleNo}
              >
                No
              </button>
            </div>
          </div>,
          document.body
        )}

      {stage === 'congrats' &&
        createPortal(
          <div style={styles.overlay} role="dialog" aria-modal="true">
            <div style={{ ...styles.modal, ...styles.congrats }}>
              <h2>Congratulations!</h2>
              <p>You finished everything on your list. You are free to go.</p>
              <button type="button" style={styles.close} onClick={() => setStage('idle')}>
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
