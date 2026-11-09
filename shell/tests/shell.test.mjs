/**
 * Drives the shipped client.js through a stubbed loader and checks the tab
 * table, so a tab can never point at a panel that is not registered.
 */
import { readFileSync } from 'node:fs'
import { TABS, activeTabId, visibleTabs } from '../tabs.js'

const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

check('chat is first and selects no panel', TABS[0].id === 'chat' && TABS[0].panel === null)
check('every other tab names a panel', TABS.slice(1).every(t => typeof t.panel === 'string'))
check('tab ids are unique', new Set(TABS.map(t => t.id)).size === TABS.length)
check('the tracker has a tab', TABS.some(t => t.panel === 'projects'))

check('no panel selected means chat', activeTabId(null) === 'chat' && activeTabId(undefined) === 'chat')
check('a known panel maps to its tab', activeTabId('projects') === 'projects')
check('an unknown panel falls back to chat', activeTabId('something-else') === 'chat')

check('chat shows even with no panels', visibleTabs([]).map(t => t.id).join() === 'chat')
check('only registered panels get a tab',
  visibleTabs(['projects']).map(t => t.id).join() === 'chat,projects')
check('all panels present shows every tab', visibleTabs(['projects', 'schedules', 'plugins']).length === TABS.length)

// ---- the shipped client ---------------------------------------------------
let captured
globalThis.window = { __ModuleLoader__: { load(entry) { captured = entry } } }
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
new Function('window', 'require', source)(globalThis.window, () => ({}))
check('registers under the package id', captured?.id === '@local/dsh-shell')

const React = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat() }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
}
const plugin = captured.factory(name => (name === 'react' ? React : {}))
check('declares slots, locale and layout',
  JSON.stringify(plugin.inject) === JSON.stringify(['slots', 'locale', 'layout']))

const registrations = []
let dictionaries
const selected = []
plugin.apply({
  effect: (run, label) => { registrations.push({ label }); return run() },
  locale: {
    register: (ns, dicts) => { dictionaries = dicts; return () => {} },
    bind: () => (key) => dictionaries.en[key] ?? `((${key}))`,
  },
  layout: {
    panelInfo: { getSnapshot: () => ({ activePanelId: 'projects' }), subscribe: () => () => {} },
    selectPanel: (panel) => { selected.push(panel) },
    toggleSidebar: () => { selected.push('sidebar') },
  },
  slots: {
    entriesOfSlot: () => [{ options: { key: 'projects' } }, { options: { key: 'plugins' } }],
    inject: (owner, run) => { registrations.push({ owner }); return run() },
    register: (options, Component) => { registrations.push({ options, Component }); return () => {} },
  },
})

const reg = registrations.find(r => r.options)
check('takes the reserved bottom track', reg?.options.name === 'shell.bottom')
check('registrations are labelled effects', registrations.filter(r => r.label).length >= 2)
check('all eight dictionaries registered', Object.keys(dictionaries).length === 8)
const baseKeys = Object.keys(dictionaries.en).sort()
check('every locale covers the same keys',
  Object.values(dictionaries).every(d => Object.keys(d).sort().join() === baseKeys.join()))

const props = reg.options.inject()
check('only registered panel keys are passed', props.panelIds.join() === 'projects,plugins')
const tree = reg.Component(props)
const buttons = JSON.stringify(tree)
check('schedules has no tab when unregistered', !buttons.includes('Tasks'))
check('chat and projects are drawn', buttons.includes('Chat') && buttons.includes('Projects'))
check('the bar is laid out in flow, not floated over content',
  !buttons.includes('"position":"fixed"') && !buttons.includes('"pointerEvents"'))

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
