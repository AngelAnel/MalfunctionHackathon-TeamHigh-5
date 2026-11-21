
const SOURCE = 'minute-reminder'

export function isExtensionPresent() {
  return document.documentElement.dataset.minuteReminderExt === '1'
}

export function startLock({ startTime, endTime }) {
  window.postMessage({ source: SOURCE, type: 'START_LOCK', startTime, endTime }, window.location.origin)
}

export function endLock() {
  window.postMessage({ source: SOURCE, type: 'END_LOCK' }, window.location.origin)
}