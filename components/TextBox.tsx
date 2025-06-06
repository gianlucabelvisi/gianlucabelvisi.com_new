interface TextBoxProps {
  children: React.ReactNode
  title?: string
}

const TextBox = ({ children, title }: TextBoxProps) => {
  return (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderLeft: '3px solid #ff9664', // Orange accent color
      padding: '1rem',
      marginTop: '2rem',
      marginBottom: '2rem'
    }}>
      {title && (
        <div style={{
          textTransform: 'uppercase' as const,
          paddingBottom: '1rem',
          fontWeight: 'bold'
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

export default TextBox 