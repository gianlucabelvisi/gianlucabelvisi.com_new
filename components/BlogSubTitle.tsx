interface BlogSubTitleProps {
  children: React.ReactNode
}

const BlogSubTitle = ({ children }: BlogSubTitleProps) => {
  return (
    <div style={{
      fontSize: '1.2rem',
      fontStyle: 'italic',
      color: '#ff9664',
      textAlign: 'left',
      marginBottom: '1rem'
    }}>
      {children}
    </div>
  )
}

export default BlogSubTitle 