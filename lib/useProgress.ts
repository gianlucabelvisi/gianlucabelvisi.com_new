import { useSyncExternalStore } from 'react'
import { onProgressChange, readProgress, ProgressMap } from './progress'

const EMPTY: ProgressMap = {}
let snapshot: ProgressMap | null = null

function subscribe(listener: () => void) {
  return onProgressChange(() => {
    snapshot = null // re-read on the next getSnapshot
    listener()
  })
}

function getSnapshot(): ProgressMap {
  if (!snapshot) snapshot = readProgress()
  return snapshot
}

/**
 * The reader's progress through every post they've opened, live.
 * Empty during server rendering and hydration, so anything built on it should render nothing extra at first.
 */
export function useProgress(): ProgressMap {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
}
