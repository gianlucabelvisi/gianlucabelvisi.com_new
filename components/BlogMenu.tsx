import { useEffect, useRef, useState, type RefObject } from 'react'
import Link from 'next/link'
import { FiHome, FiCompass, FiBox, FiSearch, FiMap } from 'react-icons/fi'
import styles from './BlogMenu.module.css'

/** The blog's sections, as in the phone tab bar (components/Header.tsx) */
const LINKS = [
  { label: 'Home', href: '/', icon: FiHome },
  { label: 'Browse', href: '/archive', icon: FiCompass },
  { label: 'Projects', href: '/projects', icon: FiBox },
  { label: 'Search', href: '/search', icon: FiSearch },
]

/**
 * Phones: the project viewers (Pantelleria, the two apartments) take the whole screen over the site header and footer
 * (Apartment.module.css .immersive). The viewer's own button posts {type: 'project:menu'} (Pantelleria's map:
 * 'pantelleria:menu') to the page, and this opens the blog menu as a bottom sheet.
 */
export default function BlogMenu({ frame, back = 'Back to the map' }: { frame: RefObject<HTMLIFrameElement | null>; back?: string }) {
  const first = useRef<HTMLAnchorElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return
      const type = e.data && e.data.type
      if (type === 'project:menu' || type === 'pantelleria:menu') setOpen(true)
    }
    window.addEventListener('message', onMessage)
    // phones: nothing scrolls behind the full-screen viewer (see globals.css)
    document.documentElement.classList.add('viewer-immersive')
    return () => {
      window.removeEventListener('message', onMessage)
      document.documentElement.classList.remove('viewer-immersive')
    }
  }, [frame])

  useEffect(() => {
    if (!open) return
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  const close = () => { setOpen(false); frame.current?.focus() }

  return (
    <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Blog menu">
      <button className={styles.backdrop} aria-label={back} tabIndex={-1} onClick={close} />
      <div className={styles.card}>
        <nav className={styles.grid} aria-label="Sections">
          {LINKS.map(({ label, href, icon: Icon }, i) => (
            <Link key={href} href={href} className={styles.item} ref={i === 0 ? first : undefined}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <button className={styles.back} onClick={close}>
          <FiMap aria-hidden="true" /> {back}
        </button>
      </div>
    </div>
  )
}
