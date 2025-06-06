import GlyphLeft from './GlyphLeft'
import GlyphRight from './GlyphRight'

interface DialogueProps {
  children: React.ReactNode
}

const Dialogue = ({ children }: DialogueProps) => {
  return (
    <p style={{ 
      margin: '0 0 1rem 0',
      lineHeight: '1.9rem'
    }}>
      <GlyphLeft />
      {children}
      <GlyphRight />
    </p>
  )
}

export default Dialogue 