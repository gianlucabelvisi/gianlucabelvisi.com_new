import styles from './GlyphLeft.module.css'

/** Left curly quote in the accent colour: opens or closes a quote mid-sentence, also inside <Dialogue> */
export default function GlyphLeft() {
  return <span className={styles.glyph}>&ldquo;</span>
}
