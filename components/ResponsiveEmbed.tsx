interface ResponsiveEmbedProps extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, 'src' | 'title'> {
  src: string
  ratio?: string // e.g., "16:9", "4:3"
  title?: string
  fullWidth?: boolean
}

const ResponsiveEmbed = ({ 
  src, 
  ratio = '16:9', 
  title = 'Embedded content',
  fullWidth = false,
  ...iframeProps 
}: ResponsiveEmbedProps) => {
  // Turn "16:9" into "9 / 16" into "56.25%"
  // Turn "4:3" into "3 / 4" into "75%"
  const ratioToPercent = (ratio: string): string => {
    const [w, h] = ratio.split(':').map(num => Number(num))
    return `${(h / w) * 100}%`
  }

  // Direct image/gif URLs need to be rendered as <img>; otherwise iframes
  // display the image at its native size instead of stretching to fill.
  const isDirectImage = /\.(gif|jpe?g|png|webp|avif)(\?|$)/i.test(src)

  const breakout = fullWidth && {
    // Break out to match feature image width (grid columns 3-12)
    // Content is in columns 4-11, so we need to expand 1 column left and right
    width: 'calc(100% + 8.4rem + 4rem)', // Add column width + gaps on each side
    marginLeft: 'calc(-4.2rem - 2rem)', // Pull left by one column + gap
    marginRight: 'calc(-4.2rem - 2rem)' // Pull right by one column + gap
  }

  if (isDirectImage) {
    // External GIFs/images: next/image can't optimize arbitrary remote hosts and would
    // freeze animated GIFs, so a plain lazy <img> is the right tool here.
    // The `ratio` prop is only a placeholder to avoid layout shift while loading —
    // `aspect-ratio: auto <ratio>` yields to the image's real ratio once it's decoded,
    // so nothing gets cropped (subtitles in GIFs were being cut off by object-fit: cover).
    const [w, h] = ratio.split(':')
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        loading="lazy"
        decoding="async"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          aspectRatio: `auto ${w} / ${h}`,
          ...breakout,
        }}
      />
    )
  }

  const paddingBottom = ratioToPercent(ratio)

  return (
    <div style={{
      position: 'relative',
      height: 0,
      overflow: 'hidden',
      width: '100%',
      marginBottom: '2rem',
      paddingBottom,
      ...breakout,
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