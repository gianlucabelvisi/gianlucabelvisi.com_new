import { ConvexReactClient } from 'convex/react'

/**
 * The connection to the Convex backend (views, reactions, polls, unicorn clicks: see convex/).
 *
 * `null` when NEXT_PUBLIC_CONVEX_URL isn't set, e.g. a fresh checkout or a build without a backend.
 * The site still works then: the components that need Convex render a static version of themselves,
 * so always check `convex` before using a Convex hook (hooks throw without the provider in pages/_app.tsx).
 */
const url = process.env.NEXT_PUBLIC_CONVEX_URL

export const convex = url ? new ConvexReactClient(url) : null
