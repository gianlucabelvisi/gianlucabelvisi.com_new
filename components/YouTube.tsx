import styles from './Embed.module.css'

interface YouTubeProps {
  source: string // YouTube video ID
}

/** A YouTube video at 16:9. The player only loads as it nears the screen. */
const YouTube = ({ source }: YouTubeProps) => (
  <div className={styles.embed} style={{ aspectRatio: '16 / 9' }}>
    <iframe
      src={`https://www.youtube.com/embed/${source}`}
      title="YouTube video player"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
)

export default YouTube
