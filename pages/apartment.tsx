import { useEffect, useRef } from 'react'
import SEO from '../components/SEO'
import styles from '../styles/Apartment.module.css'

/**
 * 3D walkthrough of the Copenhagen apartment.
 * The viewer is a self-contained three.js page in public/walkthrough/ (built from the
 * Blender model); this route frames it under the site header.
 */
export default function Apartment() {
  // a shared layout link (/apartment#s=...) is handed on to the viewer, which opens that layout
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => { if (frame.current) frame.current.src = `/walkthrough/index.html${window.location.hash}` }, [])
  return (
    <div className={styles.page}>
      <SEO
        title="Apartment"
        description="Walk through my Copenhagen apartment in 3D: built in Blender from the floor plan, with photos, renders and real measurements."
        path="/apartment"
        noindex
      />
      <iframe
        ref={frame}
        className={styles.frame}
        title="3D walkthrough of the apartment"
        allow="fullscreen"
        allowFullScreen
      />
    </div>
  )
}
