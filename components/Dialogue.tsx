import GlyphLeft from './GlyphLeft'
import GlyphRight from './GlyphRight'

interface DialogueProps {
  children: React.ReactNode
}

const Dialogue = ({ children }: DialogueProps) => {
  return (
    <span style={{ 
      display: 'inline',
      lineHeight: '1.9rem'
    }}>
      <GlyphLeft />{' '}{children}{' '}<GlyphRight />
    </span>
  )
}

export default Dialogue 