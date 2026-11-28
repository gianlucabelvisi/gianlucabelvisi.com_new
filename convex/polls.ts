import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { bump, checkKey, readAll } from './counters'

const MAX_OPTIONS = 10

/** Votes per answer for a poll, as { "0": 58, "1": 31 } (missing means zero) */
export const results = query({
  args: { poll: v.string() },
  returns: v.record(v.string(), v.number()),
  handler: (ctx, { poll }) => readAll(ctx, 'poll', poll),
})

/** Cast one vote. The browser remembers that it voted (lib/voter.ts); the server only counts. */
export const vote = mutation({
  args: { poll: v.string(), option: v.number() },
  returns: v.number(),
  handler: (ctx, { poll, option }) => {
    if (!Number.isInteger(option) || option < 0 || option >= MAX_OPTIONS) throw new ConvexError('Unknown answer')
    return bump(ctx, 'poll', checkKey(poll, 'poll'), String(option), 1)
  },
})
