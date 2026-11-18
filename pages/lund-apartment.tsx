import { useRef } from 'react'
import SEO from '../components/SEO'
import BlogMenu from '../components/BlogMenu'
import styles from '../styles/Apartment.module.css'

/**
 * 3D walkthrough of my old flat in Lund (Rådmansgatan 1A).
 * The viewer is a self-contained three.js page in public/lund-walkthrough/, built from the broker's plan,
 * the listing photos and OpenStreetMap via lund-src/; this route frames it under the site header.
 * Phones: the walkthrough takes the whole screen; its quick bar's Blog button opens the blog menu (components/BlogMenu.tsx).
 */
export default function LundApartment() {
  const frame = useRef<HTMLIFrameElement>(null)
  return (
    <div className={`${styles.page} ${styles.immersive}`}>
      <SEO
        title="Lund apartment"
        description="Walk through my old flat in Lund in 3D: built from the floor plan and the listing photos, with the block, the courtyard and the light of the day."
        path="/lund-apartment"
        noindex
      />
      <iframe
        ref={frame}
        className={styles.frame}
        src="/lund-walkthrough/index.html"
        title="3D walkthrough of the Lund apartment"
        allow="fullscreen"
        allowFullScreen
      />
      <BlogMenu frame={frame} back="Back to the flat" />
    </div>
  )
}
