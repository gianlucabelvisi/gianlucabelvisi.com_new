import React from 'react'
import Reveal from '../Reveal'

interface NsfwProps {
  children: React.ReactNode
}

/** Like a spoiler, behind a darker cover and a sterner warning */
const Nsfw: React.FC<NsfwProps> = ({ children }) => (
  <Reveal tone="ink" kicker="NSFW" cta="Click at your own peril">{children}</Reveal>
)

export default Nsfw
