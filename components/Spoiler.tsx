import React from 'react'
import Reveal from './Reveal'

interface SpoilerProps {
  children: React.ReactNode
  /** What the cover says is hidden. Defaults to "Spoiler alert". */
  title?: string
}

/** Blurred until the reader chooses to see it */
const Spoiler: React.FC<SpoilerProps> = ({ children, title = 'Spoiler alert' }) => (
  <Reveal kicker={title} cta="Click to reveal">{children}</Reveal>
)

export default Spoiler
