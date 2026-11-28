import { ConvexError, Infer } from 'convex/values'
import { MutationCtx, QueryCtx } from './_generated/server'
import { counterKind } from './schema'

/** Shared plumbing for the counter modules. Not callable from the browser: only functions exported with query()/mutation() are. */

type Kind = Infer<typeof counterKind>

const MAX_SUBJECT = 200
const MAX_KEY = 64

/** Reject anything that couldn't be a real post path, poll id or button id before it reaches the database */
export function checkName(value: string, what: string, max = MAX_SUBJECT): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max || /[\u0000-\u001f]/.test(trimmed)) {
    throw new ConvexError(`Invalid ${what}`)
  }
  return trimmed
}

export const checkKey = (value: string, what: string) => checkName(value, what, MAX_KEY)

/** Every counter of one kind for one subject, as { key: count } */
export async function readAll(ctx: QueryCtx, kind: Kind, subject: string): Promise<Record<string, number>> {
  const rows = await ctx.db
    .query('counters')
    .withIndex('by_subject', q => q.eq('kind', kind).eq('subject', subject))
    .collect()
  return Object.fromEntries(rows.map(row => [row.key, row.count]))
}

export async function readOne(ctx: QueryCtx, kind: Kind, subject: string, key: string): Promise<number> {
  const row = await ctx.db
    .query('counters')
    .withIndex('by_subject', q => q.eq('kind', kind).eq('subject', subject).eq('key', key))
    .unique()
  return row?.count ?? 0
}

/** Add `delta` to a counter (creating it if needed), never letting it drop below zero. Returns the new value. */
export async function bump(ctx: MutationCtx, kind: Kind, subject: string, key: string, delta: 1 | -1): Promise<number> {
  const row = await ctx.db
    .query('counters')
    .withIndex('by_subject', q => q.eq('kind', kind).eq('subject', subject).eq('key', key))
    .unique()
  if (!row) {
    const count = Math.max(0, delta)
    if (count > 0) await ctx.db.insert('counters', { kind, subject, key, count })
    return count
  }
  const count = Math.max(0, row.count + delta)
  await ctx.db.patch(row._id, { count })
  return count
}
