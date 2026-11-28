import styles from './FigureLabel.module.css'

interface FigureLabelProps {
  children: React.ReactNode
  /** Anchor stamped at build time (lib/captions.ts) so a caption can be linked to directly */
  id?: string
}

/** The caption under an image. Often where the joke is. */
const FigureLabel = ({ children, id }: FigureLabelProps) => (
  <span id={id} className={styles.label}>
    <em>{children}</em>
  </span>
)

export default FigureLabel
