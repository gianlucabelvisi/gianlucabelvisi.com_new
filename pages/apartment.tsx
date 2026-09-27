import SEO from '../components/SEO'
import styles from '../styles/Apartment.module.css'

/**
 * 3D walkthrough of the Copenhagen apartment.
 * The viewer is a self-contained three.js page in public/walkthrough/ (built from the
 * Blender model); this route frames it under the site header.
 */
export default function Apartment() {
  return (
    <div className={styles.page}>
      <SEO
        title="Apartment"
        description="Walk through my Copenhagen apartment in 3D: built in Blender from the floor plan, with photos, renders and real measurements."
        path="/apartment"
        noindex
      />
      <iframe
        className={styles.frame}
        src="/walkthrough/index.html"
        title="3D walkthrough of the apartment"
        allow="fullscreen"
        allowFullScreen
      />
    </div>
  )
}
