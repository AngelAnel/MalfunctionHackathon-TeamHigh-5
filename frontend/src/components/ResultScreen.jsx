import { createPortal } from 'react-dom'
import './ResultScreen.css'

export default function ResultScreen({ onClose }) {
  return createPortal(
    <div className="result-backdrop">
      <main
        className="result-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-message"
      >
        <div className="result-band" aria-hidden="true" />
        <div className="result-content">
          <section className="result-card">
            <h1 id="result-title">CONGRATULATIONS!</h1>
            <p id="result-message">
              You officially beat
              <br />
              <strong>procrastination.</strong>
              <br />
              Never gonna lock you up :D.
            </p>
            <button type="button" className="result-new-task" onClick={onClose} autoFocus>
              Got a new task?
            </button>
          </section>
        </div>
        <div className="result-band" aria-hidden="true" />
      </main>
    </div>,
    document.body
  )
}