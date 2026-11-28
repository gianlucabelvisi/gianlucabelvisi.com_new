import styles from './GlyphRight.module.css'

/** Right curly quote in the accent colour: opens or closes a quote mid-sentence, also inside <Dialogue> */
export default function GlyphRight() {
  return <span className={styles.glyph}>&rdquo;</span>
}
