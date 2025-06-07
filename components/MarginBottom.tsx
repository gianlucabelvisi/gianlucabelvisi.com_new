interface MarginBottomProps {
  size: string
}

const MarginBottom = ({ size }: MarginBottomProps) => {
  return (
    <div style={{ marginBottom: size }} />
  )
}

export default MarginBottom 