import { useRef } from 'react'
import SEO from '../components/SEO'
import BlogMenu from '../components/BlogMenu'
import styles from '../styles/Apartment.module.css'

/**
 * 3D map of Pantelleria (cel-shaded, Google-Maps-style navigation).
 * The viewer is a self-contained three.js page in public/pantelleria-3d/, built from real data
 * (TINITALY DEM, OpenStreetMap, Sentinel-2) via pantelleria-src/; this route frames it under the site header.
 * Phones: the map takes the whole screen; its ☰ button opens the blog menu (components/BlogMenu.tsx).
 */
export default function Pantelleria() {
  const frame = useRef<HTMLIFrameElement>(null)
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
      <BlogMenu frame={frame} />
    </div>
  )
}
