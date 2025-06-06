interface YouTubeProps {
  source: string // YouTube video ID
}

const YouTube = ({ source }: YouTubeProps) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      paddingBottom: '56.25%', // 16:9 aspect ratio (9/16 = 0.5625)
      overflow: 'hidden',
      height: 0,
      maxWidth: '100%',
      marginBottom: '1rem'
    }}>
      <iframe
        src={`https://www.youtube.com/embed/${source}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

export default YouTube 