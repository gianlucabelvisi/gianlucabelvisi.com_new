import Router from 'next/router'

/**
 * Page transitions, built on the browser's View Transitions API.
 *
 * Opening a post: the image that was clicked grows into the post's hero, the title rises, and the paper sheet
 * slides up from the bottom of the screen. Leaving a post plays it backwards: the sheet drops away and the hero
 * shrinks back into its card when that card is on screen. Everything else gets a short cross-fade.
 *
 * How the pieces find each other:
 *   - the post page names its three parts (inline styles in pages/[...slug].tsx):
 *     post-hero (image + shade), post-title, post-sheet
 *   - anything that can be the *other end* of the hero morph is marked data-vt-image: card thumbnails and the
 *     homepage hero image. This module gives the right one the name post-hero for the length of one transition.
 *   - the choreography itself is CSS, at the bottom of styles/globals.css, keyed on <html data-nav="…">
 *
 * Next's Pages Router has no hook for "about to swap the page", so navigation is wrapped at the router:
 * push() is patched for forward moves, and beforePopState takes over back/forward.
 * Browsers without the API (and readers who prefer reduced motion) navigate exactly as before; where the API is
 * simply missing, a class on <html> triggers plain CSS entrance animations instead.
 */

const HERO = 'post-hero'
const POST_ROUTE = '/[...slug]'
/** A click only counts as the cause of a navigation if it happened this recently (ms) */
const CLICK_WINDOW = 800

type CoreRouter = NonNullable<typeof Router.router>
type Push = CoreRouter['push']

const hasApi = () => typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Pathname only, no trailing slash: "/chess?x=1#top" -> "/chess" */
function pathOf(url: unknown): string {
  const raw = typeof url === 'string' ? url : ((url as { pathname?: string | null } | null)?.pathname ?? '')
  try {
    return new URL(raw, window.location.href).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return raw
  }
}

function onScreen(el: Element): boolean {
  const r = el.getBoundingClientRect()
  // Mostly visible: a card peeking in from the edge of a row is a poor landing spot
  const visibleX = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)
  const visibleY = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
  return r.width > 0 && r.height > 0 && visibleX > r.width * 0.6 && visibleY > r.height * 0.6
}

/** The link an image belongs to: the <a> around it, or the link inside its scope (the homepage hero) */
function linkOf(image: Element): HTMLAnchorElement | null {
  const scope = image.closest('[data-vt-scope]')
  if (scope) return scope.hasAttribute('inert') ? null : scope.querySelector('a[href]')
  return image.closest('a[href]')
}

/** The image to grow from, given the link that was clicked */
function imageOf(link: HTMLAnchorElement): HTMLElement | null {
  return link.querySelector<HTMLElement>('[data-vt-image]')
    ?? link.closest('[data-vt-scope]')?.querySelector<HTMLElement>('[data-vt-image]')
    ?? null
}

/** A visible image on the current page that links to `path`: where a closing post's hero can shrink back to */
function landingFor(path: string): HTMLElement | null {
  for (const image of Array.from(document.querySelectorAll<HTMLElement>('[data-vt-image]'))) {
    const link = linkOf(image)
    if (link && pathOf(link.href) === path && onScreen(image)) return image
  }
  return null
}

export function installViewTransitions(): () => void {
  const core = Router.router
  if (!core || typeof window === 'undefined') return () => {}
  const root = document.documentElement

  // No API: a class on <html> for a moment after each navigation lets CSS animate the new page in
  if (!hasApi()) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const enter = (_url: string, { shallow }: { shallow: boolean }) => {
      if (shallow) return
      root.classList.add('nav-enter')
      clearTimeout(timer)
      timer = setTimeout(() => root.classList.remove('nav-enter'), 900)
    }
    Router.events.on('routeChangeComplete', enter)
    return () => {
      Router.events.off('routeChangeComplete', enter)
      clearTimeout(timer)
      root.classList.remove('nav-enter')
    }
  }

  const push: Push = core.push.bind(core)
  const replace = core.replace.bind(core)

  // Remember the last link clicked, so push() knows which image the navigation started from
  let lastClick: { link: HTMLAnchorElement; at: number } | null = null
  const onClick = (e: MouseEvent) => {
    const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    lastClick = link ? { link, at: performance.now() } : null
  }
  document.addEventListener('click', onClick, true)

  /** Run a navigation inside a view transition. Resolves like the navigation itself would. */
  const run = (navigate: () => Promise<boolean>, source: HTMLElement | null): Promise<boolean> => {
    const fromPost = core.pathname === POST_ROUTE
    const fromPath = pathOf(core.asPath)
    const named: HTMLElement[] = []
    const name = (el: HTMLElement) => { el.style.viewTransitionName = HERO; named.push(el) }
    const unname = () => named.splice(0).forEach(el => { el.style.viewTransitionName = '' })

    // On a post the hero already owns the name; two elements with one name would cancel the transition
    if (source && !fromPost) name(source)

    let result = false
    const transition = document.startViewTransition(async () => {
      result = await navigate()
      unname() // the old page has been photographed; its names are spent
      const toPost = core.pathname === POST_ROUTE
      root.dataset.nav = toPost && !fromPost ? 'open-post' : fromPost && !toPost ? 'close-post' : 'move'
      if (fromPost && !toPost) {
        const landing = landingFor(fromPath)
        if (landing) name(landing)
      }
    })

    const done = () => { unname(); delete root.dataset.nav }
    transition.finished.then(done, done)
    transition.ready.catch(() => { /* skipped (tab hidden, superseded by another navigation): nothing to do */ })
    return transition.updateCallbackDone.then(() => result)
  }

  core.push = ((url, as, options) => {
    const target = pathOf(as ?? url)
    // Shallow updates (a sheet opening) and moves within the same page keep their instant behaviour
    if (options?.shallow || reducedMotion() || target === pathOf(core.asPath)) return push(url, as, options)
    const click = lastClick
    const source = click && performance.now() - click.at < CLICK_WINDOW && pathOf(click.link.href) === target
      ? imageOf(click.link)
      : null
    return run(() => push(url, as, options), source)
  }) as Push

  // Back / forward. Returning false tells Next to stand down; the same navigation is then run inside a transition.
  core.beforePopState(({ url, as, options }) => {
    if (reducedMotion() || pathOf(as) === pathOf(core.asPath)) return true
    // A rejection here is Next cancelling this navigation in favour of a newer one, which needs no handling
    run(() => replace(url, as, { ...options, scroll: false }), null).catch(() => {})
    return false
  })

  return () => {
    document.removeEventListener('click', onClick, true)
    core.push = push
    core.beforePopState(() => true)
    delete root.dataset.nav
  }
}
