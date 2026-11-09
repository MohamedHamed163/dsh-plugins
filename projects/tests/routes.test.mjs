/**
 * Exercises the Host board routes through a stubbed `connection` service, and
 * checks that the Client's document-relative route names are exactly the Host's
 * leading-slash paths with the slash removed — the pairing the Harness's
 * client-route-resolution gate requires.
 */
import { readFileSync } from 'node:fs'
import { apply } from '../index.js'

const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

// ---- activate with a stubbed Harness -------------------------------------
const routes = new Map()
const effects = []
const tools = new Map()
const connectionService = {
  fetch: { register(route) { routes.set(route.path, route); return async () => {} } },
}
const toolsService = { register: def => tools.set(def.name, def) }
/** Mirrors cordis: inject(names, cb) runs cb with a scope once every name resolves. */
const makeCtx = (withConnection = true) => {
  const services = { tools: toolsService, ...(withConnection ? { connection: connectionService } : {}) }
  const scope = {
    ...services,
    effect(run, label) { effects.push(label); return run() },
  }
  return {
    effect(run, label) { effects.push(label); return run() },
    inject(names, callback) {
      if (names.every(name => services[name] !== undefined)) callback(scope)
    },
  }
}
await apply(makeCtx(), { dataDirectory: process.env.TEST_DIR, defaultProjectKey: 'WORK' })

check('registers both board routes', routes.size === 2)
check('board route is a GET under /api', routes.get('/api/dsh-projects.board')?.methods.join() === 'GET')
check('write route is a POST under /api', routes.get('/api/dsh-projects.write')?.methods.join() === 'POST')
check('routes are registered as effects', effects.filter(l => l.includes('route')).length === 2)

// ---- the Client's names must match the Host's paths ----------------------
const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const clientRoutes = [...client.matchAll(/(board|write):\s*'(api\/[A-Za-z0-9.\-]+)'/g)]
  .reduce((acc, m) => ({ ...acc, [m[1]]: m[2] }), {})
check('client declares both routes', Object.keys(clientRoutes).length === 2)
for (const [name, hostPath] of [['board', '/api/dsh-projects.board'], ['write', '/api/dsh-projects.write']]) {
  check(`client '${name}' is the host path without the leading slash`,
    clientRoutes[name] === hostPath.slice(1))
}
check('client sends the session cookie', client.includes("credentials: 'same-origin'"))

// ---- drive the handlers --------------------------------------------------
const board = routes.get('/api/dsh-projects.board')
const write = routes.get('/api/dsh-projects.write')
const get = async (query = '') => (await board.fetch(new Request(`http://localhost/api/dsh-projects.board${query}`))).json()
const post = async body => {
  const response = await write.fetch(new Request('http://localhost/api/dsh-projects.write', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  }))
  return { status: response.status, body: await response.json() }
}

const empty = await get()
check('empty tracker returns an empty board, not an error', Array.isArray(empty.projects) && empty.projects.length === 0)

await tools.get('project_write').execute({ action: 'create', project: 'WORK', name: 'Hamed apps' })
await tools.get('project_write').execute({ action: 'create', project: 'OPS', name: 'Infra' })
await tools.get('issue_write').execute({ action: 'create', project: 'WORK', title: 'Ship overlay', priority: 'high' })
await tools.get('issue_write').execute({ action: 'create', project: 'WORK', title: 'Wire whisper', priority: 'urgent' })
await tools.get('issue_write').execute({ action: 'create', project: 'OPS', title: 'Rotate keys' })

const workBoard = await get('?project=WORK')
check('board returns the requested project', workBoard.project.key === 'WORK')
check('board returns only that project\'s issues', workBoard.issues.length === 2)
check('board lists every project for the picker', workBoard.projects.length === 2)
const opsBoard = await get('?project=OPS')
check('board honours the project parameter', opsBoard.project.key === 'OPS' && opsBoard.issues.length === 1)
const defaulted = await get()
check('no parameter falls back to the configured project', defaulted.project.key === 'WORK')
const unknown = await get('?project=NOPE')
check('an unknown project falls back instead of failing', unknown.project.key === 'WORK')

const moved = await post({ issue: 'WORK-1', status: 'in_progress' })
check('a move succeeds', moved.status === 200 && moved.body.issue.status === 'in_progress')
check('the move is visible on the next read',
  (await get('?project=WORK')).issues.find(i => i.key === 'WORK-1').status === 'in_progress')

check('a missing field is rejected 400', (await post({ issue: 'WORK-1' })).status === 400)
check('an unknown issue is rejected 400', (await post({ issue: 'WORK-99', status: 'done' })).status === 400)
check('an invalid status is rejected 400', (await post({ issue: 'WORK-1', status: 'nope' })).status === 400)
const malformed = await write.fetch(new Request('http://localhost/api/dsh-projects.write', { method: 'POST', body: 'not json' }))
check('a malformed body is rejected, not thrown', malformed.status === 400)

// ---- a headless profile must still get the tools -------------------------
routes.clear()
tools.clear()
await apply(makeCtx(false), { dataDirectory: process.env.TEST_DIR })
check('no Web UI means no routes', routes.size === 0)
check('the agent tools still register without a Web UI', tools.size === 3)

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
