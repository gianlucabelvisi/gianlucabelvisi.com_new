import { useEffect, useRef, useState } from 'react'
import styles from './ApartmentPipeline.module.css'

// The apartment walkthrough pipeline as a looping, bouncy node graph.
// Self-contained (no images, fixed palette, fixed aspect) so it can be screen-recorded into a GIF for LinkedIn.
// Click a node to pause on it and read what happens there; ▶ resumes.

interface Step {
  icon: string
  title: string
  sub: string
  detail: string
}

const STEPS: Step[] = [
  { icon: '📐', title: 'Floor plan', sub: 'plan + photos', detail: 'The realtor’s floor plan, a dozen phone photos and a tape measure. Claude reads the walls off the image and writes them to plan.json.' },
  { icon: '🤖', title: 'Claude', sub: 'prompt → Python', detail: 'I describe what I want in plain English (sometimes Italian). Claude writes and rewrites the Blender script. I never open Blender’s UI.' },
  { icon: '🧊', title: 'Blender', sub: 'build.py · bpy', detail: 'Blender runs headless as a Python module. build.py extrudes the walls, cuts doors and windows and places furniture with sizes scraped from Danish shop pages.' },
  { icon: '📦', title: 'GLB', sub: 'export_web.py', detail: 'The scene is merged, cleaned up and exported as a single binary glTF file, a couple of MB.' },
  { icon: '🕹️', title: 'three.js', sub: 'walk.src.html', detail: 'A browser viewer with WASD, Hue lights, a day-night cycle and a lift. assemble.py inlines the GLB and the plan into one HTML file.' },
  { icon: '⬆️', title: 'git push', sub: 'main', detail: 'Commit and push. The only step of the pipeline where a human is fully in control.' },
  { icon: '🐙', title: 'GitHub', sub: 'the blog repo', detail: 'The walkthrough lives in the same repo as this blog, next to posts about pizza and diabetes.' },
  { icon: '🏗️', title: 'Netlify', sub: 'next build', detail: 'Netlify picks up the push and rebuilds the Next.js blog. About two minutes, enough to make an espresso.' },
  { icon: '🌐', title: '/apartment', sub: 'gianlucabelvisi.com', detail: 'The walkthrough is served as a static page at /apartment. It works on her phone, which is the whole point.' },
  { icon: '💁‍♀️', title: 'Review', sub: 'the girlfriend', detail: '“I hate this.”' },
]

const N = STEPS.length
const HATE = N        // tick: the review bubble
const BACK = N + 1    // ticks: the packet runs back to square one
const LOOP = N + 3

type Pt = { x: number; y: number }

function layout(vertical: boolean) {
  // Horizontal: two rows, snake left→right then right→left, so the review lands right under the floor plan.
  // Vertical: two columns, down then up, so the review lands right next to the floor plan.
  const half = N / 2
  const pts: Pt[] = STEPS.map((_, i) => {
    const k = i < half ? i : N - 1 - i
    const lane = i < half ? 0 : 1
    return vertical ? { x: 115 + lane * 230, y: 125 + k * 190 } : { x: 105 + k * 197.5, y: 95 + lane * 220 }
  })
  return { pts, w: vertical ? 460 : 1000, h: vertical ? 1020 : 430, nw: vertical ? 190 : 168, nh: vertical ? 120 : 104 }
}

interface Props {
  interval?: number
}

export default function ApartmentPipeline({ interval = 1000 }: Props) {
  const [tick, setTick] = useState(0)
  const [paused, setPaused] = useState<number | null>(null)
  const [vertical, setVertical] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setVertical(e.contentRect.width < 560))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (paused !== null) return
    const id = setInterval(() => setTick((t) => (t + 1) % LOOP), interval)
    return () => clearInterval(id)
  }, [paused, interval])

  const { pts, w, h, nw, nh } = layout(vertical)
  const at = paused !== null ? paused : tick <= HATE ? Math.min(tick, N - 1) : 0
  const returning = paused === null && tick >= BACK
  const hating = paused === null && tick === HATE
  const visited = (i: number) => (paused !== null ? i <= paused : !returning && i <= Math.min(tick, N - 1))
  const p = pts[at]
  const shown = paused !== null ? STEPS[paused] : null

  const edge = (a: Pt, b: Pt, key: string, cls: string) => (
    <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={cls} />
  )

  return (
    <figure className={styles.card} ref={wrap}>
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.svg} role="img" aria-label="Pipeline: floor plan, Claude, Blender, GLB, three.js, git push, GitHub, Netlify, the blog, girlfriend review, and back to square one">
        {/* the return trip */}
        {vertical ? (
          <path d={`M${pts[N - 1].x} ${pts[N - 1].y - nh / 2} V${pts[0].y - nh / 2 - 8} H${pts[0].x} V${pts[0].y - nh / 2}`} fill="none" className={`${styles.edge} ${styles.ret} ${returning ? styles.retOn : ''}`} />
        ) : edge(pts[N - 1], pts[0], 'ret', `${styles.edge} ${styles.ret} ${returning ? styles.retOn : ''}`)}
        <text
          x={vertical ? w / 2 : 0}
          y={vertical ? pts[0].y - nh / 2 - 18 : 0}
          transform={vertical ? undefined : `translate(${pts[0].x - 10} ${(pts[N - 1].y + pts[0].y) / 2}) rotate(-90)`}
          className={`${styles.retLabel} ${returning ? styles.retLabelOn : ''} ${vertical ? '' : styles.retLabelSmall}`}
          textAnchor="middle"
        >
          back to square one
        </text>
        {pts.slice(0, -1).map((a, i) => edge(a, pts[i + 1], `e${i}`, `${styles.edge} ${visited(i + 1) ? styles.edgeOn : ''}`))}

        {STEPS.map((s, i) => {
          const q = pts[i]
          const cls = [
            styles.node,
            visited(i) ? styles.lit : '',
            i === at && !returning ? styles.pop : '',
            i === N - 1 && hating ? styles.shake : '',
            i === N - 1 && (hating || paused === N - 1) ? styles.angry : '',
          ].join(' ')
          return (
            <g key={`${i}-${i === at ? tick : 'x'}`} transform={`translate(${q.x} ${q.y})`} onClick={() => setPaused(paused === i ? null : i)} className={styles.hit}>
              <g className={cls}>
                <rect x={-nw / 2} y={-nh / 2} width={nw} height={nh} rx={18} />
                <text y={-nh / 2 + 36} className={styles.icon} textAnchor="middle">{s.icon}</text>
                <text y={nh / 2 - 34} className={styles.title} textAnchor="middle">{s.title}</text>
                <text y={nh / 2 - 14} className={styles.sub} textAnchor="middle">{s.sub}</text>
                <text x={-nw / 2 + 12} y={-nh / 2 + 20} className={styles.num}>{i + 1}</text>
              </g>
            </g>
          )
        })}

        {/* the travelling packet */}
        <g className={styles.packetWrap} style={{ transform: `translate(${p.x}px, ${p.y - nh / 2 - 2}px)` }}>
          <circle r={9} className={`${styles.packet} ${returning ? styles.packetBad : ''}`} />
        </g>

        {hating && (
          <g transform={`translate(${pts[N - 1].x + (vertical ? -95 : 40)} ${pts[N - 1].y + (vertical ? nh / 2 + 42 : -nh / 2 - 40)})`} className={styles.bubble}>
            <rect x={-10} y={-26} width={150} height={40} rx={12} />
            <text x={65} y={1} textAnchor="middle">I hate this.</text>
          </g>
        )}
      </svg>

      <figcaption className={styles.caption}>
        {shown ? (
          <>
            <strong>{shown.icon} {shown.title}</strong> {shown.detail}{' '}
            <button type="button" className={styles.play} onClick={() => setPaused(null)}>▶ resume</button>
          </>
        ) : (
          <span className={styles.hint}>Tap a step to see what happens there.</span>
        )}
      </figcaption>
    </figure>
  )
}
