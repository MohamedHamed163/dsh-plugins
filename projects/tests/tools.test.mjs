import { apply } from './index.js'

const registered = new Map()
// This suite covers the tools only; `connection` is absent, which is also what a
// headless profile looks like. tests/routes.test.mjs covers the Web UI routes.
const makeCtx = sink => ({
  effect: (run) => run(),
  inject(names, callback) {
    // This suite covers the tools only, so `connection` never resolves.
    if (names.includes('connection')) return
    callback({ tools: { register: def => sink(def) }, effect: (run) => run() })
  },
})
await apply(makeCtx(def => registered.set(def.name, def)),
  { dataDirectory: process.env.TEST_DIR, defaultProjectKey: 'WORK' })

const call = (tool, args) => registered.get(tool).execute(args, { signal: undefined })
const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

console.log('registered tools:', [...registered.keys()].join(', '))
check('three tools registered', registered.size === 3)
check('board tool is concurrency safe', registered.get('issue_board').isConcurrencySafe({}) === true)

const empty = await call('issue_board', { action: 'projects' })
check('empty tracker guides the model', empty.summary.includes('No projects yet'))

const created = await call('project_write', { action: 'create', project: 'work', name: 'Hamed apps' })
check('project created with upper key', created.key === 'WORK')

const a = await call('issue_write', { action: 'create', project: 'WORK', title: 'Ship voice overlay', priority: 'high' })
const b = await call('issue_write', { action: 'create', project: 'WORK', title: 'Wire whisper', priority: 'urgent', assignee: 'ahmed' })
await call('issue_write', { action: 'create', project: 'WORK', title: 'Write the README' })
check('issue keys increment', a.issue.key === 'WORK-1' && b.issue.key === 'WORK-2')
check('create renders a readable line', a.summary.startsWith('Created WORK-1'))

const moved = await call('issue_write', { action: 'update', issue: 'WORK-1', status: 'in_progress', note: 'building' })
check('status move is reported', moved.summary.includes('todo → in_progress'))

await call('issue_write', { action: 'update', issue: 'WORK-2', status: 'done' })
const board = await call('issue_board', { action: 'board', project: 'WORK' })
check('board reports progress', board.progress.total === 3 && board.progress.done === 1 && board.progress.percent === 33)
check('board groups by status', board.columns.find(c => c.status === 'in_progress').issues.length === 1)
check('board summary has a header', board.summary.startsWith('WORK — 1/3 done (33%)'))

const found = await call('issue_board', { action: 'search', query: 'whisper' })
check('search finds by title', found.issues.length === 1 && found.issues[0].key === 'WORK-2')
const byStatus = await call('issue_board', { action: 'search', status: 'done' })
check('search filters by status', byStatus.issues.length === 1)

const one = await call('issue_board', { action: 'issue', issue: 'WORK-1' })
check('issue view includes notes', one.summary.includes('building'))

// Failures must carry their reason rather than returning a bad value.
const errors = []
for (const [label, args] of [
  ['unknown issue', { action: 'update', issue: 'WORK-99', status: 'done' }],
  ['missing title', { action: 'create', project: 'WORK', title: '  ' }],
  ['bad status', { action: 'update', issue: 'WORK-1', status: 'nope' }],
]) {
  try { await call('issue_write', args); errors.push(`${label}: NO THROW`) }
  catch (e) { errors.push(`${label}: ${e.message}`) }
}
check('invalid input rejected with reasons', errors.every(e => !e.includes('NO THROW')))
errors.forEach(e => console.log('     ', e))

// A fresh activation must see the same records.
await apply(makeCtx(def => registered.set(`r:${def.name}`, def)), { dataDirectory: process.env.TEST_DIR })
const reread = await registered.get('r:issue_board').execute({ action: 'board', project: 'WORK' })
check('records survive reactivation', reread.progress.total === 3)

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
