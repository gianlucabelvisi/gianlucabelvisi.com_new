#!/usr/bin/env node
/**
 * One-off: turn the old Firebase Realtime Database counters into a file Convex can import.
 *
 *   node scripts/firebase-to-convex.mjs https://<project>-default-rtdb.<region>.firebasedatabase.app
 *   node scripts/firebase-to-convex.mjs export.json          (a JSON export from the Firebase console)
 *
 * It writes firebase-counters.json (the rows of the `counters` table, see convex/schema.ts) and prints the
 * command that loads them. Nothing is written to Firebase or to Convex by this script.
 * Loading sets each counter to the Firebase value, so it can be repeated right up to the switch-over.
 *
 * Firebase layout                       ->  Convex row
 *   views/<post path>/count             ->  { kind: "view",     subject: "/<post path>", key: "" }
 *   reactions/<post path>/<name>        ->  { kind: "reaction", subject: "/<post path>", key: "<name>" }
 *   polls/<poll id>/<answer index>      ->  { kind: "poll",     subject: "<poll id>",    key: "<index>" }
 *   unicorn/<page>/<button id>          ->  { kind: "unicorn",  subject: "<page>",       key: "<id>" }
 *
 * Post paths can contain slashes ("/r/place"), which Firebase stores as nested objects, so views and
 * reactions are walked to whatever depth the numbers sit at.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const REACTIONS = new Set(['like', 'lol', 'love', 'cringe', 'pony'])
const OUT = process.argv[3] || 'firebase-counters.json'
const source = process.argv[2]

if (!source) {
  console.error('Usage: node scripts/firebase-to-convex.mjs <firebase database URL | export.json> [output.json]')
  process.exit(1)
}

async function load() {
  if (!/^https?:\/\//.test(source)) return JSON.parse(readFileSync(source, 'utf8'))
  // The four branches are publicly readable (database.rules.json); the root is not, so fetch them one by one
  const base = source.replace(/\/+$/, '')
  const data = {}
  for (const branch of ['views', 'reactions', 'polls', 'unicorn']) {
    const res = await fetch(`${base}/${branch}.json`)
    if (!res.ok) throw new Error(`${branch}: HTTP ${res.status} ${await res.text()}`)
    data[branch] = await res.json()
  }
  return data
}

const isCount = value => typeof value === 'number' && Number.isFinite(value) && value > 0
// Firebase hands back an array when the keys look like 0, 1, 2…; treat both shapes as key/value pairs
const entries = node => (node && typeof node === 'object' ? Object.entries(node).filter(([, v]) => v !== null && v !== undefined) : [])

const rows = []
const add = (kind, subject, key, count) => rows.push({ kind, subject, key, count: Math.round(count) })

function walkViews(node, path) {
  for (const [name, value] of entries(node)) {
    if (name === 'count' && isCount(value)) add('view', '/' + path.join('/'), '', value)
    else if (typeof value === 'object') walkViews(value, [...path, name])
  }
}

function walkReactions(node, path) {
  for (const [name, value] of entries(node)) {
    if (REACTIONS.has(name) && typeof value === 'number') {
      if (isCount(value)) add('reaction', '/' + path.join('/'), name, value)
    } else if (typeof value === 'object') {
      walkReactions(value, [...path, name])
    }
  }
}

function walkFlat(kind, node) {
  for (const [subject, group] of entries(node)) {
    for (const [key, value] of entries(group)) {
      if (isCount(value)) add(kind, subject, String(key), value)
    }
  }
}

const data = await load()
walkViews(data.views, [])
walkReactions(data.reactions, [])
walkFlat('poll', data.polls)
walkFlat('unicorn', data.unicorn)

writeFileSync(OUT, JSON.stringify({ rows }))

const total = kind => rows.filter(r => r.kind === kind)
const sum = list => list.reduce((n, r) => n + r.count, 0).toLocaleString('en-US')
console.log(`Wrote ${rows.length} counters to ${OUT}`)
for (const kind of ['view', 'reaction', 'poll', 'unicorn']) {
  const list = total(kind)
  console.log(`  ${kind.padEnd(9)} ${String(list.length).padStart(4)} counters, ${sum(list)} in total`)
}
const top = total('view').sort((a, b) => b.count - a.count).slice(0, 5)
if (top.length) console.log('  most read: ' + top.map(r => `${r.subject} (${r.count.toLocaleString('en-US')})`).join(', '))
console.log(`\nCheck the numbers above, then load them:
  npx convex run migrations:importCounters "$(cat ${OUT})"          (your dev deployment)
  npx convex run --prod migrations:importCounters "$(cat ${OUT})"   (production; or set CONVEX_DEPLOY_KEY instead of --prod)`)
