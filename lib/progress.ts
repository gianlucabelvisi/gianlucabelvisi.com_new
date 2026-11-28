/**
 * Reading progress, kept in this browser only (localStorage). It powers the "Pick up where you left off"
 * row and the progress bars on cards. Nothing is sent anywhere.
 */

const KEY = 'blog-progress'
const EVENT = 'blog-progress-change'
/** Below this a post counts as merely opened; above FINISHED it counts as read */
export const STARTED = 0.05
export const FINISHED = 0.9
const MAX_ENTRIES = 60

export interface ProgressEntry {
  /** 0..1, the furthest point reached */
  p: number
  /** Last visit, ms since epoch */
  t: number
}

export type ProgressMap = Record<string, ProgressEntry>

export function readProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as ProgressMap) : {}
  } catch {
    return {}
  }
}

/** Record how far into a post the reader got. Progress only ever grows; the timestamp always updates. */
export function saveProgress(slug: string, progress: number): void {
  if (typeof window === 'undefined') return
  try {
    const map = readProgress()
    const p = Math.max(map[slug]?.p ?? 0, Math.min(1, Math.max(0, progress)))
    map[slug] = { p: Math.round(p * 1000) / 1000, t: Date.now() }
    // Keep the newest entries only, so the record can't grow without bound
    const trimmed = Object.fromEntries(
      Object.entries(map).sort((a, b) => b[1].t - a[1].t).slice(0, MAX_ENTRIES)
    )
    window.localStorage.setItem(KEY, JSON.stringify(trimmed))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* private mode or a full disk: reading still works, it just isn't remembered */
  }
}

/** Call `listener` whenever progress changes, in this tab or another. Returns the unsubscribe function. */
export function onProgressChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) listener() }
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
