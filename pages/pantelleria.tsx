import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FiHome, FiArchive, FiTag, FiGrid, FiSearch, FiMap } from 'react-icons/fi'
import SEO from '../components/SEO'
import styles from '../styles/Apartment.module.css'
import menu from '../styles/PantelleriaMenu.module.css'

/** The blog's sections, as in the phone tab bar (components/Header.tsx) */
const LINKS = [
  { label: 'Home', href: '/', icon: FiHome },
  { label: 'Archive', href: '/archive', icon: FiArchive },
  { label: 'Tags', href: '/tags', icon: FiTag },
  { label: 'Projects', href: '/projects', icon: FiGrid },
  { label: 'Search', href: '/search', icon: FiSearch },
]

/**
 * 3D map of Pantelleria (cel-shaded, Google-Maps-style navigation).
 * The viewer is a self-contained three.js page in public/pantelleria-3d/, built from real data
 * (TINITALY DEM, OpenStreetMap, Sentinel-2) via pantelleria-src/; this route frames it under the site header.
 * Phones: the map takes the whole screen; its ☰ button posts {type: 'pantelleria:menu'} and this page opens the blog menu.
 */
export default function Pantelleria() {
  const frame = useRef<HTMLIFrameElement>(null)
  const first = useRef<HTMLAnchorElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return
      if (e.data && e.data.type === 'pantelleria:menu') setOpen(true)
    }
    window.addEventListener('message', onMessage)
    // phones: nothing scrolls behind the full-screen map (see globals.css)
    document.documentElement.classList.add('map-immersive')
    return () => {
      window.removeEventListener('message', onMessage)
      document.documentElement.classList.remove('map-immersive')
    }
  }, [])

  useEffect(() => {
    if (!open) return
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => { setOpen(false); frame.current?.focus() }

  return (
    <div className={`${styles.page} ${styles.immersive}`}>
      <SEO
        title="Pantelleria 3D"
        description="Pantelleria in 3D: the real terrain, roads and every dammuso, cel-shaded and explorable like a map."
        path="/pantelleria"
        noindex
      />
      <iframe
        ref={frame}
        className={styles.frame}
        src="/pantelleria-3d/index.html"
        title="3D map of Pantelleria"
        allow="fullscreen; accelerometer; gyroscope"
        allowFullScreen
      />
      {open && (
        <div className={menu.sheet} role="dialog" aria-modal="true" aria-label="Blog menu">
          <button className={menu.backdrop} aria-label="Back to the map" tabIndex={-1} onClick={close} />
          <div className={menu.card}>
            <nav className={menu.grid} aria-label="Sections">
              {LINKS.map(({ label, href, icon: Icon }, i) => (
                <Link key={href} href={href} className={menu.item} ref={i === 0 ? first : undefined}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            <button className={menu.back} onClick={close}>
              <FiMap aria-hidden="true" /> Back to the map
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
