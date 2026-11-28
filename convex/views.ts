import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { bump, checkName, readOne } from './counters'

/** How many times a post has been read */
export const get = query({
  args: { post: v.string() },
  returns: v.number(),
  handler: (ctx, { post }) => readOne(ctx, 'view', post, ''),
})

/** Count one read. The browser decides when (at most once per post every 12 hours, see lib/voter.ts). */
export const record = mutation({
  args: { post: v.string() },
  returns: v.number(),
  handler: (ctx, { post }) => bump(ctx, 'view', checkName(post, 'post'), '', 1),
})
