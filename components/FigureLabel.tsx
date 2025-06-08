interface FigureLabelProps {
  children: React.ReactNode
}

const FigureLabel = ({ children }: FigureLabelProps) => {
  return (
    <span style={{
      display: 'block',
      width: '100%',
      textAlign: 'center',
      marginBottom: '2rem',
      marginTop: '0.5rem',
      paddingLeft: '4rem',
      paddingRight: '4rem',
      textWrap: 'balance' as any // TypeScript doesn't know about this CSS property yet
    }}>
      <em>{children}</em>
    </span>
  )
}

export default FigureLabel 