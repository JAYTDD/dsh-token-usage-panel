/**
 * Self-check for the generated browser bundle.
 *
 * The bundle is generated from `src/*.js` into a
 * `window.__ModuleLoader__.load({ id, factory })` script, so `node --check` only
 * proves it parses. This harness goes beyond parsing:
 *
 *  1. fails when `lib/client.js` is stale against `src/`;
 *  2. executes the script against a stub loader and captures the entry;
 *  3. asserts the entry id is the package name the Host serves;
 *  4. asserts every `ui-primitives` export the bundle destructures really exists;
 *  5. asserts the emitted CSS keeps the layout and motion contracts;
 *  6. runs `apply(ctx)` and asserts both slot registrations;
 *  7. renders both views: the KPI strip, the activity calendar, the trend, and the
 *     model donut labelled gateway + model, and no money anywhere; the table with sorting,
 *     filters, columns, virtualisation, export and keyboard handling;
 *     plus the render gate (unrelated ticks cost zero renders, with the charts
 *     mounted), persistence with a corrupt-value fallback, and read-queue retry.
 *
 * All check messages are ASCII on purpose: this file is UTF-8, and an earlier
 * accidental PowerShell `Set-Content` re-encoded it to the system codepage and
 * corrupted its non-ASCII bytes.
 *
 * Run: node scripts/verify-bundle.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { build, CLIENT_ID, MODULES } from './build.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const bundlePath = join(root, 'lib', 'client.js')
const FILTER_KEY = 'dsh-token-usage-panel.filters.v3'
const LEGACY_KEYS = ['dsh-token-usage-panel.filters.v1', 'dsh-token-usage-panel.filters.v2']
const DAY = 86400000

const failures = []
let checksRun = 0
/** @param condition - falsy fails the check. @param message - reported text. */
function check(condition, message) {
  checksRun += 1
  if (condition) {
    console.log('  ok   ' + message)
    return
  }
  failures.push(message)
  console.log('  FAIL ' + message)
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

console.log('# generated artifact')
{
  const onDisk = readFileSync(bundlePath, 'utf8')
  check(onDisk === build(), 'lib/client.js matches src/ (' + MODULES.length + ' modules); run node scripts/build.mjs to refresh')
}

const source = readFileSync(bundlePath, 'utf8')
console.log('# money removed')
{
  const banned = ['formatCost', 'costTotal', 'costExact', 'costPartial', 'costUnpriced', 'pricing', 'currency', 'costCol']
  const present = banned.filter((token) => source.includes(token))
  check(present.length === 0, 'the browser bundle carries no pricing or cost code' + (present.length > 0 ? ': ' + present.join(', ') : ''))
  const host = readFileSync(join(root, 'lib', 'route-usage.js'), 'utf8')
  const hostBanned = ['priceFor', 'normalizePricing', 'PRICE_UNITS', 'costOf']
  const hostPresent = hostBanned.filter((token) => host.includes(token))
  check(hostPresent.length === 0, 'the host fold carries no pricing either' + (hostPresent.length > 0 ? ': ' + hostPresent.join(', ') : ''))
  // A route is labelled with the gateway and model names the registry supplies. A
  // vendor table baked into the browser would be a guess rendered as a fact, so the
  // client must not know any vendor names at all.
  const names = readFileSync(join(root, 'lib', 'route-names.js'), 'utf8')
  const baked = ['DeepSeek', 'Anthropic', '智谱', '小米', 'OpenAI', 'VENDOR_PREFIXES'].filter((token) => source.includes(token) || names.includes(token))
  check(baked.length === 0, 'no vendor table exists in the client or the name cache' + (baked.length > 0 ? ': ' + baked.join(', ') : ''))
}

//#region hook runtime
/** Whether two dependency lists are equal. */
function sameDeps(left, right) {
  if (left === undefined || right === undefined) return false
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
}

/**
 * Minimal hook runtime modelling the parts of React this panel depends on: hook
 * cells keyed by call order, deps-aware effects and memos, and - crucially -
 * `useSyncExternalStore` re-reading its snapshot on every store notification and
 * bailing out when the value is unchanged, which is what lets the render counter
 * prove the projection gate works.
 */
function createHookRuntime() {
  const state = { slots: [], cursor: 0, dirty: false, effects: [], cleanups: [] }
  const hooks = {
    useState: (init) => {
      const index = state.cursor
      state.cursor += 1
      if (state.slots[index] === undefined) {
        state.slots[index] = { kind: 'state', value: typeof init === 'function' ? init() : init }
      }
      const set = (next) => {
        const cell = state.slots[index]
        const value = typeof next === 'function' ? next(cell.value) : next
        if (!Object.is(value, cell.value)) {
          cell.value = value
          state.dirty = true
        }
      }
      return [state.slots[index].value, set]
    },
    useRef: (init) => {
      const index = state.cursor
      state.cursor += 1
      if (state.slots[index] === undefined) state.slots[index] = { kind: 'ref', current: init }
      return state.slots[index]
    },
    useMemo: (compute, deps) => {
      const index = state.cursor
      state.cursor += 1
      const cell = state.slots[index]
      if (cell !== undefined && sameDeps(cell.deps, deps)) return cell.value
      const value = compute()
      state.slots[index] = { kind: 'memo', deps, value }
      return value
    },
    useCallback: (fn, deps) => {
      const index = state.cursor
      state.cursor += 1
      const cell = state.slots[index]
      if (cell !== undefined && sameDeps(cell.deps, deps)) return cell.value
      state.slots[index] = { kind: 'callback', deps, value: fn }
      return fn
    },
    useEffect: (effect, deps) => {
      const index = state.cursor
      state.cursor += 1
      const cell = state.slots[index]
      if (cell === undefined || !sameDeps(cell.deps, deps)) {
        state.slots[index] = { kind: 'effect', deps }
        state.effects.push(effect)
      }
    },
    useSyncExternalStore: (subscribe, getSnapshot) => {
      const index = state.cursor
      state.cursor += 1
      let cell = state.slots[index]
      if (cell === undefined) {
        cell = { kind: 'store', subscribe: null, unsubscribe: null, getSnapshot: null, value: undefined }
        state.slots[index] = cell
      }
      if (cell.subscribe !== subscribe) {
        if (cell.unsubscribe !== null) cell.unsubscribe()
        cell.subscribe = subscribe
        cell.unsubscribe = subscribe(() => {
          const next = cell.getSnapshot()
          if (!Object.is(next, cell.value)) {
            cell.value = next
            state.dirty = true
          }
        })
      }
      cell.getSnapshot = getSnapshot
      const value = getSnapshot()
      cell.value = value
      return value
    },
    // No renderer here, so a deferred value is just the value; the panel's
    // filtering still runs, only the deferral itself is not observable.
    useDeferredValue: (value) => {
      state.cursor += 1
      return value
    },
  }
  hooks.useLayoutEffect = hooks.useEffect
  return {
    react: {
      createElement: (type, props, ...children) => {
        const flat = children.flat(Infinity)
        const next = { ...(props ?? {}) }
        if (flat.length > 0) next.children = flat.length === 1 ? flat[0] : flat
        return { type, props: next, children: flat }
      },
      ...hooks,
    },
    begin: () => {
      state.cursor = 0
      state.dirty = false
      state.effects = []
    },
    restart: () => {
      for (const cleanup of state.cleanups) cleanup()
      for (const cell of state.slots) {
        if (cell !== undefined && cell.kind === 'store' && cell.unsubscribe !== null) cell.unsubscribe()
      }
      state.slots = []
      state.cursor = 0
      state.dirty = false
      state.effects = []
      state.cleanups = []
    },
    takeEffects: () => {
      const pending = state.effects
      state.effects = []
      return pending
    },
    hasEffects: () => state.effects.length > 0,
    recordCleanup: (cleanup) => state.cleanups.push(cleanup),
    isDirty: () => state.dirty,
  }
}
//#endregion

const runtime = createHookRuntime()
const h = runtime.react.createElement

//#region ui-primitives stub
const ICON_NAMES = [
  'IconChevronDownOutlineRegular',
  'IconCloseOutlineRegular',
  'IconDatabaseOutlineRegular',
  'IconDownloadOutlineRegular',
  'IconFlatListOutlineRegular',
  'IconFolderOpenOutlineRegular',
  'IconRefreshOutlineRegular',
  'IconSearchOutlineRegular',
  'IconSlidersTwoOutlineRegular',
  'IconWarningOutlineRegular',
]
const clipboards = []
const primitivesStub = {
  Button: ({ variant, size, icon, className, children, ...rest }) => h('button', { type: 'button', className, ...rest }, [icon ?? null, children]),
  Input: ({ icon, className, ...rest }) => h('span', { className }, [icon ?? null, h('input', rest)]),
  Checkbox: ({ checked, onChange, label, disabled, title, className }) =>
    h('label', { className, title }, [
      h('input', { type: 'checkbox', checked, disabled, onChange: (event) => onChange(event.target.checked) }),
      h('span', null, label),
    ]),
  Menu: ({ open, anchor, items = [], children, selectedId, selectedIds, onSelect, className }) =>
    h('span', { className }, [
      anchor,
      open
        ? h(
            'div',
            { role: 'menu' },
            items.map((item) => {
              if (item.type === 'separator') return h('div', { key: item.id, role: 'separator' })
              if (item.type === 'label') return h('div', { key: item.id }, item.text)
              const selected = item.id === selectedId || (Array.isArray(selectedIds) && selectedIds.includes(item.id))
              return h('button', { key: item.id, role: 'menuitem', type: 'button', onClick: () => onSelect?.(item.id) }, [
                item.label,
                selected ? ' check' : null,
              ])
            }),
          )
        : null,
      children ?? null,
    ]),
  SegmentedControl: ({ id, value, options, onChange, label, className }) =>
    h(
      'div',
      { className, role: 'tablist', 'aria-label': label },
      options.map((option) =>
        h(
          'button',
          { key: option.value, role: 'tab', type: 'button', 'aria-selected': option.value === value, onClick: () => onChange(option.value) },
          option.label,
        ),
      ),
    ),
  Tag: ({ tone, className, children }) => h('span', { className }, children),
  StateDot: ({ state, size, className, appearance }) => h('span', { className, 'data-state': state }),
  Tooltip: ({ label, children }) => children,
  writeClipboard: (text) => {
    clipboards.push(text)
    return Promise.resolve()
  },
}
for (const name of ICON_NAMES) {
  primitivesStub[name] = (props) => h('svg', { 'data-icon': name, width: props.size ?? 16, height: props.size ?? 16, className: props.className })
}
/** Fail loudly on a primitives name the stub does not know, instead of rendering nothing. */
const primitives = new Proxy(primitivesStub, {
  get(target, property) {
    if (typeof property === 'symbol' || property === 'then') return target[property]
    if (!(property in target)) throw new Error('unknown ui-primitives export used: ' + String(property))
    return target[property]
  },
})
{
  const realPath = join(root, '..', '..', 'research', 'dsh-full', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-client-ui-primitives', 'lib', 'index.js')
  if (existsSync(realPath)) {
    const real = readFileSync(realPath, 'utf8')
    const block = real.lastIndexOf('export {')
    const names = new Set(
      real
        .slice(block, real.indexOf('};', block))
        .replace('export {', '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
    )
    const missing = Object.keys(primitivesStub).filter((name) => !names.has(name))
    check(missing.length === 0, 'every stubbed ui-primitives export exists in the real package' + (missing.length > 0 ? ': ' + missing.join(', ') : ''))
  } else {
    console.log('  skip real ui-primitives cross-check (extracted checkout not present)')
  }
}
//#endregion

//#region sandbox
const cssTags = []
const stored = new Map()
const downloads = []
const sandbox = {
  console,
  Blob: class Blob {
    constructor(parts) {
      this.parts = parts
    }
  },
  URL: {
    createObjectURL: (blob) => {
      downloads.push(blob)
      return 'blob:dsh-tup'
    },
    revokeObjectURL: () => undefined,
  },
  document: {
    querySelector: () => null,
    createElement: (tag) => ({ tagName: tag, dataset: {}, click: () => undefined, remove: () => undefined, appendChild: () => undefined }),
    body: { appendChild: () => undefined },
    head: { appendChild: (tag) => cssTags.push(tag) },
  },
  window: {
    __ModuleLoader__: { load: (entry) => { sandbox.__entry = entry } },
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: (key) => stored.delete(key),
    },
  },
}
sandbox.window.window = sandbox.window
sandbox.globalThis = sandbox
sandbox.setTimeout = setTimeout
sandbox.clearTimeout = clearTimeout
sandbox.window.setTimeout = setTimeout
sandbox.window.clearTimeout = clearTimeout
runInContext(source, createContext(sandbox), { filename: bundlePath })
const entry = sandbox.__entry
//#endregion

console.log('# loader contract')
check(entry !== undefined, 'the script registers one __ModuleLoader__ entry')
check(entry.id === CLIENT_ID, 'entry id is the package name the Host serves (' + String(entry && entry.id) + ')')
const mod = entry.factory((request) => {
  if (request === 'react') return runtime.react
  if (request === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  throw new Error('unexpected require: ' + request)
})
check(cssTags.length === 1, 'materializing the factory injects exactly one style tag')
check(mod.inject.join(',') === 'slots,locale,sessions,uiWorkspace', 'inject names the four required services (' + mod.inject.join(',') + ')')

console.log('# layout and motion contract')
const css = cssTags[0].textContent
const ruleOf = (selector) => {
  const start = css.indexOf(selector + '{')
  if (start === -1) return ''
  return css.slice(start + selector.length + 1, css.indexOf('}', start))
}
const rootRule = ruleOf('.dshTup_root')
const wrapRule = ruleOf('.dshTup_tableWrap')
const scrollRule = ruleOf('.dshTup_tableScroll')
check(rootRule.includes('height:100%') && rootRule.includes('min-height:0'), 'the root is a definite-height, shrinkable flex column')
check(rootRule.includes('overflow:hidden') && rootRule.includes('flex-direction:column'), 'the root itself never scrolls in the table view')
check(rootRule.includes('container-type:inline-size'), 'the root is an inline-size query container for responsive columns')
check(ruleOf('.dshTup_root[data-view=overview]').includes('overflow-y:auto'), 'the overview scrolls as one document instead')
check(
  ruleOf('.dshTup_sessions').includes('flex:1 1 auto') && ruleOf('.dshTup_sessions').includes('min-height:0'),
  'the sessions view is the flexible member of the panel column',
)
check(
  ruleOf('.dshTup_sessions').includes('overflow-y:auto') && ruleOf('.dshTup_sessions').includes('min-height:0'),
  'the sessions view is its own scrollport, so tall cards can never push content out of reach',
)
check(
  wrapRule.includes('flex:0 0 auto') && !/height:/.test(wrapRule),
  'the table band takes its natural height in the page flow instead of a fixed box',
)
check(
  !/height:[^;]*\d(vh|vw)/.test(wrapRule),
  'the table band never sizes itself from the viewport, which is not the panel',
)
// The sessions view owns this view's only scrollport, so the table must not open a
// second one: pagination bounds the row count here, not a scroller. The horizontal axis
// stays scrollable so a column dragged past the pane cannot spill out of the card.
check(
  !scrollRule.includes('overflow:auto') && !scrollRule.includes('overflow-y'),
  'the table is not a vertical scroll container',
)
check(scrollRule.includes('overflow-x:auto'), 'a column dragged past the pane scrolls sideways instead of spilling')
// A bare 720px floor would force a horizontal scrollbar on a narrow pane, which is
// the one thing the responsive columns exist to prevent.
check(
  ruleOf('.dshTup_table').includes('min-width:min(720px,100%)'),
  'the table floor never exceeds the container, so it cannot force a sideways scroll',
)
check(css.includes('@container (max-width: 640px)'), 'a second, tighter breakpoint drops the remaining secondary columns')
check(css.includes('.dshTup_colHideBelow'), 'hidden columns also drop their colgroup track, not just their cells')
{
  const bands = ['.dshTup_head', '.dshTup_summary', '.dshTup_routes', '.dshTup_filters', '.dshTup_foot', '.dshTup_kpi']
  check(
    bands.every((selector) => ruleOf(selector).includes('flex:0 0 auto')),
    'every chrome band is flex:0 0 auto so nothing but the table absorbs the shrink',
  )
}
check(css.includes('th{position:sticky'), 'the header row sticks inside the scrollport')
check(css.includes('--dsw-alias-scrollbar-bg-l2'), 'scrollbars use the theme alias colours')
check(css.includes('prefers-reduced-motion'), 'transitions and animations honour prefers-reduced-motion')
check(css.split('[data-animate=true]').length - 1 >= 8, 'every motion rule is scoped to the motion-enabled root')
check(css.includes('@container (max-width: 900px)'), 'narrow panes drop secondary columns instead of scrolling sideways')
check(
  css.includes('@keyframes dshTup-enter') && css.includes('@keyframes dshTup-rowIn') && css.includes('@keyframes dshTup-bandIn'),
  'the entrance animations are declared',
)
check(css.includes('@keyframes dshTup-shimmer') && css.includes('.dshTup_skelRow'), 'the loading skeleton is declared')
check(
  css.includes('@keyframes dshTup-draw') && css.includes('@keyframes dshTup-sweep') && css.includes('@keyframes dshTup-cellIn') && css.includes('@keyframes dshTup-grow'),
  'the chart growth animations are declared',
)
check(css.includes('--dsh-tup-stagger') && css.includes('animation-delay:calc('), 'the reveal waves are driven by the shared stagger token')
check(css.includes('stroke-dasharray:1'), 'the lines are normalised for the draw-on animation')
check(css.includes('--dsh-tup-row-h:54px') && !css.includes('[data-density'), 'the root carries one row height, with no density variant left')
check(css.includes('.dshTup_trend') && css.includes('.dshTup_heatmap') && css.includes('.dshTup_donut'), 'the chart styles are declared')
check(css.includes('.dshTup_live') && css.includes('clip-path'), 'the live region is visually hidden, not display:none')
{
  // Contrast is a computed result, not a configuration, so the emitted colours are
  // measured rather than merely asserted to exist. The light block remaps four
  // aliases that fail AA on white; the chart palette is deepened for the same
  // reason. Both blocks are parsed back out of the generated CSS.
  const luminance = (hex) => {
    const raw = hex.replace('#', '')
    const full = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw
    const channels = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16) / 255)
    const linear = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const ratio = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((left, right) => right - left)
    return (high + 0.05) / (low + 0.05)
  }
  const declarationsOf = (selector) => {
    const start = css.indexOf(selector + '{')
    if (start === -1) return ''
    return css.slice(start + selector.length + 1, css.indexOf('}', start))
  }
  // Light is the default theme on `body`; dark is opted into by attribute, so the
  // override is scoped as `body:not([data-ds-dark-theme])`.
  const lightRoot = declarationsOf('body:not([data-ds-dark-theme]) .dshTup_root')
  const lightPalette = declarationsOf('body:not([data-ds-dark-theme])')
  const valueOf = (block, name) => {
    const match = new RegExp('--' + name + ':([^;]+)').exec(block)
    return match === null ? null : match[1]
  }
  const WHITE = '#ffffff'
  for (const [name, floor, label] of [
    ['dsw-alias-label-tertiary', 4.5, 'the muted text alias clears AA on white'],
    ['dsw-alias-state-warn-primary', 4.5, 'the warning alias clears AA on white'],
    ['dsw-alias-state-success-primary', 4.5, 'the success alias clears AA on white'],
    ['dsw-alias-state-business-primary', 4.5, 'the business alias clears AA on white'],
  ]) {
    const value = valueOf(lightRoot, name)
    check(value !== null && ratio(value, WHITE) >= floor, label + ' (' + (value === null ? 'missing' : ratio(value, WHITE).toFixed(2) + ':1') + ')')
  }
  for (let index = 1; index <= 8; index += 1) {
    const value = valueOf(lightPalette, 'dsh-tup-c' + index)
    check(value !== null && ratio(value, WHITE) >= 3, 'series colour ' + index + ' is distinguishable on white (' + (value === null ? 'missing' : ratio(value, WHITE).toFixed(2) + ':1') + ')')
  }
}check(css.includes('.dshTup_tooltip'), 'the trend tooltip is declared')

console.log('# slot registration')
const registrations = []
const TODAY = Math.floor(Date.now() / DAY)
/** Build one session summary. */
const summaryOf = (id, title, extra) => ({
  id,
  displayTitle: title,
  running: false,
  blank: false,
  updatedAt: Date.now(),
  cwd: 'C:\\work\\proj',
  retainedBy: { mainView: 0 },
  ...extra,
})
const usageOf = (uncached, output, cacheRead, cacheWrite) => ({
  tokenUsage: { uncachedInputTokens: uncached, outputTokens: output, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite },
  sessionStats: { turns: 6, steps: 21 },
})
const tokens = (uncached, output, cacheRead, cacheWrite) => ({
  uncachedInputTokens: uncached,
  outputTokens: output,
  cacheReadTokens: cacheRead,
  cacheWriteTokens: cacheWrite,
})
/** One route block plus the name table the Host ships with it. */
const routeBlock = (rows) => ({
  names: Object.fromEntries(rows.map((row) => [row.provider + '/' + row.model, row.labels])),
  routes: rows.map((row) => ({ provider: row.provider, model: row.model, tokens: row.tokens })),
})
const dayBlock = (days, first, last, offsetMinutes = 0) => ({ days, first, last, offsetMinutes })
const routeDayBlock = (days) => ({
  names: Object.fromEntries(days.flatMap((entry) => entry.routes).map((row) => [row.provider + '/' + row.model, row.labels])),
  days: days.map((entry) => ({
    day: entry.day,
    routes: entry.routes.map((row) => ({ provider: row.provider, model: row.model, tokens: row.tokens })),
  })),
})
const snapshotOf = (byId, projections, phase = 'ready') => ({ ids: Object.keys(byId), byId, phase, projectionsBySession: projections })

const DEEPSEEK = {
  provider: 'opencodegochat',
  model: 'deepseek-v4.1-flash',
  labels: { providerName: 'opencode go chat', modelName: 'deepseek-v4.1-flash' },
}
const CLAUDE = { provider: 'codexpert', model: 'claude-opus-5-5', labels: { providerName: 'codexpert', modelName: 'claude-opus-5-5' } }

const baseById = {
  's-1': summaryOf('s-1', 'Refactor the sidebar', { running: true, retainedBy: { mainView: 1 } }),
  's-2': summaryOf('s-2', 'Long session', { updatedAt: Date.now() - DAY, cwd: 'C:\\work\\other' }),
  's-3': summaryOf('s-3', 'Sub task', { parentId: 's-1', origin: 'subagent' }),
}
const SPAN_START = (TODAY - 1) * DAY + 1000
const SPAN_END = SPAN_START + 3 * 3600 * 1000
const baseProjections = {
  's-1': {
    values: {
      ...usageOf(12000, 3400, 250000, 8000),
      tokenUsageByRoute: routeBlock([{ ...DEEPSEEK, tokens: tokens(12000, 3400, 250000, 8000) }]),
      tokenUsageByDay: dayBlock(
        [
          { day: TODAY - 1, tokens: tokens(100000, 0, 0, 0) },
          { day: TODAY, tokens: tokens(12000, 3400, 250000, 8000) },
        ],
        SPAN_START,
        SPAN_END,
      ),
      tokenUsageByRouteByDay: routeDayBlock([
        { day: TODAY - 1, routes: [{ ...DEEPSEEK, tokens: tokens(100000, 0, 0, 0) }] },
        { day: TODAY, routes: [{ ...DEEPSEEK, tokens: tokens(12000, 3400, 250000, 8000) }] },
      ]),
    },
    state: 'ready',
  },
  's-2': {
    values: {
      ...usageOf(900, 400, 12000, 0),
      tokenUsageByRoute: routeBlock([{ ...CLAUDE, tokens: tokens(900, 400, 12000, 0) }]),
      tokenUsageByDay: dayBlock([{ day: TODAY - 3, tokens: tokens(900, 400, 12000, 0) }], TODAY * DAY, TODAY * DAY + 3600 * 1000),
      tokenUsageByRouteByDay: routeDayBlock([{ day: TODAY - 3, routes: [{ ...CLAUDE, tokens: tokens(900, 400, 12000, 0) }] }]),
      // `s-2` carries every unit too, so the "stale row" fixture below is owned by
      // `s-3` alone and the read-queue assertions keep their original meaning.
    },
    state: 'ready',
  },
  's-3': { values: {}, state: 'idle' },
}
/** A wide fixture, used to prove the gate and the window hold at scale. */
function bigFixture(count) {
  const byId = {}
  const projections = {}
  for (let index = 0; index < count; index += 1) {
    const id = 'm-' + index
    byId[id] = summaryOf(id, 'Session ' + index, { updatedAt: Date.now() - index * 1000 })
    projections[id] = { values: usageOf(100 + index, 10, 1000, 0), state: 'ready' }
  }
  return { byId, projections }
}
const big = bigFixture(300)
function createListStore(initial) {
  let snapshot = initial
  const listeners = new Set()
  return {
    getSnapshot: () => snapshot,
    subscribe: (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    push: (next) => {
      snapshot = next
      for (const notify of [...listeners]) notify()
    },
  }
}
const listStore = createListStore(snapshotOf(baseById, baseProjections))
const opened = []
const started = []
const refreshCalls = []
let refreshBehavior = 'resolve'
/**
 * Whether a read seeds the full projection block the way the Host does. Enabled
 * only by the stale-cache test, which is the one that has to observe the effect of
 * a refresh rather than just its occurrence.
 */
let seedOnRead = false
const seedBlock = (id) => {
  const seeded = baseProjections[id]?.values
  if (seeded === undefined) return
  const current = listStore.getSnapshot()
  listStore.push({
    ...current,
    projectionsBySession: { ...current.projectionsBySession, [id]: { values: seeded, state: 'ready' } },
  })
}
const ctx = {
  effect: (fn) => fn(),
  locale: { register: () => () => undefined, subscribe: () => () => undefined, bind: () => (key) => key },
  slots: {
    inject: (key, callback) => {
      callback()
      return () => undefined
    },
    register: (options, component) => {
      registrations.push({ options, component })
      return () => undefined
    },
  },
  sessions: {
    list: listStore,
    refresh: () => Promise.resolve(),
    refreshProjections: (id) => {
      refreshCalls.push(id)
      if (refreshBehavior === 'reject') return Promise.reject(new Error('stub read failure'))
      if (seedOnRead) seedBlock(id)
      return Promise.resolve()
    },
  },
  uiWorkspace: { openSession: (id) => opened.push(id), startSession: (workspaceId) => started.push(workspaceId) },
}
mod.apply(ctx)

const panelReg = registrations.find((item) => item.options.name === 'main')
const iconReg = registrations.find((item) => item.options.name === 'sidebar.panellist')
check(registrations.length === 2, 'apply registers exactly two slot entries')
check(panelReg !== undefined && panelReg.options.key === 'token-usage', 'a `main` panel is registered under the panel key')
check(iconReg !== undefined && iconReg.options.id === 'token-usage', 'the sidebar entry id matches the panel key')

//#region render helpers
/**
 * Resolve one element tree into host nodes. Components are invoked exactly once,
 * in tree order, inside the render pass's hook cursor - calling one again from an
 * assertion would advance the cursor out of band and corrupt every state cell.
 */
function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(expand)
  if (typeof node.type === 'function') return expand(node.type(node.props))
  return { type: node.type, props: node.props, children: (node.children ?? []).map(expand) }
}
function textOf(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => textOf(child)).join(' ')
  if (typeof node.type === 'function') throw new Error('unexpanded component reached the walker: ' + String(node.type.name))
  return (node.children ?? []).map((child) => textOf(child)).join(' ')
}
function collect(node, predicate, into = []) {
  if (node === null || typeof node !== 'object') return into
  if (Array.isArray(node)) {
    for (const child of node) collect(child, predicate, into)
    return into
  }
  if (typeof node.type === 'function') throw new Error('unexpanded component reached the walker: ' + String(node.type.name))
  if (predicate(node)) into.push(node)
  for (const child of node.children ?? []) collect(child, predicate, into)
  return into
}

const props = panelReg.options.inject()
props.t = (key, params) => (params === undefined ? key : key + JSON.stringify(params))

let tree = null
let renders = 0
function render() {
  runtime.begin()
  tree = expand(panelReg.component(props))
  renders += 1
}
async function settle() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const effects = runtime.takeEffects()
    for (const effect of effects) {
      const cleanup = effect()
      if (typeof cleanup === 'function') runtime.recordCleanup(cleanup)
    }
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (runtime.isDirty()) {
      render()
      continue
    }
    if (runtime.hasEffects()) continue
    return
  }
  throw new Error('panel did not settle')
}
const text = () => textOf(tree).replace(/\s+/g, ' ')
const rowsIn = () => collect(tree, (node) => node.type === 'tr' && node.props['data-row'] !== undefined)
const titlesIn = () =>
  rowsIn().map((row) =>
    collect(row, (node) => typeof node.props.className === 'string' && node.props.className.includes('dshTup_rowTitleText'))
      .map((node) => textOf(node))
      .join(''),
  )
// The scrollport is the inner element; `.dshTup_tableWrap` is only the shrinkable
// band around it, so scroll assertions must target the inner one.
const tableNode = () => collect(tree, (node) => typeof node.props.className === 'string' && node.props.className.includes('dshTup_tableScroll'))[0]
const rootNode = () => collect(tree, (node) => node.props['data-token-usage-panel'] !== undefined)[0]
const hasClass = (fragment) => collect(tree, (node) => typeof node.props.className === 'string' && node.props.className.includes(fragment)).length
const menuTrigger = (prefix) =>
  collect(tree, (node) => node.type === 'button' && typeof node.props['aria-label'] === 'string' && node.props['aria-label'].startsWith(prefix))[0]
const menuItem = (label) => collect(tree, (node) => node.type === 'button' && node.props.role === 'menuitem' && textOf(node).includes(label))[0]
const ariaSortOf = (labelKey) => collect(tree, (node) => node.type === 'th' && textOf(node).includes(labelKey))[0]?.props['aria-sort']
/** The trend SVG's announced summary; the numbers live in an attribute, not in text. */
const trendAria = () =>
  collect(tree, (node) => node.type === 'svg' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_trend'))[0]?.props[
    'aria-label'
  ]

async function pickMenu(prefix, itemLabel) {
  const trigger = menuTrigger(prefix)
  if (trigger === undefined) throw new Error('no menu trigger ' + prefix)
  trigger.props.onClick()
  await settle()
  const item = menuItem(itemLabel)
  if (item === undefined) {
    throw new Error(
      'no menu item ' + itemLabel + ' under ' + prefix + '; items=[' + collect(tree, (node) => node.props.role === 'menuitem').map((node) => textOf(node)).join(', ') + ']',
    )
  }
  item.props.onClick()
  await settle()
}
async function pickSegment(label) {
  const tab = collect(tree, (node) => node.type === 'button' && node.props.role === 'tab' && textOf(node) === label)[0]
  if (tab === undefined) {
    const available = collect(tree, (node) => node.type === 'button' && node.props.role === 'tab').map((node) => textOf(node))
    throw new Error('no segment ' + label + '; available=[' + available.join(', ') + ']')
  }
  tab.props.onClick()
  await settle()
}
async function clickHeader(labelKey) {
  const header = collect(
    tree,
    (node) => node.type === 'button' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_thBtn') && textOf(node).includes(labelKey),
  )[0]
  if (header === undefined) throw new Error('no header ' + labelKey)
  header.props.onClick()
  await settle()
}
async function toggle(labelKey) {
  const label = collect(tree, (node) => node.type === 'label' && textOf(node).includes(labelKey))[0]
  if (label === undefined) throw new Error('no checkbox ' + labelKey)
  const box = collect(label, (node) => node.type === 'input' && node.props.type === 'checkbox')[0]
  box.props.onChange({ target: { type: 'checkbox', checked: !box.props.checked } })
  await settle()
}
async function reset() {
  const button = collect(tree, (node) => node.type === 'button' && textOf(node).trim() === 'reset')[0]
  if (button === undefined) throw new Error('no reset button')
  button.props.onClick()
  await settle()
}
async function search(value) {
  collect(tree, (node) => node.type === 'input' && node.props.type === 'search')[0].props.onChange({ target: { value } })
  await settle()
}
const showSessions = () => pickSegment('view.sessions')
const showOverview = () => pickSegment('view.overview')
//#endregion

console.log('# overview render')
render()
await settle()
const overview = text()
check(rootNode().props['data-view'] === 'overview', 'the panel opens on the overview')
check(rootNode().props['data-animate'] === 'true', 'the panel enables motion on the root')
check(overview.includes('kpi.total') && overview.includes('kpi.peak') && overview.includes('kpi.current'), 'the KPI strip renders its labels')
check(overview.includes('287K'), 'the cumulative KPI reads the filtered total (287K)')
check(overview.includes('273K'), 'the peak KPI reads the busiest day (273K)')
// The longest-chat KPI was removed at the user's request, so the assertion that
// pinned its duration string is gone with it. The replacement pins the removal:
// neither the label nor the span formatter may come back into the strip. The
// label check must be boundary-aware — `kpi.longestRun` (the streak KPI) is live
// and carries `kpi.longest` as a prefix, so a plain `includes` can never pass.
check(!/kpi\.longest(?!Run)/.test(overview), 'the longest-chat KPI is gone')
check(!overview.includes('duration.'), 'no duration formatter survives in the panel')
check(overview.includes('kpi.days{"n":2}'), 'the streak KPIs read two consecutive days')
check(overview.includes('opencode go chat') && overview.includes('codexpert'), 'the model legend names the gateways')
check(hasClass('dshTup_providerTag') === 2, 'the gateway is its own field beside each model (' + hasClass('dshTup_providerTag') + ')')
check(overview.includes('deepseek-v4.1-flash') && overview.includes('claude-opus-5-5'), 'the model legend names the display models')
check(overview.includes('opencode go chat · deepseek-v4.1-flash'), 'a legend row reads gateway then model')
check(overview.includes('95.4%'), 'the donut legend reports the share (95.4%)')
check(overview.includes('activity.title') && overview.includes('trend.title') && overview.includes('models.title'), 'all three chart cards render')
check(!overview.includes('$') && !overview.includes('cost'), 'no money appears anywhere in the rendered panel')
{
  const cells = collect(tree, (node) => node.type === 'rect' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_cell'))
  check(cells.length === 53 * 7, 'the activity grid renders a year of cells (' + cells.length + ')')
  const filled = cells.filter((cell) => typeof cell.props.fill === 'string' && cell.props.fill.startsWith('color-mix(in srgb, var(--dsh-tup-heat)'))
  check(filled.length === 3, 'exactly the active days are coloured (' + filled.length + ')')
  check(cells.some((cell) => (cell.children ?? []).some((child) => child.type === 'title')), 'every cell carries a date tooltip')
  check(!cells.some((cell) => typeof cell.props.fill === 'string' && cell.props.fill.startsWith('rgba(')), 'no chart colour is a literal rgba that ignores the theme')
  {
    // An interactive day must not be inside a `role="img"` subtree: that role
    // collapses the figure to one image node and prunes the buttons from the
    // accessibility tree, leaving days focusable but undiscoverable.
    const heatmaps = collect(tree, (node) => node.type === 'svg' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_heatmap'))
    const interactive = cells.filter((cell) => cell.props.role === 'button')
    check(heatmaps.length === 1 && heatmaps[0].props.role !== 'img', 'the heatmap does not prune its interactive days as one image')
    check(interactive.length === 0 || interactive.every((cell) => typeof cell.props['aria-label'] === 'string'), 'every selectable day carries a name')
  }
  const segments = collect(tree, (node) => node.type === 'circle' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_donutSegment'))
  check(segments.length === 2, 'the donut draws one segment per model (' + segments.length + ')')
  check(hasClass('dshTup_trendLine') === 2, 'the trend draws one line per model in the window (' + hasClass('dshTup_trendLine') + ')')
  const trend = collect(tree, (node) => node.type === 'svg' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_trend'))[0]
  check(trend !== undefined && trend.props.role === 'img' && typeof trend.props['aria-label'] === 'string', 'the trend is an announced image')
  // The growth animations lean on two structural facts: the heatmap groups its cells
  // by week column so the wave is 53 animations instead of 371, and the line charts
  // normalize their length so CSS can draw them on without measuring a path.
  const waveColumns = collect(tree, (node) => node.type === 'g' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_heatCol'))
  check(waveColumns.length === 53, 'the cells are grouped into one animated column per week (' + waveColumns.length + ')')
  check(waveColumns.every((group) => typeof (group.props.style ?? {})['--dsh-tup-i'] === 'number'), 'every wave column carries its stagger index')
  check(collect(tree, (node) => node.type === 'path' && node.props.pathLength === 1).length === 2, 'every trend line is normalised for the draw-on animation')
}

console.log('# model drill-down')
{
  const legendButtons = collect(tree, (node) => node.type === 'button' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_modelButton'))
  check(legendButtons.length === 2, 'the donut legend offers a button per model')
  legendButtons[0].props.onClick()
  await settle()
  check(rootNode().props['data-view'] === 'sessions', 'selecting a model switches to the sessions view')
  check(rowsIn().length === 1 && titlesIn()[0] === 'Refactor the sidebar', 'only that model session remains (' + rowsIn().length + ')')
  check(text().includes('filter.model'), 'the active model filter is shown as a chip')
  const chip = collect(tree, (node) => node.type === 'button' && textOf(node).includes('filter.model'))[0]
  chip.props.onClick()
  await settle()
  check(rowsIn().length === 3, 'clearing the chip restores every session')
}

console.log('# projection read queue')
check(refreshCalls.length === 1 && refreshCalls[0] === 's-3', 'only the session with no cached column is read (' + refreshCalls.join(',') + ')')
check(text().includes('pending{"n":1}'), 'the unreachable column is reported')

console.log('# render gate')
{
  await sleep(400)
  await settle()
  const before = renders
  for (let tick = 0; tick < 30; tick += 1) {
    listStore.push(snapshotOf({ ...baseById }, { ...baseProjections }, 'ready'))
    await settle()
  }
  check(renders === before, 'thirty identity-only ticks cause zero re-renders with the charts mounted (renders=' + renders + ')')
  const changed = {
    ...baseProjections,
    's-1': { ...baseProjections['s-1'], values: { ...baseProjections['s-1'].values, ...usageOf(13000, 3400, 250000, 8000) } },
  }
  listStore.push(snapshotOf({ ...baseById }, changed, 'ready'))
  await settle()
  check(renders <= before + 2, 'one real usage change costs at most two re-renders (' + (renders - before) + ')')
  check(text().includes('288K') || text().includes('288,700'), 'the changed total reaches the KPI strip')
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
}

console.log('# chart toggles')
{
  await showOverview()
  const filled = collect(tree, (node) => node.type === 'rect' && typeof node.props.fill === 'string' && node.props.fill.startsWith('color-mix(in srgb, var(--dsh-tup-heat)'))
  check(filled.length > 0 && filled.length < 53 * 7, 'the daily reading fills one cell per active day (' + filled.length + ')')
  // Matching the plain text for `activity.week` would also hit `activity.weekday0`,
  // the weekday axis label, so the absence of the toggle is asserted on the tab roles
  // instead — a re-added aggregation control cannot slip past this.
  const activityTabs = collect(
    tree,
    (node) => node.type === 'button' && node.props.role === 'tab' && /^activity\.(day|week|total)$/.test(textOf(node)),
  )
  check(activityTabs.length === 0, 'the activity card offers no aggregation toggle (' + activityTabs.length + ')')
  await pickSegment('kpi.days{"n":30}')
  check(String(trendAria()).includes('"days":30'), 'the trend window follows the range toggle (30 days): ' + trendAria())
  await pickSegment('kpi.days{"n":7}')
  check(String(trendAria()).includes('"days":7'), 'and back to 7 days: ' + trendAria())
}

console.log('# sessions view')
await showSessions()
check(rootNode().props['data-view'] === 'sessions', 'the view control switches to the table')
const baseline = text()
check(baseline.includes('286,700'), 'the headline total sums every session (286,700)')
check(baseline.includes('282,900'), 'the input figure sums the three prompt-side buckets')
check(baseline.includes('262,000'), 'the composition legend reports summed cache reads')
check(titlesIn().join('|') === 'Refactor the sidebar|Long session|Sub task', 'rows render in total-descending order (' + titlesIn().join('|') + ')')
check(rowsIn().length === 3, 'three session rows render (' + rowsIn().length + ')')
check(baseline.includes('badge.subagent') && baseline.includes('badge.current'), 'the subagent and current rows are tagged')
check(baseline.includes('opencode go chat') && baseline.includes('codexpert'), 'the per-model band names the gateways')
check(baseline.includes('models.title') && baseline.includes('models.total'), 'the per-model band renders its title and total')
check(hasClass('dshTup_costCol') === 0, 'no cost column exists in the table')

console.log('# sorting')
await clickHeader('col.total')
check(titlesIn()[0] === 'Sub task', 'clicking the active header flips the direction (lowest first)')
check(ariaSortOf('col.total') === 'ascending', 'the sorted column reports aria-sort (' + String(ariaSortOf('col.total')) + ')')
await pickMenu('sort', 'title')
check(titlesIn().join('|') === 'Long session|Refactor the sidebar|Sub task', 'the sort menu orders by title A to Z')
await clickHeader('col.output')
check(ariaSortOf('col.output') === 'descending', 'a newly chosen measure column starts descending')
await reset()
check(titlesIn().join('|') === 'Refactor the sidebar|Long session|Sub task', 'reset restores the default order')

console.log('# filters')
await pickSegment('range.today')
check(rowsIn().length === 2, 'range=today keeps only today sessions (' + rowsIn().length + ')')
await pickSegment('range.all')
await pickMenu('directory', 'other')
check(rowsIn().length === 1 && text().includes('13,300'), 'the directory menu narrows to one session')
check(textOf(menuTrigger('directory')).includes('other'), 'the directory trigger names the active directory')
await reset()
await search('refactor')
check(rowsIn().length === 1, 'the search box filters by title')
await reset()
await toggle('filter.topLevel')
check(rowsIn().length === 2, 'top-level-only drops the subagent row (' + rowsIn().length + ')')
await reset()
await toggle('filter.used')
check(rowsIn().length === 2, 'used-only drops the session with no usage data (' + rowsIn().length + ')')
await reset()

// The column-visibility menu was removed at the user's request, so the two
// assertions that drove it (hide col.share, then Show all) are gone with it.
// They are replaced by negative assertions that pin the removal, plus the
// positive one that every column now renders unconditionally.
console.log('# column visibility menu removed')
check(menuTrigger('columns.title') === undefined, 'no column-visibility trigger is offered')
check(!text().includes('columns.all'), 'no show-all row is offered')
check(hasClass('dshTup_share') > 0, 'every column renders unconditionally (share included)')
check(rootNode().props['data-density'] === undefined && rootNode().props.style['--dsh-tup-row-h'] === '54px', 'the row height is fixed at the comfortable value')
check(!text().includes('density.'), 'no density control is offered')

console.log('# persistence')
check(stored.has(FILTER_KEY), 'filters are written under the v3 key')
stored.set(FILTER_KEY, '{"range":"nonsense","hiddenColumns":["nope"],"density":"weird","view":"nope","trendDays":9,"activity":"nope","query":42}')
for (const key of LEGACY_KEYS) stored.set(key, '{"range":"today","view":"overview"}')
runtime.restart()
render()
await settle()
check(rootNode().props['data-view'] === 'overview', 'a corrupt entry falls back to the default view')
check(JSON.parse(stored.get(FILTER_KEY)).range === 'all', 'the defaults are written back over the corrupt entry')
check(JSON.parse(stored.get(FILTER_KEY)).trendDays === 7, 'an out-of-range trend window falls back to 7')
await showSessions()
check(rowsIn().length === 3, 'and the table still lists every session')
await reset()

console.log('# keyboard')
{
  const root = rootNode()
  const fired = []
  root.props.onKeyDown({ key: 'r', target: { tagName: 'DIV' }, preventDefault: () => fired.push('refresh') })
  check(fired.length === 1, 'r is intercepted outside a text field')
  root.props.onKeyDown({ key: 'r', target: { tagName: 'INPUT' }, preventDefault: () => fired.push('typed') })
  check(fired.length === 1, 'r inside the search box is left alone')
  root.props.onKeyDown({ key: '/', target: { tagName: 'DIV' }, preventDefault: () => fired.push('focus') })
  check(fired.length === 2, '/ is intercepted to focus the search box')
  await search('abc')
  root.props.onKeyDown({ key: 'Escape', target: { tagName: 'INPUT' }, preventDefault: () => undefined })
  await settle()
  check(collect(tree, (node) => node.type === 'input' && node.props.type === 'search')[0].props.value === '', 'Escape in the search box clears the query')
}

console.log('# export')
{
  clipboards.length = 0
  await pickMenu('export', 'export.copy')
  check(clipboards.length === 1, 'the export menu writes the clipboard')
  const lines = clipboards[0].split('\n')
  const header = lines[0].split('\t')
  check(header.includes('col.session') && header.includes('col.output'), 'the TSV header names the visible columns')
  check(!header.includes('col.cost') && !clipboards[0].includes('$'), 'the export carries no cost column or money')
  check(lines.length === 4, 'the TSV carries a header plus one line per filtered row (' + lines.length + ')')
  check(lines[1].split('\t').includes('273400'), 'numeric cells are exported as raw numbers (273400)')
  check(text().includes('export.copied'), 'the trigger confirms the copy')
}
{
  menuTrigger('export').props.onClick()
  await settle()
  menuItem('export.download').props.onClick()
  await settle()
  check(downloads.length === 1 && downloads[0].parts[0].startsWith('\ufeff'), 'the download path builds a BOM-prefixed CSV')
  check(downloads[0].parts[0].includes('Refactor the sidebar'), 'the CSV carries the row titles')
}

console.log('# pagination bounds the table')
{
  listStore.push(snapshotOf(big.byId, big.projections, 'ready'))
  await settle()
  // 300 sessions, one page of `PAGE_SIZE` rows: the table receives the page, not the
  // corpus, so the virtual window (threshold 100) can never engage and no spacer row
  // is ever emitted. That is the whole reason the band no longer needs a definite
  // height: the band takes its natural height in the page flow.
  const scroller = tableNode()
  check(rowsIn().length === 20, 'a 300-row list renders exactly one page (' + rowsIn().length + ' rows)')
  check(hasClass('dshTup_spacer') === 0, 'no spacer row exists: pagination replaced the virtual window')
  check(text().includes('page.status'), 'the footer reports the page position')
  check(text().includes('page.next'), 'the footer offers the next page')
  scroller.props.onScroll({ currentTarget: { scrollTop: 5400, clientHeight: 540 } })
  await settle()
  check(rowsIn().length === 20, 'scrolling the body cannot change the rendered page (' + rowsIn().length + ' rows)')
  check(hasClass('dshTup_hideBelow') > 0, 'responsive columns are marked for the container query')
  check(
    collect(tree, (node) => node.type === 'col' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_colHide')).length > 0,
    'each responsive column drops its colgroup track alongside its cells',
  )
  // Let the count-up window close first: its timer is a real state change and
  // would otherwise land inside the measurement below.
  await sleep(400)
  await settle()
  const before = renders
  for (let tick = 0; tick < 20; tick += 1) {
    listStore.push(snapshotOf({ ...big.byId }, { ...big.projections }, 'ready'))
    await settle()
  }
  check(renders === before, 'twenty identity-only ticks with 300 rows still cost zero renders')
  // A jump must cross pages: the current row sorts last (lowest total) while the
  // table renders one page at a time. Before the fix the focus effect searched
  // only the rendered page, missed, and cleared the request - a silent no-op.
  const currentById = { ...big.byId, 'm-299': { ...big.byId['m-299'], retainedBy: { mainView: 1 } } }
  listStore.push(snapshotOf(currentById, big.projections, 'ready'))
  await settle()
  const jump = collect(tree, (node) => node.type === 'button' && textOf(node).trim() === 'jumpToCurrent')[0]
  check(jump !== undefined, 'the jump-to-current control appears for a row beyond page one')
  jump.props.onClick()
  await settle()
  check(rowsIn().some((row) => row.props['data-row'] === 'm-299'), 'jumping reaches a current session past the first page')
  check(rowsIn().some((row) => textOf(row).includes('badge.current')), 'the reached row keeps the current tag')
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
  check(rowsIn().length === 3, 'the small fixture comes back without a window')
}

console.log('# stale cache rows (tokenUsage present, newer units absent)')
{
  // This is the shape of every cache row written before this plugin existed: the
  // official tokenUsage is there, the three units added later are not. Keying the
  // read queue on tokenUsage alone left the charts and the per-model breakdown
  // covering only the sessions that happened to be live — measured at 14% of a real
  // profile's tokens. The queue must refresh those rows regardless.
  const staleProjections = {
    's-1': { values: usageOf(12000, 3400, 250000, 8000), state: 'ready' },
    's-2': { values: usageOf(900, 400, 12000, 0), state: 'ready' },
    's-3': { values: {}, state: 'idle' },
  }
  seedOnRead = true
  refreshCalls.length = 0
  runtime.restart()
  listStore.push(snapshotOf(baseById, staleProjections, 'ready'))
  render()
  await settle()
  await settle()
  const readIds = [...new Set(refreshCalls)].sort()
  check(readIds.join(',') === 's-1,s-2,s-3', 'a row with cached tokenUsage but missing units is still refreshed (' + readIds.join(',') + ')')
  check(refreshCalls.length === 3, 'each stale row is read exactly once (' + refreshCalls.length + ')')
  await showOverview()
  check(text().includes('opencode go chat') && text().includes('codexpert'), 'the refreshed rows populate the model legend')
  const filled = collect(tree, (node) => node.type === 'rect' && typeof node.props.fill === 'string' && node.props.fill.startsWith('color-mix(in srgb, var(--dsh-tup-heat)'))
  check(filled.length >= 3, 'and the refreshed rows populate the activity calendar (' + filled.length + ' days)')
  await showSessions()
  check(rowsIn().length === 3, 'the table still lists every session')
}

console.log('# a Host without the extra units is probed once')
{
  // Same stale shape, but the reads never produce the day unit: the panel must
  // conclude the Host half is absent and stop folding logs for it, instead of
  // re-queueing forever.
  seedOnRead = false
  refreshBehavior = 'resolve'
  refreshCalls.length = 0
  runtime.restart()
  listStore.push(
    snapshotOf(
      baseById,
      {
        's-1': { values: usageOf(12000, 3400, 250000, 8000), state: 'ready' },
        's-2': { values: usageOf(900, 400, 12000, 0), state: 'ready' },
        's-3': { values: {}, state: 'idle' },
      },
      'ready',
    ),
  )
  render()
  await settle()
  await settle()
  await settle()
  const first = refreshCalls.length
  check(first === 3, 'the probe reads each stale row once (' + first + ')')
  await sleep(120)
  await settle()
  check(refreshCalls.length === first, 'and no further reads follow once the units are known absent (' + refreshCalls.length + ')')
  await showOverview()
  check(text().includes('chart.empty'), 'the overview says why instead of drawing an empty chart')
  await showSessions()
  // A refresh re-opens the probe: the verdict may have been a false "no" (a
  // store that lagged the first read) and the Host half may have appeared since.
  // It is the only recovery path, so the reads must run again.
  const beforeRefresh = refreshCalls.length
  const refreshButton = collect(tree, (node) => node.type === 'button' && textOf(node).trim() === 'refresh')[0]
  check(refreshButton !== undefined, 'the refresh control is available to re-probe')
  refreshButton.props.onClick()
  await settle()
  await settle()
  check(
    refreshCalls.length > beforeRefresh,
    'a refresh re-probes a Host previously declared unit-less (' + (refreshCalls.length - beforeRefresh) + ' new reads)',
  )
}

console.log('# skeleton, empty state, and current session')
{
  refreshBehavior = 'resolve'
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
  listStore.push(snapshotOf({}, {}, 'pending'))
  await settle()
  check(hasClass('dshTup_skelRow') > 0, 'a pending list shows the skeleton')
  await showOverview()
  check(text().includes('chart.empty'), 'the overview explains that no per-day data exists yet')
  await showSessions()
  listStore.push(snapshotOf({}, {}, 'ready'))
  await settle()
  check(hasClass('dshTup_skelRow') === 0 && text().includes('empty'), 'an empty profile shows the empty state rather than a stuck skeleton')
  const action = collect(tree, (node) => node.type === 'button' && textOf(node).trim() === 'emptyAction')[0]
  check(action !== undefined, 'the empty state offers a call to action')
  action.props.onClick()
  check(started.length === 1, 'the call to action starts a session')
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
  await search('nothing-matches-this')
  check(rowsIn().length === 0, 'a filter can hide every row')
  const jump = collect(tree, (node) => node.type === 'button' && textOf(node).trim() === 'jumpToCurrent')[0]
  check(jump !== undefined, 'a jump-to-current control is offered')
  jump.props.onClick()
  await settle()
  check(rowsIn().length === 3 && rowsIn().some((row) => textOf(row).includes('badge.current')), 'jumping clears the filters and keeps the current tag')
}

console.log('# failed read is contained')
refreshBehavior = 'reject'
refreshCalls.length = 0
runtime.restart()
render()
await settle()
check(refreshCalls.length === 1, 'a rejected read is attempted once (' + refreshCalls.length + ')')
check(rowsIn().length === 3, 'the failed row is still listed')
const retry = collect(tree, (node) => node.type === 'button' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_retry'))[0]
check(retry !== undefined, 'the failed row offers a retry')
retry.props.onClick({ stopPropagation: () => undefined })
await settle()
check(refreshCalls.length === 2, 'retrying re-enqueues the read (' + refreshCalls.length + ')')
await settle()
check(refreshCalls.length === 2, 'a rejected read is not retried on its own')
check(text().includes('286,700'), 'the panel still totals the sessions that did resolve')

console.log('# runtime usage audit')
{
  // The §5.9 class of drift: a row whose per-model sum disagrees with its own
  // total. tokenUsageByRoute is unwindowed, so equality must hold exactly.
  const driftProjections = {
    ...baseProjections,
    's-1': {
      ...baseProjections['s-1'],
      values: {
        ...baseProjections['s-1'].values,
        tokenUsageByRoute: routeBlock([{ ...DEEPSEEK, tokens: tokens(11000, 3400, 250000, 8000) }]),
      },
    },
  }
  refreshBehavior = 'resolve'
  seedOnRead = false
  runtime.restart()
  listStore.push(snapshotOf(baseById, driftProjections, 'ready'))
  render()
  await settle()
  check(text().includes('audit{'), 'a row whose model sum drifts from its total is reported')
  const auditNode = collect(tree, (node) => typeof node.props.className === 'string' && node.props.className.includes('dshTup_audit'))[0]
  check(auditNode !== undefined && String(auditNode.props.title).includes('272,400') && String(auditNode.props.title).includes('273,400'), 'the audit tooltip names the row and both totals (272,400 vs 273,400)')
  // Scope guard: in the honest base fixture the day window sums PAST the session
  // total (387400 > 287400 for s-1) while the routes match exactly — clipping is
  // by design, so the audit must stay silent there.
  runtime.restart()
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  render()
  await settle()
  check(!text().includes('audit'), 'a day window that legitimately exceeds the total is not flagged')
  // A pending row without the route unit is the read queue's business, not drift.
  runtime.restart()
  listStore.push(
    snapshotOf(
      baseById,
      {
        's-1': { values: usageOf(12000, 3400, 250000, 8000), state: 'ready' },
        's-2': { values: usageOf(900, 400, 12000, 0), state: 'ready' },
        's-3': { values: {}, state: 'idle' },
      },
      'ready',
    ),
  )
  render()
  await settle()
  await settle()
  check(!text().includes('audit'), 'rows still awaiting their route unit are not reported as drift')
}

console.log('# host UTC offset reaches the calendar')
{
  /**
   * The same-tz trap: on a browser sharing the Host's timezone, offset 0 and the
   * true offset render the SAME date, so a naive test proves nothing. A whole-day
   * (1440 minute) offset cannot cancel - every date must shift by exactly one day.
   * Before the fix `readDayUsage` dropped the field, both renders agreed, and this
   * goes red. The comparison only uses the rendered strings, so it does not depend
   * on the date helpers being right.
   */
  const cellDate = (needle) => {
    const cell = collect(
      tree,
      (node) => node.type === 'rect' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_cell'),
    ).find((cell) => (cell.children ?? []).some((child) => child.type === 'title' && textOf(child).includes(needle)))
    if (cell === undefined) return undefined
    const title = textOf((cell.children ?? []).find((child) => child.type === 'title'))
    return title.slice(0, 10)
  }
  const daysBetween = (earlier, later) =>
    Math.round((Date.parse(later + 'T00:00:00Z') - Date.parse(earlier + 'T00:00:00Z')) / DAY)

  await reset()
  await showOverview()
  const span = baseProjections['s-1'].values.tokenUsageByDay
  const offsetProjections = {
    ...baseProjections,
    's-1': {
      ...baseProjections['s-1'],
      values: { ...baseProjections['s-1'].values, tokenUsageByDay: dayBlock(span.days, span.first, span.last, 1440) },
    },
  }
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
  const before = cellDate('273,400')
  check(typeof before === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(before), 'an activity cell titles itself with an ISO date (' + before + ')')
  listStore.push(snapshotOf(baseById, offsetProjections, 'ready'))
  await settle()
  const shifted = cellDate('273,400')
  check(typeof shifted === 'string' && daysBetween(shifted, before) === 1, 'a one-day Host offset shifts the rendered date by exactly one day (' + before + ' -> ' + shifted + ')')
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
  check(cellDate('273,400') === before, 'the offset participates in row identity, so restoring it restores the date (' + cellDate('273,400') + ')')
  // The day chip must label the selected day in the frame the cell that set it
  // used. The chip lives in the sessions view, where the calendar is not mounted
  // - the exact seam where a dropped offset falls back to 0. On this UTC+8
  // machine 0 and +480 render the same date, so only the whole-day offset (which
  // cannot cancel) exposes the difference.
  listStore.push(snapshotOf(baseById, offsetProjections, 'ready'))
  await settle()
  const shiftedCell = collect(
    tree,
    (node) => node.type === 'rect' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_cell'),
  ).find((cell) => (cell.children ?? []).some((child) => child.type === 'title' && textOf(child).includes('273,400')))
  const shiftedDate = textOf((shiftedCell.children ?? []).find((child) => child.type === 'title')).slice(0, 10)
  shiftedCell.props.onClick()
  await settle()
  check(rootNode().props['data-view'] === 'sessions', 'a cell click leaves the overview before the chip is read')
  const offsetChip = collect(tree, (node) => node.type === 'button' && textOf(node).includes('filter.day'))[0]
  check(offsetChip !== undefined && textOf(offsetChip).includes(shiftedDate), 'the day chip labels the Host frame, not UTC (' + shiftedDate + ')')
  offsetChip.props.onClick()
  await settle()
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
}

console.log('# a registry rename reaches the trend legend')
{
  await reset()
  await showOverview()
  // The trend legend reads its labels from `tokenUsageByRouteByDay` while the
  // donut reads them from `tokenUsageByRoute`. A rename with unchanged tokens
  // must reach the trend: skipping the label comparison in the day rows'
  // identity froze the legend behind a reused row object.
  const renamed = routeDayBlock([
    { day: TODAY - 1, routes: [{ ...DEEPSEEK, labels: { providerName: 'opencode go chat', modelName: 'glow-1' }, tokens: tokens(100000, 0, 0, 0) }] },
    { day: TODAY, routes: [{ ...DEEPSEEK, labels: { providerName: 'opencode go chat', modelName: 'glow-1' }, tokens: tokens(12000, 3400, 250000, 8000) }] },
  ])
  listStore.push(
    snapshotOf(
      baseById,
      {
        ...baseProjections,
        's-1': { ...baseProjections['s-1'], values: { ...baseProjections['s-1'].values, tokenUsageByRouteByDay: renamed } },
      },
      'ready',
    ),
  )
  await settle()
  check(text().includes('glow-1'), 'a renamed model reaches the trend legend without a token change')
  check(text().includes('deepseek-v4.1-flash'), 'the donut keeps its own registry name')
  listStore.push(snapshotOf(baseById, baseProjections, 'ready'))
  await settle()
  check(!text().includes('glow-1'), 'and the rename leaves with the data')
}

console.log('# click a day to filter')
{
  await reset()
  await showOverview()
  // Locate a cell by ITS OWN rendered label rather than by re-deriving the date:
  // dateOfDay/formatDayIso work in the browser's local frame, so a hand-rolled
  // toISOString() would disagree by a day on any timezone east of UTC (this
  // machine is UTC+8) - the same same-zone trap that hid the original offset bug.
  const cells = collect(
    tree,
    (node) => node.type === 'rect' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_cell'),
  )
  const clickable = cells.filter((cell) => cell.props.onClick !== undefined)
  check(clickable.length > 0, 'the days that carry usage are clickable (' + clickable.length + ' of ' + cells.length + ')')
  check(cells.length - clickable.length > 0, 'the empty days stay inert')

  clickable[0].props.onClick()
  await settle()
  check(rootNode().props['data-view'] === 'sessions', 'clicking a day switches to the sessions view')
  check(text().includes('filter.day'), 'the active day filter is shown as a chip')
  check(rowsIn().length < 3, 'the day narrows the table (' + rowsIn().length + ' of 3)')
  // The overview's KPI total ignores the day filter exactly like its calendar
  // and trend do; only the table is day-scoped. A KPI reading the day's subtotal
  // beside a year of chart was the same "chart answers itself" contradiction.
  await showOverview()
  check(text().includes('287K'), 'the overview total keeps ignoring the day filter')
  await showSessions()

  const chip = collect(tree, (node) => node.type === 'button' && textOf(node).includes('filter.day'))[0]
  check(chip !== undefined, 'the day chip is a button')
  chip.props.onClick()
  await settle()
  check(rowsIn().length === 3, 'clearing the day chip restores every session')
}

console.log('# column widths')
{
  await reset()
  await showSessions()
  const handles = collect(tree, (node) => typeof node.props.className === 'string' && node.props.className.includes('dshTup_resizeHandle'))
  check(handles.length >= 2, 'every visible column offers a resize handle (' + handles.length + ')')
  const before = collect(tree, (node) => node.type === 'col').map((node) => node.props.style.width)
  check(before.length > 0, 'the table declares its column widths (' + before.length + ' col(s))')
  const handle = handles[0]
  const key = handle.props['data-column']
  handle.props.onPointerDown({ clientX: 100, pointerId: 1, currentTarget: { setPointerCapture: () => undefined } })
  await settle()
  handle.props.onPointerMove({ clientX: 160, pointerId: 1 })
  await settle()
  handle.props.onPointerUp({ pointerId: 1 })
  await settle()
  const after = collect(tree, (node) => node.type === 'col').map((node) => node.props.style.width)
  check(JSON.stringify(after) !== JSON.stringify(before), 'dragging a handle changes that column width')
  const persisted = JSON.parse(stored.get(FILTER_KEY))
  check(persisted.columnWidths !== undefined && persisted.columnWidths[key] !== undefined, 'the custom width persists under the filter key (' + key + ')')
  await reset()
  const afterReset = collect(tree, (node) => node.type === 'col').map((node) => node.props.style.width)
  check(JSON.stringify(afterReset) === JSON.stringify(before), 'reset restores the default column widths')
}

console.log('# header sort buttons leave the tab order')
{
  await reset()
  await showSessions()
  const sortButtons = collect(
    tree,
    (node) => node.type === 'button' && typeof node.props.className === 'string' && node.props.className.includes('dshTup_thBtn'),
  )
  check(sortButtons.length > 0, 'the header still renders its sort buttons (' + sortButtons.length + ')')
  check(sortButtons.every((button) => button.props.tabIndex === -1), 'no header sort button is a tab stop')
  check(sortButtons.every((button) => typeof button.props['aria-label'] === 'string'), 'each header sort button keeps an accessible name')
  const headers = collect(tree, (node) => node.type === 'th' && node.props['aria-sort'] !== undefined)
  check(headers.length === sortButtons.length, 'the aria-sort announcement is unchanged (' + headers.length + ')')
  // The resize handles must not become tab stops either.
  const handles = collect(tree, (node) => typeof node.props.className === 'string' && node.props.className.includes('dshTup_resizeHandle'))
  check(handles.every((handle) => handle.props.tabIndex === -1), 'no resize handle is a tab stop (' + handles.length + ')')
  // The sort menu is the keyboard path now, so it must stay reachable.
  const trigger = menuTrigger('sort.by')
  check(trigger !== undefined && trigger.props.tabIndex !== -1, 'the sort menu remains the keyboard entry point')
}

console.log('# per-turn card removal')
{
  await reset()
  await showSessions()
  // The card is gone, so neither its title nor its chart may come back: the unit
  // that fed it is no longer projected, and a render site that survived would be
  // fed by a read the Host never answers. The negative form is boundary-anchored
  // so a live key that merely starts with `turn.` cannot satisfy it.
  const rendered = text()
  check(!/turn\.title(?![\w])/.test(rendered), 'the per-turn card no longer renders')
  const turnSvg = collect(tree, (node) => typeof node.props.className === 'string' && node.props.className.includes('dshTup_turnTrend'))
  check(turnSvg.length === 0, 'no per-turn chart element survives (' + turnSvg.length + ')')
}

console.log('')
if (failures.length > 0) {
  console.error(failures.length + ' of ' + checksRun + ' check(s) failed')
  process.exit(1)
}
// Printed so the README count is a measurement rather than a claim: a
// check that runs inside a loop counts once per execution, not once per call site.
console.log(checksRun + ' ok')
console.log('all checks passed')
