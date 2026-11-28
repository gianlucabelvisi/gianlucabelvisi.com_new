import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import styles from './Shelf.module.css'

// Touch physics, tuned to feel like an iOS UIScrollView. Units are px and ms.
const DECELERATION_TAU = 325 // time constant of the momentum glide after a flick
const RUBBER_BAND_COEFF = 0.55 // iOS's rubber-band constant: resistance when pulled past an edge
const BOUNCE_OMEGA = 0.016 // spring stiffness pulling the row back from past an edge
const SETTLE_OMEGA = 0.013 // spring stiffness for snaps from rest and arrow-button scrolls
const MAX_EDGE_VELOCITY = 3 // caps how far a hard flick can overshoot an edge
const MAX_VELOCITY = 8
const VELOCITY_WINDOW = 100 // touch history used to estimate the release velocity
const CATCH_VELOCITY = 0.1 // a touch that lands on a row moving faster than this just stops it

// Frame clock, kept outside the component: only ever called from handlers and rAF
const now = () => performance.now()

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// Past an edge the row moves less and less per px of finger travel, approaching `dimension`
const rubberBand = (overflow: number, dimension: number) =>
  Math.sign(overflow) * (1 - 1 / ((Math.abs(overflow) * RUBBER_BAND_COEFF) / dimension + 1)) * dimension

const inverseRubberBand = (offset: number, dimension: number) => {
  const ratio = Math.min(Math.abs(offset) / dimension, 0.99)
  return Math.sign(offset) * (dimension / RUBBER_BAND_COEFF) * (1 / (1 - ratio) - 1)
}

type Motion = { mode: 'decay' } | { mode: 'spring'; target: number; omega: number }

interface ShelfProps {
  title: string
  /** A few quiet words after the title */
  hint?: string
  /** Optional "See all" destination shown next to the title */
  moreHref?: string
  moreLabel?: string
  /** The cards. Each direct child is one stop of the row; any card shape works. */
  children: React.ReactNode
}

/**
 * A horizontally scrolling row of cards: the homepage's building block.
 * Touch gets iOS-style momentum, rubber-banding and snap-to-card; a trackpad or shift+wheel scrolls it directly;
 * the arrows and the keyboard page through it. The row is moved with a transform (never native scroll), so cards
 * can lift on hover without being clipped.
 */
export default function Shelf({ title, hint, moreHref, moreLabel = 'See all', children }: ShelfProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Drag state lives in refs: the frame loop and the touch handlers must never see stale values
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const directionRef = useRef<'none' | 'horizontal' | 'vertical'>('none')
  const wasHorizontalDragRef = useRef(false)
  // Live position is written straight to the DOM each frame; React state only catches up when the row comes to rest
  const positionRef = useRef(0)
  const targetRef = useRef(0)
  const velocityRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const dragStartRawRef = useRef(0)
  const samplesRef = useRef<{ t: number; x: number }[]>([])
  const boundsRef = useRef({ min: 0, width: 1 })
  const wheelIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const count = React.Children.count(children)

  // Card width + gap, measured from the DOM so it always matches the CSS breakpoints and the card shape
  const getStep = (): number => {
    const cards = trackRef.current?.children
    if (cards && cards.length > 1) {
      return (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft
    }
    return (cards?.[0] as HTMLElement | undefined)?.offsetWidth ?? 300
  }

  // Furthest (negative) translate: the row's real overflow beyond the visible width
  const getMaxTranslate = (): number => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return 0
    return Math.min(0, viewport.clientWidth - track.scrollWidth)
  }

  const setPosition = (x: number) => {
    positionRef.current = x
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${x}px, 0, 0)`
  }

  const syncRestingState = (x: number) => {
    const max = getMaxTranslate()
    setCanScrollLeft(x < -1)
    setCanScrollRight(x > max + 1)
  }

  const stopMotion = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    velocityRef.current = 0
  }

  // Frame loop: 'decay' glides with exponentially falling velocity (only used when the
  // glide will run past an edge, where it hands over to a bounce spring); 'spring' is a
  // critically damped spring, solved in closed form per frame so it stays stable at any fps
  const runMotion = (initial: Motion, initialVelocity: number) => {
    stopMotion()
    let motion = initial
    let v = initialVelocity
    let last = now()
    const min = boundsRef.current.min
    if (motion.mode === 'spring') targetRef.current = motion.target

    const step = (frameTime: number) => {
      const dt = Math.min(frameTime - last, 32)
      last = frameTime
      let x = positionRef.current

      if (motion.mode === 'decay') {
        v *= Math.exp(-dt / DECELERATION_TAU)
        x += v * dt
        if (x > 0 || x < min) {
          const edge = x > 0 ? 0 : min
          motion = { mode: 'spring', target: edge, omega: BOUNCE_OMEGA }
          targetRef.current = edge
          v = clamp(v, -MAX_EDGE_VELOCITY, MAX_EDGE_VELOCITY)
        }
      } else {
        const { target, omega } = motion
        const c1 = x - target
        const c2 = v + omega * c1
        const decay = Math.exp(-omega * dt)
        x = target + (c1 + c2 * dt) * decay
        v = (c2 - omega * (c1 + c2 * dt)) * decay
        if (Math.abs(x - target) < 0.3 && Math.abs(v) < 0.01) {
          setPosition(target)
          stopMotion()
          syncRestingState(target)
          return
        }
      }

      setPosition(x)
      velocityRef.current = v
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // Finger lifted: bounce back if past an edge, glide into the edge if the flick carries
  // that far, otherwise glide to the card nearest where momentum would naturally stop
  const release = (velocity: number) => {
    const { min } = boundsRef.current
    const x = positionRef.current

    if (x > 0 || x < min) {
      runMotion({ mode: 'spring', target: x > 0 ? 0 : min, omega: BOUNCE_OMEGA }, clamp(velocity, -MAX_EDGE_VELOCITY, MAX_EDGE_VELOCITY))
      return
    }

    const projected = x + velocity * DECELERATION_TAU
    if (projected > 0 || projected < min) {
      runMotion({ mode: 'decay' }, velocity)
      return
    }

    const stepWidth = getStep()
    const target = clamp(Math.round(projected / stepWidth) * stepWidth, min, 0)
    const distance = target - x
    // Matching omega to velocity/distance makes the spring a pure exponential glide that
    // lands exactly on the card, so the snap feels like natural deceleration
    const omega = Math.abs(distance) > 1 && Math.sign(distance) === Math.sign(velocity)
      ? clamp(Math.abs(velocity / distance), 0.0025, 0.02)
      : SETTLE_OMEGA
    runMotion({ mode: 'spring', target, omega }, velocity)
  }

  const applyTranslate = (value: number) => {
    const max = getMaxTranslate()
    const target = clamp(value, max, 0)
    boundsRef.current = { min: max, width: viewportRef.current?.clientWidth || 1 }
    syncRestingState(target)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stopMotion()
      setPosition(target)
      targetRef.current = target
      return
    }
    runMotion({ mode: 'spring', target, omega: SETTLE_OMEGA }, velocityRef.current)
  }

  // Re-measure when the row or its cards change size (breakpoints, late-arriving cards)
  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return
    const measure = () => {
      const max = getMaxTranslate()
      const x = clamp(targetRef.current, max, 0)
      if (x !== positionRef.current) {
        stopMotion()
        setPosition(x)
        targetRef.current = x
      }
      syncRestingState(x)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(track)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only touch refs and state setters
  }, [count])

  useEffect(() => () => {
    stopMotion()
    if (wheelIdleRef.current) clearTimeout(wheelIdleRef.current)
  }, [])

  // Native listeners: React registers touchmove and wheel as passive, and both need preventDefault
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const blockHorizontalBrowserScroll = (e: TouchEvent) => {
      if (isDraggingRef.current && directionRef.current === 'horizontal') e.preventDefault()
    }
    // Trackpad two-finger swipes and shift+wheel move the row directly; vertical wheel is left to the page
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return
      const max = getMaxTranslate()
      if (max === 0) return
      const next = clamp(positionRef.current - dx, max, 0)
      // At an edge, let the gesture through (so the browser's own back/forward swipe still works)
      if (next === positionRef.current) return
      e.preventDefault()
      stopMotion()
      setPosition(next)
      targetRef.current = next
      if (wheelIdleRef.current) clearTimeout(wheelIdleRef.current)
      wheelIdleRef.current = setTimeout(() => syncRestingState(positionRef.current), 120)
    }
    el.addEventListener('touchmove', blockHorizontalBrowserScroll, { passive: false })
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchmove', blockHorizontalBrowserScroll)
      el.removeEventListener('wheel', onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only touch refs and state setters
  }, [])

  // The arrows move by most of a screenful, landing on a card edge
  const pageStep = () => {
    const step = getStep()
    const width = viewportRef.current?.clientWidth ?? step
    return Math.max(1, Math.floor((width * 0.85) / step)) * step
  }
  const scrollLeft = () => applyTranslate(targetRef.current + pageStep())
  const scrollRight = () => applyTranslate(targetRef.current - pageStep())

  // Keep a keyboard-focused card inside the visible window
  const handleFocus = (e: React.FocusEvent) => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport || getMaxTranslate() === 0) return
    const card = Array.from(track.children).find(c => c.contains(e.target as Node)) as HTMLElement | undefined
    if (!card) return
    const left = card.offsetLeft + targetRef.current
    const right = left + card.offsetWidth
    const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 0
    if (left < gutter) applyTranslate(-(card.offsetLeft - gutter))
    else if (right > viewport.clientWidth - gutter) applyTranslate(-(card.offsetLeft + card.offsetWidth - viewport.clientWidth + gutter))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && canScrollRight) {
      e.preventDefault()
      scrollRight()
    } else if (e.key === 'ArrowLeft' && canScrollLeft) {
      e.preventDefault()
      scrollLeft()
    }
  }

  const toDisplayed = (raw: number) => {
    const { min, width } = boundsRef.current
    if (raw > 0) return rubberBand(raw, width)
    if (raw < min) return min + rubberBand(raw - min, width)
    return raw
  }

  const toRaw = (shown: number) => {
    const { min, width } = boundsRef.current
    if (shown > 0) return inverseRubberBand(shown, width)
    if (shown < min) return min + inverseRubberBand(shown - min, width)
    return shown
  }

  const releaseVelocity = () => {
    const t = now()
    const samples = samplesRef.current.filter((s) => t - s.t <= VELOCITY_WINDOW)
    if (samples.length < 2) return 0
    const first = samples[0]
    const last = samples[samples.length - 1]
    // Finger paused before lifting: no fling
    if (t - last.t > 50 || last.t === first.t) return 0
    return clamp((last.x - first.x) / (last.t - first.t), -MAX_VELOCITY, MAX_VELOCITY)
  }

  // Touch handlers: detect direction so vertical swipes scroll the page natively
  const handleTouchStart = (e: React.TouchEvent) => {
    // Touching a gliding row stops it dead (like iOS); that touch must not also open a card
    const wasGliding = rafRef.current !== null && Math.abs(velocityRef.current) > CATCH_VELOCITY
    stopMotion()

    isDraggingRef.current = true
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    directionRef.current = 'none'
    wasHorizontalDragRef.current = wasGliding
    boundsRef.current = { min: getMaxTranslate(), width: viewportRef.current?.clientWidth || 1 }
    dragStartRawRef.current = toRaw(positionRef.current)
    samplesRef.current = [{ t: now(), x: positionRef.current }]
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return

    const dx = e.touches[0].clientX - startXRef.current
    const dy = e.touches[0].clientY - startYRef.current

    if (directionRef.current === 'none') {
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (adx > 8 || ady > 8) directionRef.current = adx > ady ? 'horizontal' : 'vertical'
    }

    if (directionRef.current === 'horizontal') {
      wasHorizontalDragRef.current = true
      const x = toDisplayed(dragStartRawRef.current + dx)
      setPosition(x)
      const t = now()
      samplesRef.current.push({ t, x })
      while (samplesRef.current.length > 2 && t - samplesRef.current[0].t > VELOCITY_WINDOW) {
        samplesRef.current.shift()
      }
    } else if (directionRef.current === 'vertical') {
      // Let the browser handle vertical scrolling; settle a row caught mid-glide
      isDraggingRef.current = false
      release(0)
    }
  }

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    release(directionRef.current === 'horizontal' ? releaseVelocity() : 0)
  }

  // A tap that was really a horizontal drag (or that caught a gliding row) must not open the card under the finger
  const handleClickCapture = (e: React.MouseEvent) => {
    if (!wasHorizontalDragRef.current) return
    wasHorizontalDragRef.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  if (count === 0) return null

  return (
    <section className={styles.shelf} aria-label={title}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <h2 className={styles.title}>{title}</h2>
          {hint && <p className={styles.hint}>{hint}</p>}
          {moreHref && (
            <Link href={moreHref} className={styles.more}>
              {moreLabel} <FiArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
        {(canScrollLeft || canScrollRight) && (
          <div className={styles.arrows}>
            <button type="button" className={styles.arrow} onClick={scrollLeft} disabled={!canScrollLeft} aria-label={`Scroll ${title} back`}>
              <FiArrowLeft aria-hidden="true" />
            </button>
            <button type="button" className={styles.arrow} onClick={scrollRight} disabled={!canScrollRight} aria-label={`Scroll ${title} forward`}>
              <FiArrowRight aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={viewportRef}
        className={styles.viewport}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onClickCapture={handleClickCapture}
      >
        <div ref={trackRef} className={styles.track}>
          {children}
        </div>
      </div>
    </section>
  )
}
