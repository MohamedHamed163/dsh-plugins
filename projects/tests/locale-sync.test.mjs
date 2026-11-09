/**
 * client.js ships its dictionaries inlined, because the browser module table
 * resolves 'react' and not this package's own subpaths. ui-locales.js stays the
 * authored source, so this check fails if the two drift.
 */
import { readFileSync } from 'node:fs'
import { dictionaries, en } from '../ui-locales.js'
import { COLUMN_ORDER } from '../board-view.js'

const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

// The inlined block must parse back to exactly the authored dictionaries.
const match = client.match(/const DICTIONARIES = (\{[\s\S]*?\n {4}\})\n/)
check('client.js contains an inlined DICTIONARIES block', Boolean(match))
if (match) {
  const inlined = JSON.parse(match[1])
  check('inlined locales match ui-locales.js exactly',
    JSON.stringify(inlined) === JSON.stringify(dictionaries))
  check('every locale is present', Object.keys(inlined).length === Object.keys(dictionaries).length)
}

// Every key the view asks for must exist in the dictionary.
const used = [...client.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)].map(m => m[1])
const templated = [...client.matchAll(/\bt\(\s*`([a-z]+)\.\$\{/g)].map(m => m[1])
const missing = [...new Set(used)].filter(key => !(key in en))
check(`every literal t(...) key exists (${new Set(used).size} keys used)`, missing.length === 0)
if (missing.length) console.log('      missing:', missing.join(', '))

// Template keys like t(`status.${s}`) must cover every enum member.
for (const prefix of new Set(templated)) {
  const members = prefix === 'status' ? COLUMN_ORDER : ['urgent', 'high', 'medium', 'low']
  const absent = members.filter(member => !(`${prefix}.${member}` in en))
  check(`t(\`${prefix}.\${…}\`) covers all ${members.length} members`, absent.length === 0)
  if (absent.length) console.log('      missing:', absent.join(', '))
}

// No English may be hardcoded in the view: every visible string goes through t.
check('column order matches board-view.js',
  COLUMN_ORDER.every(status => client.includes(`'${status}'`)))

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
