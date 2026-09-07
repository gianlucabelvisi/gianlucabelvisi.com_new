import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from './RouteProgress.module.css'

type Phase = 'idle' | 'loading' | 'done'

/**
 * Thin progress bar under the header while a client-side navigation is in flight,
 * so a click on a card gives immediate feedback even when the next page takes a
 * moment to fetch. Hash-only changes and shallow updates are ignored.
 */
export default function RouteProgress() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [run, setRun] = useState(0)

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    const start = (_url: string, { shallow }: { shallow: boolean }) => {
      if (shallow) return
      clearTimeout(hideTimer)
      // Small delay so instant navigations (prefetched) never flash the bar
      showTimer = setTimeout(() => {
        setRun(n => n + 1)
        setPhase('loading')
      }, 120)
    }

    const finish = () => {
      clearTimeout(showTimer)
      setPhase(current => (current === 'loading' ? 'done' : current))
      hideTimer = setTimeout(() => setPhase('idle'), 400)
    }

    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', finish)
    router.events.on('routeChangeError', finish)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', finish)
      router.events.off('routeChangeError', finish)
    }
  }, [router.events])

  if (phase === 'idle') return null

  return (
    <div
      key={run}
      className={`${styles.bar} ${phase === 'done' ? styles.done : ''}`}
      role="progressbar"
      aria-label="Loading page"
      aria-valuetext={phase === 'done' ? 'Loaded' : 'Loading'}
    />
  )
}
