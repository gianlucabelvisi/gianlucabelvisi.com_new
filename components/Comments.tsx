import { useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import styles from './Comments.module.css'

const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID

export const commentsEnabled = Boolean(REPO && REPO_ID && CATEGORY && CATEGORY_ID)

interface CommentsProps {
  /** Post path, used as the discussion term so URL changes don't orphan threads */
  term: string
}

/**
 * Giscus comments (GitHub Discussions). Renders nothing unless all
 * NEXT_PUBLIC_GISCUS_* variables are set — see .env.example.
 */
export default function Comments({ term }: CommentsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const host = ref.current
    if (!commentsEnabled || !host || host.hasChildNodes()) return

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    const attrs: Record<string, string> = {
      'data-repo': REPO!,
      'data-repo-id': REPO_ID!,
      'data-category': CATEGORY!,
      'data-category-id': CATEGORY_ID!,
      'data-mapping': 'specific',
      'data-term': term,
      'data-strict': '1',
      'data-reactions-enabled': '0', // we have our own
      'data-emit-metadata': '0',
      'data-input-position': 'top',
      'data-theme': theme === 'dark' ? 'dark_dimmed' : 'light',
      'data-lang': 'en',
      'data-loading': 'lazy',
    }
    Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v))
    host.appendChild(script)
    // theme changes are handled by the postMessage effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  // Sync theme with the site toggle without reloading the widget
  useEffect(() => {
    const iframe = ref.current?.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
    iframe?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: theme === 'dark' ? 'dark_dimmed' : 'light' } } },
      'https://giscus.app'
    )
  }, [theme])

  if (!commentsEnabled) return null

  return (
    <section className={styles.comments} aria-labelledby="comments-heading">
      <h2 id="comments-heading" className={styles.heading}>Comments</h2>
      <p className={styles.hint}>Powered by GitHub Discussions — sign in with GitHub to join in.</p>
      <div ref={ref} className="giscus" />
    </section>
  )
}
