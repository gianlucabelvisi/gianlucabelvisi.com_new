import styles from './Embed.module.css'

interface ResponsiveEmbedProps extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, 'src' | 'title'> {
  src: string
  ratio?: string // e.g., "16:9", "4:3"
  title?: string
  /** Break out of the text column, as wide as the page allows */
  fullWidth?: boolean
}

/** Anything embeddable by URL at a fixed aspect ratio: an iframe, or a remote GIF/image */
const ResponsiveEmbed = ({
  src,
  ratio = '16:9',
  title = 'Embedded content',
  fullWidth = false,
  ...iframeProps
}: ResponsiveEmbedProps) => {
  const [w, h] = ratio.split(':').map(Number)
  const wide = fullWidth ? styles.wide : ''

  // Direct image/gif URLs need to be rendered as <img>; otherwise iframes
  // display the image at its native size instead of stretching to fill.
  const isDirectImage = /\.(gif|jpe?g|png|webp|avif)(\?|$)/i.test(src)

  if (isDirectImage) {
    // External GIFs/images: next/image can't optimize arbitrary remote hosts and would
    // freeze animated GIFs, so a plain lazy <img> is the right tool here.
    // The `ratio` prop is only a placeholder to avoid layout shift while loading:
    // `aspect-ratio: auto <ratio>` yields to the image's real ratio once it's decoded,
    // so nothing gets cropped (subtitles in GIFs were being cut off by object-fit: cover).
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        loading="lazy"
        decoding="async"
        className={`${styles.image} ${wide}`}
        style={{ aspectRatio: `auto ${w} / ${h}` }}
      />
    )
  }

  return (
    <div className={`${styles.embed} ${wide}`} style={{ aspectRatio: `${w} / ${h}` }}>
      <iframe src={src} title={title} loading="lazy" {...iframeProps} />
    </div>
  )
}

export default ResponsiveEmbed
