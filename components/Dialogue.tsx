interface DialogueProps {
  children: React.ReactNode
  withQuotesBegin?: boolean
  withQuotesEnd?: boolean
}

const Dialogue = ({ children, withQuotesBegin = true, withQuotesEnd = true }: DialogueProps) => {
  return (
    <span style={{ 
      display: 'inline-block',
      lineHeight: '1.6',
      marginBottom: withQuotesEnd ? '1rem' : '1rem',
      width: '100%'
    }}>
      {withQuotesBegin && (
        <span style={{ 
          color: '#ff9664',
          whiteSpace: 'nowrap',
          fontSize: '1.2rem',
          marginRight: '0.2rem'
        }}>
          ❝
        </span>
      )}
      {children}
      {withQuotesEnd && (
        <span style={{ 
          color: '#ff9664',
          whiteSpace: 'nowrap',
          fontSize: '1.2rem',
          marginLeft: '0.2rem'
        }}>
          ❞
        </span>
      )}
    </span>
  )
}

export default Dialogue 