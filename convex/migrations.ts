import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { counterKind } from './schema'

/**
 * Set counters to given values, creating the ones that don't exist. Used once to bring the old Firebase numbers
 * over (scripts/firebase-to-convex.mjs writes the input), and safe to run again: it sets, it doesn't add.
 *
 * Internal: it cannot be called from a browser, only from the CLI or the dashboard by someone with the deploy key.
 *   npx convex run migrations:importCounters "$(cat firebase-counters.json)"
 */
export const importCounters = internalMutation({
  args: {
    rows: v.array(v.object({ kind: counterKind, subject: v.string(), key: v.string(), count: v.number() })),
  },
  returns: v.object({ created: v.number(), updated: v.number(), unchanged: v.number() }),
  handler: async (ctx, { rows }) => {
    let created = 0
    let updated = 0
    let unchanged = 0
    for (const { kind, subject, key, count } of rows) {
      const existing = await ctx.db
        .query('counters')
        .withIndex('by_subject', q => q.eq('kind', kind).eq('subject', subject).eq('key', key))
        .unique()
      if (!existing) {
        await ctx.db.insert('counters', { kind, subject, key, count })
        created += 1
      } else if (existing.count !== count) {
        await ctx.db.patch(existing._id, { count })
        updated += 1
      } else {
        unchanged += 1
      }
    }
    return { created, updated, unchanged }
  },
})
