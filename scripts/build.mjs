/**
 * Generate `lib/client.js` from the modules under `src/`.
 *
 * Why a local generator instead of the shipped build: DSH's client bundles are
 * produced by repo-internal tsdown tooling (`clientBundle()`), which is not
 * present in an installed app — there is no tsdown, esbuild, rollup, or build
 * package anywhere under `resources/app.asar`. This script reaches the same
 * artifact contract with zero dependencies: modules are concatenated inside the
 * `window.__ModuleLoader__.load({ id, factory })` wrapper that the browser's
 * module system expects, and the result is committed so the Host can serve it.
 *
 * The artifact is generated, never edited: `--check` fails when `lib/client.js`
 * is stale, and the self-check runs it, so the committed bundle can never drift
 * from `src/`.
 *
 * Usage:
 *   node scripts/build.mjs          # write lib/client.js
 *   node scripts/build.mjs --check  # fail when lib/client.js is stale
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

/** Package name; the Host serves the bundle under this id. */
export const CLIENT_ID = 'dsh-token-usage-panel'

/**
 * Concatenation order. Everything is plain top-level declarations evaluated in
 * this order inside one factory closure, so a module may only reference another
 * module's bindings from inside a function body — never at evaluation time.
 */
export const MODULES = [
  '00-boot.js',
  '05-constants.js',
  '10-format.js',
  '20-usage.js',
  '30-filters.js',
  '40-data.js',
  '45-audit.js',
  '50-css.js',
  '55-locales.js',
  '60-atoms.js',
  '65-charts.js',
  '70-table.js',
  '80-panel.js',
  '99-apply.js',
]

const BANNER = [
  '// GENERATED FILE — do not edit.',
  '// Source of truth: src/*.js. Regenerate with: node scripts/build.mjs',
  '// Checked for staleness by: node scripts/verify-bundle.mjs',
].join('\n')

/** Indent every non-empty line of a module body to sit inside the factory. */
function indent(body) {
  return body
    .split('\n')
    .map((line) => (line === '' ? line : '\t\t' + line))
    .join('\n')
}

/** Assemble the full browser bundle text. */
export function build() {
  const body = MODULES.map((name) => readFileSync(join(root, 'src', name), 'utf8').replace(/\s+$/, '')).join('\n\n')
  return [
    BANNER,
    'window.__ModuleLoader__.load({',
    `\tid: ${JSON.stringify(CLIENT_ID)},`,
    '\tfactory: (require) => {',
    '\t\tvar module = { exports: {} };',
    '\t\tvar exports = module.exports;',
    '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
    '',
    indent(body),
    '',
    '\t\texports.apply = apply;',
    '\t\texports.inject = inject;',
    '\t\treturn module.exports;',
    '\t},',
    '});',
    '',
  ].join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = join(root, 'lib', 'client.js')
  const next = build()
  if (process.argv.includes('--check')) {
    let current
    try {
      current = readFileSync(target, 'utf8')
    } catch {
      console.error('lib/client.js is missing; run: node scripts/build.mjs')
      process.exit(1)
    }
    if (current !== next) {
      console.error('lib/client.js is stale; run: node scripts/build.mjs')
      process.exit(1)
    }
    console.log('lib/client.js is up to date (' + MODULES.length + ' modules)')
  } else {
    writeFileSync(target, next)
    console.log('wrote lib/client.js from ' + MODULES.length + ' modules (' + next.length + ' bytes)')
  }
}
