/**
 * Checks the theme against the token names the Harness actually defines, and
 * drives the real client.js through a stubbed loader.
 *
 * Overriding a token that does not exist is silent: the app keeps its own
 * colour and the theme looks half-applied. That is the mistake this guards.
 */
import { readFileSync } from 'node:fs'
import { SEED, stylesheet, tokens } from '../palette.js'

const known = new Set(JSON.parse(readFileSync(new URL('./known-tokens.json', import.meta.url), 'utf8')).tokens)
const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

const map = tokens()
const unknown = Object.keys(map).filter(name => !known.has(name))
check(`every overridden token exists in the Harness (${Object.keys(map).length} overridden)`, unknown.length === 0)
if (unknown.length) console.log('      not real tokens:', unknown.join(', '))

check('the page background is overridden', map['--dsw-alias-bg-base'] === SEED.base)
check('the primary button carries the accent', map['--dsw-alias-button-primary-fill'] === SEED.accent)
check('every value is a concrete colour or length',
  Object.values(map).every(v => /^(#[0-9a-f]{3,8}|rgba?\(|[0-9]+px$)/i.test(v)))
check('no color-mix is inherited from the stock palette',
  !Object.values(map).some(v => v.includes('color-mix')))

// Contrast: primary text on the page background must stay readable.
const lum = (hex) => {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const primary = ratio(SEED.textPrimary, SEED.base)
const secondary = ratio(SEED.textSecondary, SEED.base)
const tertiary = ratio(SEED.textTertiary, SEED.layer1)
check(`primary text contrast is AA for body text (${primary.toFixed(1)}:1)`, primary >= 4.5)
check(`secondary text contrast is AA (${secondary.toFixed(1)}:1)`, secondary >= 4.5)
check(`tertiary text contrast is at least AA-large (${tertiary.toFixed(1)}:1)`, tertiary >= 3)

// The stylesheet must out-specify the Harness's own body[data-ds-dark-theme].
const css = stylesheet()
check('rule beats body[data-ds-dark-theme]', css.includes('html body[data-ds-dark-theme]'))
check('plain dark body is covered too', css.includes('html body,'))
check('no !important is needed', !css.includes('!important'))

// The shipped client must carry exactly this stylesheet.
let captured
globalThis.window = { __ModuleLoader__: { load(entry) { captured = entry } } }
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
new Function('window', 'require', source)(globalThis.window, () => ({ createElement: (...a) => a }))
check('registers under the package id', captured?.id === '@local/dsh-theme')

const inlined = source.match(/const THEME_CSS = ("(?:[^"\\]|\\.)*")/)
check('client.js inlines a stylesheet', Boolean(inlined))
if (inlined) check('inlined CSS matches palette.js exactly', JSON.parse(inlined[1]) === css)

const plugin = captured.factory(() => ({ createElement: (type, props, children) => ({ type, props, children }) }))
check('declares only the slots service', JSON.stringify(plugin.inject) === JSON.stringify(['slots']))

const registrations = []
plugin.apply({
  effect(run, label) { registrations.push({ label }); return run() },
  slots: {
    inject(owner, run) { registrations.push({ owner }); return run() },
    register(options, Component) { registrations.push({ options, Component }); return () => {} },
  },
})
const reg = registrations.find(r => r.options)
check('registers into a root-scope slot', reg?.options.name === 'shell.overlay')
check('renders before other overlays', reg?.options.order < 0)
check('registration is a labelled effect', registrations.some(r => r.label))
const element = reg.Component()
check('renders a single style element', element.type === 'style' && element.children === css)

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
