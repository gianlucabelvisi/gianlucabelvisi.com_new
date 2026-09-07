/**
 * Routes that always render in the dark "Netflix" theme, regardless of the
 * reader's saved preference. Post pages and everything else respect the toggle.
 *
 * Keep the regex in pages/_document.tsx (blocking theme script) in sync.
 */
const DARK_ONLY_ROUTES = new Set(['/', '/archive', '/tags', '/tags/[tag]', '/search', '/404'])

export function isDarkOnlyRoute(pathname: string): boolean {
  return DARK_ONLY_ROUTES.has(pathname)
}

export const SITE_URL = 'https://gianlucabelvisi.com'
export const SITE_NAME = "Gianluca Belvisi's Blog"
export const AUTHOR_NAME = 'Gianluca Belvisi'
