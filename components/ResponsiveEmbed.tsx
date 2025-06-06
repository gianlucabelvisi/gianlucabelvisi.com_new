interface ResponsiveEmbedProps {
  src: string
  ratio?: string // e.g., "16:9", "4:3"
  title?: string
  [key: string]: any // Allow other iframe props
}

const ResponsiveEmbed = ({ 
  src, 
  ratio = '16:9', 
  title = 'Embedded content',
  ...iframeProps 
}: ResponsiveEmbedProps) => {
  // Turn "16:9" into "9 / 16" into "56.25%"
  // Turn "4:3" into "3 / 4" into "75%"
  const ratioToPercent = (ratio: string): string => {
    const [w, h] = ratio.split(':').map(num => Number(num))
    return `${(h / w) * 100}%`
  }

  const paddingBottom = ratioToPercent(ratio)

  return (
    <div style={{
      position: 'relative',
      height: 0,
      overflow: 'hidden',
      maxWidth: '100%',
      marginBottom: '2rem',
      paddingBottom
    }}>
      <iframe
        src={src}
        title={title}
        frameBorder="0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
        {...iframeProps}
      />
    </div>
  )
}

export default ResponsiveEmbed 