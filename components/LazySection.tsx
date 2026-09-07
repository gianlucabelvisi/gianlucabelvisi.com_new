import React, { useEffect, useRef, useState } from 'react'

interface LazySectionProps {
  children: React.ReactNode
  /** Placeholder height while the section is off-screen, to avoid layout shift */
  minHeight?: number | string
  /** How far before entering the viewport to start rendering */
  rootMargin?: string
}

/**
 * Defers rendering of its children until they are close to the viewport.
 * Used for below-the-fold homepage sliders so the initial load only fetches
 * the images the reader can actually see. Renders children immediately when
 * IntersectionObserver is unavailable (old browsers, SSR).
 */
export default function LazySection({ children, minHeight = 260, rootMargin = '600px 0px' }: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Browsers without IntersectionObserver render immediately (never on the server)
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined'
  )

  useEffect(() => {
    if (visible) return
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  if (visible) return <>{children}</>

  return <div ref={ref} style={{ minHeight }} aria-hidden="true" />
}
