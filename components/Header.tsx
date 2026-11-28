import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { FiHome, FiSearch, FiCompass, FiBox, FiChevronDown, FiChevronLeft, FiArrowRight } from 'react-icons/fi'
import ThemeToggle from './ThemeToggle'
import { isDarkOnlyRoute } from '../lib/routes'
import { PROJECTS, projectForPath } from '../lib/projects'
import styles from './Header.module.css'

interface NavItem {
  label: string
  href: string
  /** Also highlight for nested routes, e.g. /tags/food */
  match?: (pathname: string) => boolean
}

/** Archive, tags and search are three ways of finding a post, so they share one door */
const isBrowseRoute = (p: string) => p === '/archive' || p === '/search' || p.startsWith('/tags')

const NAV_ITEMS: NavItem[] = [
  { label: 'Browse', href: '/archive', match: isBrowseRoute },
]

const isProjectsRoute = (p: string) => p === '/projects' || !!projectForPath(p)

/** Mobile: an app-style tab bar at the bottom replaces the old hamburger + full-screen overlay */
const TABS = [
  { label: 'Home', href: '/', icon: FiHome, match: (p: string) => p === '/' },
  { label: 'Browse', href: '/archive', icon: FiCompass, match: isBrowseRoute },
  { label: 'Projects', href: '/projects', icon: FiBox, match: isProjectsRoute },
]

export default function Header() {
  const [visible, setVisible] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  // Post pages open on an ink hero (marked data-ink-zone): the header wears the dark look until that scrolls away
  const [overInk, setOverInk] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const lastScrollY = useRef(0)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverOpenedAt = useRef(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isHomepage = router.pathname === '/'
  const isDarkRoute = isDarkOnlyRoute(router.pathname)
  const project = projectForPath(router.pathname)
  // project viewers are full-screen 3D pages: no tab bar there, a back bar instead
  const showTabBar = !project

  useEffect(() => {
    lastScrollY.current = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current

      if (currentScrollY < 10) {
        setVisible(true)
      } else if (delta > 5) {
        setVisible(false)
        setProjectsOpen(false)
      } else if (delta < -5) {
        setVisible(true)
      }

      setScrolled(currentScrollY > 20)
      lastScrollY.current = currentScrollY

      const zone = document.querySelector('[data-ink-zone]')
      setOverInk(!!zone && zone.getBoundingClientRect().bottom > 56)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    router.events.on('routeChangeComplete', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      router.events.off('routeChangeComplete', handleScroll)
    }
  }, [router.events])

  // Close the projects menu whenever a navigation starts
  useEffect(() => {
    const close = () => setProjectsOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  // Escape and clicks outside close the projects menu
  useEffect(() => {
    if (!projectsOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProjectsOpen(false) }
    const onDown = (e: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setProjectsOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [projectsOpen])

  // Pages with the tab bar get bottom padding on phones (see globals.css)
  useEffect(() => {
    document.documentElement.classList.toggle('has-tabbar', showTabBar)
    return () => document.documentElement.classList.remove('has-tabbar')
  }, [showTabBar])

  // Hover opens the menu on devices with a mouse; a short delay so it doesn't flicker
  const hoverOpen = useCallback(() => {
    if (!window.matchMedia('(hover: hover)').matches) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setProjectsOpen(o => { if (!o) hoverOpenedAt.current = Date.now(); return true })
  }, [])
  const hoverClose = useCallback(() => {
    if (!window.matchMedia('(hover: hover)').matches) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setProjectsOpen(false), 180)
  }, [])

  const isActive = (item: NavItem) =>
    item.match ? item.match(router.pathname) : router.pathname === item.href

  const headerClass = [
    styles.header,
    visible ? styles.visible : styles.hidden,
    isDarkRoute || overInk ? styles.homepage : styles.page,
    // transparent while it sits on the hero (home, and the ink top of a post); a blurred bar once the page moves under it
    (scrolled || !isHomepage) && !overInk ? styles.scrolled : '',
    // phones: the tab bar has Home and Search, so on dark pages without a back bar the top bar would be empty
    !project && isDarkRoute ? styles.mobileEmpty : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <header className={headerClass} style={{ viewTransitionName: 'site-header' }}>
        <div className={styles.inner}>
          {project ? (
            <>
              {/* Phones: back to Projects, like an app */}
              <Link href="/projects" className={styles.backLink}>
                <FiChevronLeft aria-hidden="true" />
                <span>Projects</span>
              </Link>
              <span className={styles.backTitle}>{project.shortTitle}</span>
            </>
          ) : null}

          <Link href="/" className={`${styles.wordmark} ${project ? styles.desktopOnly : ''}`} aria-label="Gianluca Belvisi, home">
            gianluca<span aria-hidden="true">.</span>
          </Link>

          <div className={styles.controls}>
            <nav className={styles.desktopNav} aria-label="Main navigation">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item) ? styles.active : ''}`}
                  aria-current={isActive(item) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}

              <div className={styles.projects} ref={menuRef} onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
                <button
                  type="button"
                  className={`${styles.navLink} ${styles.projectsButton} ${isProjectsRoute(router.pathname) ? styles.active : ''} ${projectsOpen ? styles.projectsButtonOpen : ''}`}
                  aria-expanded={projectsOpen}
                  aria-controls="projects-menu"
                  onClick={() => setProjectsOpen(o => (o && Date.now() - hoverOpenedAt.current < 600 ? true : !o))}
                >
                  Projects <FiChevronDown className={styles.chevron} aria-hidden="true" />
                </button>

                <div id="projects-menu" className={`${styles.projectsMenu} ${projectsOpen ? styles.projectsMenuOpen : ''}`} aria-hidden={!projectsOpen}>
                  <ul className={styles.projectsList}>
                    {PROJECTS.map(p => (
                      <li key={p.slug}>
                        <Link href={p.href} className={`${styles.projectItem} ${router.pathname === p.href ? styles.projectItemActive : ''}`} tabIndex={projectsOpen ? 0 : -1}>
                          <span className={styles.projectThumb}>
                            <Image src={p.image} alt="" width={120} height={75} sizes="120px" />
                          </span>
                          <span className={styles.projectText}>
                            <span className={styles.projectKicker}>{p.kicker}</span>
                            <span className={styles.projectTitle}>{p.title}</span>
                            <span className={styles.projectBlurb}>{p.blurb}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href="/projects" className={styles.projectsAll} tabIndex={projectsOpen ? 0 : -1}>
                    All projects <FiArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </nav>

            <Link
              href="/search"
              className={`${styles.iconButton} ${styles.desktopOnly} ${router.pathname === '/search' ? styles.active : ''}`}
              aria-label="Search posts"
              title="Search"
            >
              <FiSearch aria-hidden="true" />
            </Link>

            {!isDarkRoute && <ThemeToggle />}
          </div>
        </div>
      </header>

      {showTabBar && (
        <nav className={styles.tabBar} aria-label="Sections" style={{ viewTransitionName: 'site-tabbar' }}>
          {TABS.map(t => {
            const on = t.match(router.pathname)
            const Icon = t.icon
            return (
              <Link key={t.href} href={t.href} className={`${styles.tab} ${on ? styles.tabActive : ''}`} aria-current={on ? 'page' : undefined}>
                <span className={styles.tabIcon}><Icon aria-hidden="true" /></span>
                <span className={styles.tabLabel}>{t.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
