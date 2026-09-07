/**
 * Lightweight, privacy-friendly "one action per browser" memory for Firebase
 * features (polls, reactions, view counter). Nothing is sent to a server: we
 * just remember in localStorage what this browser already did so a reload
 * can't double-count. It's a courtesy guard, not a security boundary — the
 * database rules in database.rules.json validate shape, not identity.
 */

const PREFIX = 'blog:'

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Has this browser already performed `key` (e.g. "reaction:/my-post:like")? */
export function hasDone(key: string): boolean {
  return storage()?.getItem(PREFIX + key) !== null
}

export function markDone(key: string): void {
  storage()?.setItem(PREFIX + key, String(Date.now()))
}

export function unmarkDone(key: string): void {
  storage()?.removeItem(PREFIX + key)
}

/** The option this browser picked for a poll, or null if it never voted. */
export function getVote(key: string): number | null {
  const raw = storage()?.getItem(PREFIX + key)
  if (raw === null || raw === undefined) return null
  const n = Number(raw)
  return Number.isInteger(n) ? n : null
}

export function rememberVote(key: string, option: number): void {
  storage()?.setItem(PREFIX + key, String(option))
}

/**
 * Should this page load count as a view? True at most once per `windowMs`
 * per post per browser (default 12h), so refreshes don't inflate counters.
 */
export function shouldCountView(postKey: string, windowMs = 12 * 60 * 60 * 1000): boolean {
  const s = storage()
  if (!s) return true
  const key = PREFIX + 'view:' + postKey
  const last = Number(s.getItem(key) || 0)
  const now = Date.now()
  if (now - last < windowMs) return false
  s.setItem(key, String(now))
  return true
}
