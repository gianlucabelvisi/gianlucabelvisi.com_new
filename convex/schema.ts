import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Everything the blog remembers about its readers' activity, as plain counters.
 *
 *   kind       subject            key              example
 *   view       post path          ""               ("view", "/chess", "") -> 1204
 *   reaction   post path          reaction name    ("reaction", "/chess", "lol") -> 31
 *   poll       poll id            answer index     ("poll", "rabbit-hole-bed", "0") -> 58
 *   unicorn    page name          button id        ("unicorn", "doggo", "13") -> 402
 *
 * One table rather than four: they are all "a number that goes up", and one index answers both questions
 * the site asks ("everything for this subject" and "this exact counter").
 * The public functions live next to this file, one module per feature (views.ts, reactions.ts, polls.ts, unicorns.ts).
 */
export const counterKind = v.union(
  v.literal('view'),
  v.literal('reaction'),
  v.literal('poll'),
  v.literal('unicorn'),
)

export default defineSchema({
  counters: defineTable({
    kind: counterKind,
    subject: v.string(),
    key: v.string(),
    count: v.number(),
  }).index('by_subject', ['kind', 'subject', 'key']),
})
