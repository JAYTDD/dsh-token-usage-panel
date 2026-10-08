/**
 * Self-check for the Host half: the three usage-derived projection units and the
 * route-name cache.
 *
 * The valuable assertion here is a differential one. `dsh-token-meter` already
 * owns `tokenUsage`, and all three units must partition the very same tokens — so
 * the harness reimplements the shipped `usage-projection.ts` fold verbatim and
 * asserts that the per-model sum, the per-day sum, and the per-day-per-model sum
 * each equal exactly what it produces. If the replace-within-a-step rule or the
 * `llm/retry-started` boundary ever drifts from the shipped algorithm, all three
 * disagree and this fails.
 *
 * Also covered: reference identity for uninteresting events (the drive's
 * `Object.is` gate depends on it), day attribution for a configured offset, the
 * retained-window pruning, the session span, checkpoint round-tripping through
 * the duck-typed schemas, wire-schema validity, provider/model name resolution including
 * its fallbacks, the deliberate divergence on malformed samples, and that the
 * plugin registers all three keys.
 *
 * Run: node scripts/verify-host.mjs
 */
import { createRouteNames } from '../lib/route-names.js'
import { createUsageProjections, internals } from '../lib/route-usage.js'

const failures = []
/** @param condition - falsy fails the check. @param message - reported text. */
function check(condition, message) {
  if (condition) {
    console.log('  ok   ' + message)
    return
  }
  failures.push(message)
  console.log('  FAIL ' + message)
}

const FIELDS = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']
const DAY = 86400000
const zero = () => ({ uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
const sum = (buckets) => FIELDS.reduce((total, field) => total + buckets[field], 0)
const equal = (left, right) => FIELDS.every((field) => left[field] === right[field])
const add = (left, right) => {
  const next = zero()
  for (const field of FIELDS) next[field] = left[field] + right[field]
  return next
}

//#region the shipped algorithm, reimplemented as the oracle
/** `usageOf` from dsh-token-meter/lib/types/usage-projection.js, verbatim in behaviour. */
function oracleUsageOf(event) {
  if (event.type === 'assistant/message' && event.data.usage !== undefined) return event.data.usage
  if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') return undefined
  const stream = event.data.stream
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record.type === 'chunk' && record.chunk.type === 'usage') return record.chunk.usage
  }
  return undefined
}
/**
 * The shipped `tokenUsage` fold, verbatim in behaviour. It does not validate its
 * samples, which is why the malformed case is checked separately.
 */
function oracleTotals(events) {
  const bucketsFrom = (usage) => ({
    uncachedInputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteTokens ?? 0,
  })
  const addReplacing = (totals, previous, next) => ({
    uncachedInputTokens: totals.uncachedInputTokens - (previous === undefined ? 0 : previous.uncachedInputTokens) + next.uncachedInputTokens,
    outputTokens: totals.outputTokens - (previous === undefined ? 0 : previous.outputTokens) + next.outputTokens,
    cacheReadTokens: totals.cacheReadTokens - (previous === undefined ? 0 : previous.cacheReadTokens) + next.cacheReadTokens,
    cacheWriteTokens: totals.cacheWriteTokens - (previous === undefined ? 0 : previous.cacheWriteTokens) + next.cacheWriteTokens,
  })
  let last = null
  let totals = zero()
  for (const event of events) {
    if (event.type === 'llm/retry-started') {
      if (last !== null && last.turn === event.data.turn && last.step === event.data.step) last = null
      continue
    }
    if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') continue
    const sample = oracleUsageOf(event)
    if (sample === undefined) continue
    const { turn, step } = event.data
    const buckets = bucketsFrom(sample)
    const previous = last !== null && last.turn === turn && last.step === step ? last.buckets : undefined
    if (previous !== undefined && equal(previous, buckets)) continue
    totals = addReplacing(totals, previous, buckets)
    last = { turn, step, buckets }
  }
  return totals
}
//#endregion

//#region fixtures
const header = (provider, model, time) => ({ type: 'request/header', time, data: { header: { config: { provider, model } } } })
const message = (turn, step, usage, time) => ({ type: 'assistant/message', time, data: { turn, step, message: {}, stream: [], usage } })
const attemptEvent = (turn, step, usage, time) => ({
  type: 'assistant/attempt',
  time,
  data: {
    turn,
    step,
    stream: [
      { type: 'chunk', chunk: { type: 'text', text: 'hi' } },
      { type: 'chunk', chunk: { type: 'usage', usage } },
    ],
  },
})
const retry = (turn, step, time) => ({ type: 'llm/retry-started', time, data: { turn, step } })
const other = (type, time) => ({ type, time, data: {} })
const usage = (input, output, cacheRead = 0, cacheWrite = 0) => ({
  inputTokens: input,
  outputTokens: output,
  cacheReadTokens: cacheRead,
  cacheWriteTokens: cacheWrite,
})

const DAY_A = 20000 * DAY
const DAY_B = DAY_A + DAY
const DAY_C = DAY_B + DAY

/**
 * A log exercising every branch, spread over three days. Every event carries a
 * commit time and is one the session schema admits — the differential section
 * compares against a fold that does not validate.
 */
const LOG = [
  other('turn/start', DAY_A),
  // Usage before any header: no route is in force yet.
  message(0, 1, usage(7, 1), DAY_A),
  header('openai', 'gpt-x', DAY_A),
  message(1, 1, usage(1000, 100, 500, 0), DAY_A),
  // Same step, replacement: the previous sample must be subtracted, not added.
  message(1, 1, usage(1200, 130, 500, 0), DAY_A + 1000),
  // Same step, identical sample: a no-op.
  message(1, 1, usage(1200, 130, 500, 0), DAY_A + 2000),
  other('tool/call', DAY_B),
  header('anthropic', 'claude-y', DAY_B),
  message(1, 2, usage(2000, 200, 0, 400), DAY_B),
  // A retry in a different step leaves the replacement slot open.
  retry(1, 2, DAY_B + 1000),
  message(1, 3, usage(50, 5), DAY_B + 2000),
  // A stream-carried sample on an attempt, on the third day.
  attemptEvent(1, 4, usage(300, 30, 100, 0), DAY_C),
  // A header with no fields is not a route.
  header('', '', DAY_C + 1000),
  other('turn/end', DAY_C + 2000),
]
//#endregion

console.log('# fold equivalence with the shipped tokenUsage algorithm')
/** A config with a fixed offset so day indices are the UTC ones. */
const CONFIG = { utcOffsetMinutes: 0 }
const names = createRouteNames()
const fakeLlm = {
  listProviders: () => [
    { id: 'openai', name: 'OpenAI API' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'unknown', name: 'Unknown route' },
  ],
  listModels: async (provider) =>
    provider === 'openai' ? [{ id: 'gpt-x', name: 'GPT-X' }] : provider === 'anthropic' ? [{ id: 'claude-y', name: 'Claude Y' }] : [],
}
await names.resolve(fakeLlm)

const [routeUnit, dayUnit, routeDayUnit] = createUsageProjections(CONFIG, names)
let routeState = routeUnit.init({}, 0)
let dayState = dayUnit.init({}, 0)
let routeDayState = routeDayUnit.init({}, 0)
for (const event of LOG) {
  routeState = routeUnit.apply(routeState, event)
  dayState = dayUnit.apply(dayState, event)
  routeDayState = routeDayUnit.apply(routeDayState, event)
}

const oracle = oracleTotals(LOG)
const routeWire = routeUnit.wire.view(routeState)
const dayWire = dayUnit.wire.view(dayState)
const routeDayWire = routeDayUnit.wire.view(routeDayState)

const routeSum = routeWire.routes.reduce((total, row) => add(total, row.tokens), zero())
const daySum = dayWire.days.reduce((total, day) => add(total, day.tokens), zero())
const routeDaySum = routeDayWire.days.reduce((total, day) => day.routes.reduce((inner, row) => add(inner, row.tokens), total), zero())

check(equal(routeSum, oracle), 'sum(per-model) equals the shipped tokenUsage totals (' + JSON.stringify(routeSum) + ')')
check(equal(daySum, oracle), 'sum(per-day) equals the shipped tokenUsage totals (' + JSON.stringify(daySum) + ')')
check(equal(routeDaySum, oracle), 'sum(per-day-per-model) equals the shipped tokenUsage totals (' + JSON.stringify(routeDaySum) + ')')
check(sum(oracle) === 3557 + 366 + 600 + 400, 'the fixture produced the expected volume (' + sum(oracle) + ')')

console.log('# per-model attribution')
{
  const byKey = new Map(routeWire.routes.map((row) => [row.provider + '/' + row.model, row.tokens]))
  check(equal(byKey.get('openai/gpt-x'), { uncachedInputTokens: 1200, outputTokens: 130, cacheReadTokens: 500, cacheWriteTokens: 0 }), 'the same-step replacement subtracted the superseded sample')
  check(equal(byKey.get('anthropic/claude-y'), { uncachedInputTokens: 2350, outputTokens: 235, cacheReadTokens: 100, cacheWriteTokens: 400 }), 'the second route carries its own buckets and its later steps')
  check(equal(byKey.get('unknown/unknown'), { uncachedInputTokens: 7, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }), 'the pre-header sample lands on the unknown route')
  check(routeWire.routes.length === 3, 'one row per route (' + routeWire.routes.length + ')')
  check(sum(routeWire.routes[0].tokens) >= sum(routeWire.routes[2].tokens), 'rows are ordered by volume')
}

console.log('# per-day attribution')
{
  const dayA = Math.floor(DAY_A / DAY)
  const byDay = new Map(dayWire.days.map((day) => [day.day, day.tokens]))
  check(dayWire.days.length === 3, 'three days of usage (' + dayWire.days.length + ')')
  check(equal(byDay.get(dayA), { uncachedInputTokens: 1207, outputTokens: 131, cacheReadTokens: 500, cacheWriteTokens: 0 }), 'day one holds the pre-header sample plus the replaced route sample')
  check(equal(byDay.get(dayA + 1), { uncachedInputTokens: 2050, outputTokens: 205, cacheReadTokens: 0, cacheWriteTokens: 400 }), 'day two holds the second route and its retried step')
  check(equal(byDay.get(dayA + 2), { uncachedInputTokens: 300, outputTokens: 30, cacheReadTokens: 100, cacheWriteTokens: 0 }), 'day three holds the stream-carried attempt')
  check(dayWire.days.every((day, index) => index === 0 || dayWire.days[index - 1].day < day.day), 'days ascend')
  check(dayWire.first === DAY_A && dayWire.last === DAY_C + 2000, 'the span runs from the first to the last milestone event')
}

console.log('# per-day-per-model attribution')
{
  const dayA = Math.floor(DAY_A / DAY)
  const dayOne = routeDayWire.days.find((day) => day.day === dayA)
  check(dayOne !== undefined && dayOne.routes.length === 2, 'the first day carries two models')
  check(routeDayWire.days.length === 3, 'three days of per-model detail (' + routeDayWire.days.length + ')')
  const table = routeDayWire.names
  check(table['openai/gpt-x']?.modelName === 'GPT-X', 'the name table carries the model display name')
  check(table['openai/gpt-x']?.providerName === 'OpenAI API', 'the name table carries the provider display name')
  // The provider is a route key (often a gateway), so a vendor label would be a
  // guess presented as a fact. The table claims exactly the two names the registry
  // can support, and nothing else.
  check(Object.keys(table['openai/gpt-x']).sort().join(',') === 'modelName,providerName', 'the name table claims no vendor field')
  check(table['unknown/unknown']?.providerName === 'Unknown route', 'an unmatched route still gets the provider display name')
  check(routeWire.names['openai/gpt-x']?.modelName === 'GPT-X', 'the per-model unit carries the same name table')
}

console.log('# retention windows')
{
  const dayA = Math.floor(DAY_A / DAY)
  const longConfig = { utcOffsetMinutes: 0 }
  const [longRoute, longDay, longRouteDay] = createUsageProjections(longConfig, names)
  let longDayState = longDay.init({}, 0)
  let longRouteState = longRoute.init({}, 0)
  for (let offset = 0; offset < 400; offset += 1) {
    const event = message(offset, 1, usage(1, 1), (dayA + offset) * DAY + 1000)
    longDayState = longDay.apply(longDayState, event)
    longRouteState = longRoute.apply(longRouteState, event)
  }
  check(Object.keys(longDayState.days).length === internals.DAY_WINDOW, 'per-day totals keep exactly the retained window (' + Object.keys(longDayState.days).length + ')')
  check(Number(Object.keys(longDayState.days)[0]) === dayA + 400 - internals.DAY_WINDOW, 'the oldest retained day is the window floor')
  check(longDayState.first === dayA * DAY + 1000, 'the span keeps the session start even after pruning')
  check(Object.keys(longRouteState.totals).length === 1, 'the per-model unit is not windowed by day')
  let longRouteDayState = longRouteDay.init({}, 0)
  for (let offset = 0; offset < 40; offset += 1) {
    longRouteDayState = longRouteDay.apply(longRouteDayState, message(offset, 1, usage(1, 1), (dayA + offset) * DAY + 1000))
  }
  check(Object.keys(longRouteDayState.days).length === internals.ROUTE_DAY_WINDOW, 'per-day-per-model detail keeps its shorter window (' + Object.keys(longRouteDayState.days).length + ')')
  // A gap wider than the window must still prune: the old early return skipped
  // it whenever the map held fewer keys than the window, so a sparse history
  // kept a day >366 days old (the streak and the peak read it; the calendar
  // silently ignores it because it only draws the last year).
  let sparse = longDay.init({}, 0)
  sparse = longDay.apply(sparse, message(1, 1, usage(1, 1), dayA * DAY + 1000))
  sparse = longDay.apply(sparse, message(2, 1, usage(1, 1), (dayA + 400) * DAY + 1000))
  check(
    Object.keys(sparse.days).length === 1 && Number(Object.keys(sparse.days)[0]) === dayA + 400,
    'a gap wider than the window still prunes the old day',
  )
}

console.log('# reference identity (the drive Object.is gate)')
{
  const quiet = routeUnit.apply(routeState, other('turn/end', DAY_C))
  check(quiet === routeState, 'an uninteresting event returns the same state reference')
  const sameHeader = routeUnit.apply(routeState, header('anthropic', 'claude-y', DAY_C))
  check(sameHeader === routeState, 'an unchanged request/header returns the same state reference')
  const sameSample = routeUnit.apply(routeState, message(1, 4, usage(300, 30, 100, 0), DAY_C))
  check(sameSample === routeState, 'a repeated identical sample in the same step returns the same state reference')
  const moved = routeUnit.apply(routeState, message(2, 1, usage(7, 1), DAY_C))
  check(moved !== routeState && moved.last.turn === 2, 'a new turn advances the state')
  const unrelated = other('tool/result', DAY_B + 500)
  check(dayUnit.apply(dayState, unrelated) === dayState, 'an event outside the milestone set does not touch the span')
}

console.log('# retry and replacement semantics')
{
  let doubled = routeUnit.init({}, 0)
  doubled = routeUnit.apply(doubled, header('p', 'm', DAY_A))
  doubled = routeUnit.apply(doubled, retry(1, 1, DAY_A))
  doubled = routeUnit.apply(doubled, message(1, 1, usage(10, 1), DAY_A))
  doubled = routeUnit.apply(doubled, retry(1, 1, DAY_A))
  doubled = routeUnit.apply(doubled, message(1, 1, usage(10, 1), DAY_A))
  check(doubled.totals['p/m'].uncachedInputTokens === 20, 'a retry in the same step bills a second attempt (20)')
  let overwrite = routeUnit.init({}, 0)
  overwrite = routeUnit.apply(overwrite, header('p', 'm', DAY_A))
  overwrite = routeUnit.apply(overwrite, message(1, 1, usage(10, 1), DAY_A))
  overwrite = routeUnit.apply(overwrite, message(1, 1, usage(3, 1), DAY_A))
  check(overwrite.totals['p/m'].uncachedInputTokens === 3, 'a replacement without a retry overwrites, not accumulates')
  let cross = routeUnit.init({}, 0)
  cross = routeUnit.apply(cross, header('p', 'm1', DAY_A))
  cross = routeUnit.apply(cross, message(1, 1, usage(10, 1), DAY_A))
  cross = routeUnit.apply(cross, header('p', 'm2', DAY_A))
  cross = routeUnit.apply(cross, message(1, 1, usage(4, 1), DAY_A))
  check(cross.totals['p/m1'] === undefined, 'a same-step replacement after a route switch leaves no empty route behind')
  check(cross.totals['p/m2'].uncachedInputTokens === 4, 'the replacement is attributed to the route that served it')
  let midnight = dayUnit.init({}, 0)
  midnight = dayUnit.apply(midnight, header('p', 'm', DAY_A))
  midnight = dayUnit.apply(midnight, message(1, 1, usage(10, 1), DAY_A + DAY - 1))
  midnight = dayUnit.apply(midnight, message(1, 1, usage(10, 1), DAY_A + DAY + 1))
  const first = String(Math.floor(DAY_A / DAY))
  const second = String(Math.floor(DAY_A / DAY) + 1)
  check(midnight.days[first] === undefined, 'a cross-midnight replacement clears the earlier day')
  check(midnight.days[second].uncachedInputTokens === 10, 'and lands entirely on the later day')
}

console.log('# cross-midnight replacement in every unit')
{
  // A same-turn same-step replacement can cross midnight: the attempt settles
  // before midnight and the message that supersedes it after. The replace rule
  // is one shared step, so all three units must move the same tokens - and
  // `tokenUsageByRouteByDay` is the one partitioned by day, where a subtract
  // keyed on the route alone would leave the superseded share on the old day
  // (sum(per-day-per-model) then exceeds tokenUsage, and the trend draws a
  // phantom day). The dedicated `midnight` fixture above only drives the
  // per-day unit, which is why this case needs its own differential pass.
  const log = [
    header('openai', 'gpt-x', DAY_A),
    message(1, 1, usage(10, 1), DAY_A + DAY - 1),
    message(1, 1, usage(7, 2), DAY_A + DAY + 1),
  ]
  let crossRoute = routeUnit.init({}, 0)
  let crossDay = dayUnit.init({}, 0)
  let crossRouteDay = routeDayUnit.init({}, 0)
  for (const event of log) {
    crossRoute = routeUnit.apply(crossRoute, event)
    crossDay = dayUnit.apply(crossDay, event)
    crossRouteDay = routeDayUnit.apply(crossRouteDay, event)
  }
  const expected = oracleTotals(log)
  const dayIndex = Math.floor(DAY_A / DAY)
  const crossDayWire = dayUnit.wire.view(crossDay)
  const crossRouteDayWire = routeDayUnit.wire.view(crossRouteDay)
  const crossRouteSum = routeUnit.wire.view(crossRoute).routes.reduce((total, row) => add(total, row.tokens), zero())
  const crossRouteDaySum = crossRouteDayWire.days.reduce(
    (total, day) => day.routes.reduce((inner, row) => add(inner, row.tokens), total),
    zero(),
  )
  check(equal(crossRouteSum, expected), 'per-model keeps only the replacing sample')
  check(
    crossDayWire.days.length === 1 && crossDayWire.days[0].day === dayIndex + 1,
    'per-day clears the earlier day',
  )
  check(
    equal(crossDayWire.days[0].tokens, { uncachedInputTokens: 7, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 }),
    'and lands entirely on the later day',
  )
  check(
    crossRouteDayWire.days.length === 1 && crossRouteDayWire.days[0].day === dayIndex + 1,
    'per-day-per-model does not keep a phantom earlier day',
  )
  check(equal(crossRouteDaySum, expected), 'per-day-per-model sums to the same tokens across the midnight')
}

console.log('# malformed samples (deliberate divergence)')
{
  // The shipped fold maps these straight through, which yields negative counters
  // and NaN for a missing field. These units skip them instead: skipping cannot
  // invent tokens, while propagating certainly corrupts the total.
  let bad = routeUnit.init({}, 0)
  bad = routeUnit.apply(bad, header('p', 'm', DAY_A))
  const clean = bad
  bad = routeUnit.apply(bad, message(1, 1, { inputTokens: -1, outputTokens: 5 }, DAY_A))
  check(bad === clean, 'a negative sample is skipped and keeps the state reference')
  bad = routeUnit.apply(bad, message(1, 1, { inputTokens: 10 }, DAY_A))
  check(bad === clean, 'a sample missing outputTokens is skipped')
  bad = routeUnit.apply(bad, message(1, 1, { inputTokens: 10, outputTokens: 2, cacheReadTokens: 'x' }, DAY_A))
  check(bad === clean, 'a non-numeric cache bucket is skipped')
  check(bad.totals['p/m'] === undefined, 'no route entry is created for skipped samples')
}

console.log('# checkpoint round-trip and wire schemas')
{
  const cases = [
    ['per-model', routeUnit, routeState],
    ['per-day', dayUnit, dayState],
    ['per-day-per-model', routeDayUnit, routeDayState],
  ]
  for (const [label, unit, state] of cases) {
    let restored
    try {
      restored = unit.stateSchema.parse(JSON.parse(JSON.stringify(state)))
    } catch (error) {
      restored = undefined
      console.log('    ' + label + ' state rejected: ' + String(error))
    }
    check(restored !== undefined, label + ': the state survives a JSON round-trip through its own schema')
    const wire = unit.wire.view(restored)
    check(unit.wire.viewSchema.parse(wire) === wire, label + ': the wire view validates against its own schema')
    check(typeof JSON.stringify(wire) === 'string', label + ': the wire view is JSON-serializable')
  }
  let threw = false
  try {
    routeUnit.wire.viewSchema.parse({ names: {}, routes: [{ provider: 'p', model: 'm', tokens: {} }] })
  } catch {
    threw = true
  }
  check(threw, 'the per-model wire schema rejects an incomplete bucket record')
  let stateThrew = false
  try {
    dayUnit.stateSchema.parse({ route: null, last: null, days: { bad: { uncachedInputTokens: 'x' } }, first: null, lastTime: null })
  } catch {
    stateThrew = true
  }
  check(stateThrew, 'the per-day state schema rejects a malformed stored checkpoint')
  let routeDayThrew = false
  try {
    routeDayUnit.stateSchema.parse({ route: null, last: null, days: { 1: 'nope' } })
  } catch {
    routeDayThrew = true
  }
  check(routeDayThrew, 'the per-day-per-model state schema rejects a malformed day map')
}

console.log('# route names')
{
  check(names.providerName('openai') === 'OpenAI API', 'the provider display name comes from the registry')
  check(names.modelName('openai', 'gpt-x') === 'GPT-X', 'the model display name comes from the registry')
  check(names.modelName('openai', 'not-listed') === 'not-listed', 'an unlisted model falls back to its id')
  check(names.providerName('never-registered') === 'never-registered', 'an unmounted provider falls back to its id')
  check(names.vendor === undefined, 'the name cache exposes no vendor helper at all')
  const noLlm = createRouteNames()
  await noLlm.resolve(undefined)
  check(noLlm.providerName('p') === 'p' && noLlm.modelName('p', 'm') === 'm', 'a missing LLM service leaves the raw ids in place')
  const failing = createRouteNames()
  await failing.resolve({
    listProviders: () => [{ id: 'a', name: 'A' }],
    listModels: async () => {
      throw new Error('no models')
    },
  })
  check(failing.providerName('a') === 'A', 'a provider whose model list fails keeps its display name')
  check(failing.modelName('a', 'm') === 'm', 'and falls back to the raw model id')
  const empty = createRouteNames({})
  const resolvedCount = await empty.resolve({ listProviders: () => [], listModels: async () => [] })
  check(resolvedCount === 0, 'an empty registry resolves nothing without throwing')
}

console.log('# registration')
{
  const seen = []
  const effects = []
  const cleanups = []
  const ctx = {
    inject: (keys, callback) => {
      seen.push('inject:' + keys.join(','))
      callback({
        effect: (fn, label) => {
          effects.push(label)
          const cleanup = fn()
          if (typeof cleanup === 'function') cleanups.push(cleanup)
          return cleanup
        },
        llm: fakeLlm,
        sessionProjections: {
          register: (unit) => {
            seen.push('register:' + unit.key)
            return () => undefined
          },
        },
      })
      return () => undefined
    },
  }
  const mod = await import('../lib/index.js')
  mod.apply(ctx, CONFIG)
  check(seen.includes('inject:llm'), 'the LLM registry is injected, not declared as a hard dependency')
  check(seen.includes('inject:sessionProjections'), 'the projection registry is injected the same way')
  check(seen.includes('register:tokenUsageByRoute'), 'the per-model unit registers')
  check(seen.includes('register:tokenUsageByDay'), 'the per-day unit registers')
  check(seen.includes('register:tokenUsageByRouteByDay'), 'the per-day-per-model unit registers')
  check(seen.filter((entry) => entry.startsWith('register:')).length === 3, 'exactly three units register (no money unit left behind)')
  check(!seen.includes('register:tokenUsageByTurn'), 'the removed per-turn unit no longer registers')
  check(effects.length === 2, 'two effects own the contributions (' + effects.length + ')')
  for (const cleanup of cleanups) cleanup()
  mod.apply(null, undefined)
  check(true, 'apply tolerates a missing context instead of breaking the Loader entry')
}

console.log('')
if (failures.length > 0) {
  console.error(failures.length + ' check(s) failed')
  process.exit(1)
}
console.log('all checks passed')
