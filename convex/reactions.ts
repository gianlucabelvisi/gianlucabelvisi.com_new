import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { bump, checkName, readAll } from './counters'

/** The reactions a post can get. Keep in sync with data/ReactionData.ts. */
const NAMES = ['like', 'lol', 'love', 'cringe', 'pony']

/** Reaction counts for a post, as { like: 3, lol: 12, … } (missing means zero) */
export const forPost = query({
  args: { post: v.string() },
  returns: v.record(v.string(), v.number()),
  handler: (ctx, { post }) => readAll(ctx, 'reaction', post),
})

/** Add a reaction, or take it back */
export const toggle = mutation({
  args: { post: v.string(), name: v.string(), on: v.boolean() },
  returns: v.number(),
  handler: (ctx, { post, name, on }) => {
    if (!NAMES.includes(name)) throw new ConvexError('Unknown reaction')
    return bump(ctx, 'reaction', checkName(post, 'post'), name, on ? 1 : -1)
  },
})
