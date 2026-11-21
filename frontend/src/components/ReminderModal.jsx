import { useEffect, useRef } from 'react'

function ReminderModal({ open, message, onAcknowledge }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="reminder-dialog"
      aria-labelledby="reminder-dialog-title"
      aria-describedby="reminder-dialog-message"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="reminder-dialog-content">
        <p className="reminder-dialog-kicker">FOCUS SESSION REMINDER</p>
        <h2 id="reminder-dialog-title">Back to your task.</h2>
        <p className="reminder-dialog-message" id="reminder-dialog-message">
          {message}
        </p>
        <button type="button" onClick={onAcknowledge} autoFocus>
          Acknowledge and continue
        </button>
      </div>
    </dialog>
  )
}

export default ReminderModal