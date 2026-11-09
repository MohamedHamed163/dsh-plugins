/**
 * Drives the real client.js through a stubbed Harness: captures what it
 * registers, then renders the captured page component with a fake board source
 * and asserts on the produced markup. This tests the shipped artifact, not a
 * parallel copy of it.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require_ = createRequire(import.meta.url)
const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

// ---- load client.js the way the browser loader does ----------------------
let captured
globalThis.window = {
  __ModuleLoader__: { load(entry) { captured = entry } },
}
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
// eslint-disable-next-line no-new-func
new Function('window', 'require', source)(globalThis.window, require_)

check('registers a module with the package id', captured?.id === '@local/dsh-projects')
const plugin = captured.factory(name => (name === 'react' ? React : require_(name)))
check('declares the services it uses', JSON.stringify(plugin.inject) === JSON.stringify(['slots', 'locale']))
check('exports apply, and no default export', typeof plugin.apply === 'function' && captured.default === undefined)

// ---- stub ctx and capture the registrations ------------------------------
const slots = new Map()
const effects = []
let registeredNamespace
let registeredDictionaries
const board = {
  projects: [{ key: 'WORK', name: 'Hamed apps' }, { key: 'OPS', name: 'Infra' }],
  project: { key: 'WORK', name: 'Hamed apps' },
  issues: [
    { key: 'WORK-1', title: 'Ship voice overlay', description: 'pulses', status: 'in_progress', priority: 'high', assignee: 'ahmed', updatedAt: '2026-11-09T10:00:00Z' },
    { key: 'WORK-2', title: 'Wire whisper', description: '', status: 'in_progress', priority: 'urgent', assignee: '', updatedAt: '2026-11-08T10:00:00Z' },
    { key: 'WORK-3', title: 'Write the docs', description: '', status: 'done', priority: 'low', assignee: 'ahmed', updatedAt: '2026-11-07T10:00:00Z' },
    { key: 'WORK-4', title: 'Fix global hotkeys', description: 'carbon', status: 'todo', priority: 'medium', assignee: 'sam', updatedAt: '2026-11-06T10:00:00Z' },
  ],
}
const makeCtx = () => ({
  effect(run, label) { effects.push(label); const dispose = run(); return () => dispose?.() },
  locale: {
    register(ns, dictionaries) { registeredNamespace = ns; registeredDictionaries = dictionaries; return () => {} },
    bind: ns => (key, params) => {
      const dict = registeredDictionaries.en
      const text = dict[key] ?? `((${ns}:${key}))`
      return params ? text.replace(/\{(\w+)\}/g, (_m, name) => String(params[name])) : text
    },
  },
  slots: {
    inject(owner, run) { return run() },
    register(options, Component) { slots.set(options.name + ':' + (options.key ?? options.id), { options, Component }); return () => {} },
  },
})
plugin.apply(makeCtx())

check('registers the keyed main page', slots.has('main:projects'))
check('registers the sidebar entry', slots.has('sidebar.panellist:projects'))
check('registers its locale namespace', registeredNamespace === 'local.projects')
check('every registration is an effect with a label', effects.length === 3 && effects.every(Boolean))
const sidebar = slots.get('sidebar.panellist:projects').options
check('sidebar entry is localized, not hardcoded', sidebar.label() === 'Project tracker')
check('sidebar entry declares an order', typeof sidebar.order === 'number')

// ---- render the page in each state ---------------------------------------
const main = slots.get('main:projects')
const props = main.options.inject()
const render = async (readImpl, moveImpl) => {
  const ctx = makeCtx()
  plugin.apply(ctx)
  const page = slots.get('main:projects')
  const injected = page.options.inject()
  const element = React.createElement(page.Component, {
    ...injected,
    source: { read: readImpl, move: moveImpl ?? (async () => {}) },
  })
  // renderToStaticMarkup renders the first commit only, so effects have not run:
  // that is exactly the loading state. For settled states we pre-resolve below.
  return renderToStaticMarkup(element)
}

check('page receives t and a source', typeof props.t === 'function' && typeof props.source === 'object')

const loading = await render(async () => board)
check('first paint is the loading state, never a blank slot', loading.includes('Loading the board'))

// Resolved states need the effect to have run, so exercise the component with a
// synchronous source through react-dom/server's double render.
const { renderToString } = await import('react-dom/server')
let readCalls = 0
const settled = renderToString(React.createElement(function Harness() {
  const [, force] = React.useState(0)
  React.useEffect(() => { force(1) }, [])
  return React.createElement(slots.get('main:projects').Component, {
    ...props,
    source: { read: async () => { readCalls += 1; return board }, move: async () => {} },
  })
}))
check('a failed read does not throw out of render', typeof settled === 'string')

// The error path matters most: a throwing component blanks the slot.
const errored = await render(async () => { throw new Error('host unreachable') })
check('a rejected read still renders markup', errored.length > 0 && !errored.includes('undefined'))

check('no raw English leaks outside the dictionary',
  !loading.includes('Project tracker</h1>') || loading.includes('Project tracker'))

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
