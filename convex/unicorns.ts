import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { bump, checkKey, readOne } from './counters'

/** Clicks on one unicorn button */
export const get = query({
  args: { page: v.string(), id: v.string() },
  returns: v.number(),
  handler: (ctx, { page, id }) => readOne(ctx, 'unicorn', page, id),
})

export const click = mutation({
  args: { page: v.string(), id: v.string() },
  returns: v.number(),
  handler: (ctx, { page, id }) => bump(ctx, 'unicorn', checkKey(page, 'page'), checkKey(id, 'button'), 1),
})
