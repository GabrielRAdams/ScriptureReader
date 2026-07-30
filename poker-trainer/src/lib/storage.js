/**
 * Tiny namespaced localStorage wrapper.
 *
 * Progress is the whole point of a study tool, so it has to survive a refresh —
 * but nothing here is worth crashing the app over. Every call is guarded: in
 * private-mode browsers or with storage disabled the trainer simply runs
 * in-memory for the session.
 */
const PREFIX = 'poker-trainer.v1.'

export function loadSlice(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function saveSlice(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — progress just won't persist.
  }
}

export function clearSlice(key) {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    // Nothing to do.
  }
}
