/**
 * Dry run: does the new runtime audit stay silent on the REAL 10 sessions?
 *
 * The audit asserts `sum(routes) === totalOf(usage)`. In the projection cache the
 * state is `tokenUsage.val.totals` (four buckets) and
 * `tokenUsageByRoute.val.totals` (routeKey -> four buckets), which are the same
 * numbers the wire view ships, so the identity can be checked without replaying
 * events. Read-only: touches nothing.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const dir = join(homedir(), '.dsh', 'storages', 'session_projcache', 'sessions')
const files = readdirSync(dir).filter((name) => name.endsWith('.json'))
const FIELDS = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']
const totalOf = (usage) => FIELDS.reduce((sum, field) => sum + (usage?.[field] ?? 0), 0)

let checked = 0
let skipped = 0
let drift = 0
let grandTotal = 0

for (const name of files.sort()) {
  let doc
  try {
    doc = JSON.parse(readFileSync(join(dir, name), 'utf8'))
  } catch {
    console.log('SKIP  ' + name + ' (unreadable)')
    skipped += 1
    continue
  }
  const rows = doc?.record?.rows
  if (rows === undefined) {
    console.log('SKIP  ' + name + ' (no rows)')
    skipped += 1
    continue
  }
  const usageTotals = rows.tokenUsage?.val?.totals
  const routeState = rows.tokenUsageByRoute?.val
  if (usageTotals === undefined || routeState === undefined) {
    console.log('SKIP  ' + name + ' (missing unit; read queue owns this)')
    skipped += 1
    continue
  }
  const perRoute = routeState.totals ?? {}
  const routeSum = Object.values(perRoute).reduce((sum, buckets) => sum + totalOf(buckets), 0)
  const usageSum = totalOf(usageTotals)
  grandTotal += usageSum
  checked += 1
  const ok = routeSum === usageSum
  if (!ok) drift += 1
  console.log(
    (ok ? 'OK    ' : 'DRIFT ') +
      name.slice(0, 24) +
      '  routes=' + String(routeSum).padStart(12) +
      '  total=' + String(usageSum).padStart(12) +
      (ok ? '' : '  delta=' + (routeSum - usageSum)),
  )
}

console.log('')
console.log('sessions checked: ' + checked + ', skipped: ' + skipped + ', drift: ' + drift)
console.log('grand total across checked sessions: ' + grandTotal.toLocaleString('en-US'))
if (drift > 0) {
  console.error('the audit would fire on real data: investigate before shipping')
  process.exit(1)
}
console.log('dry run clean: the audit stays silent on every real session')
