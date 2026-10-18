/**
 * Side projects shown under "Projects" (header dropdown on desktop, Projects tab on mobile, /projects page).
 * Add a new project here: it appears everywhere at once. Covers live in public/projects/ (1200 × 750).
 */
export interface Project {
  slug: string
  href: string
  title: string
  /** Short label above the title */
  kicker: string
  /** One or two sentences for the cards */
  blurb: string
  image: string
  /** Shown in the mobile back bar on the project's page */
  shortTitle: string
}

export const PROJECTS: Project[] = [
  {
    slug: 'apartment',
    href: '/apartment',
    title: 'Our Copenhagen apartment',
    shortTitle: 'Apartment',
    kicker: '3D walkthrough',
    blurb: 'Walk through our flat in Sluseholmen, try real furniture from Danish shops, and watch the light change through the day.',
    image: '/projects/apartment.jpg',
  },
  {
    slug: 'pantelleria',
    href: '/pantelleria',
    title: 'Pantelleria in 3D',
    shortTitle: 'Pantelleria',
    kicker: 'Island map',
    blurb: 'The real terrain, roads and every dammuso of the island, cel-shaded and explorable like a map.',
    image: '/projects/pantelleria.jpg',
  },
]

/** The project whose page this is, if any */
export function projectForPath(pathname: string): Project | undefined {
  return PROJECTS.find(p => p.href === pathname)
}
