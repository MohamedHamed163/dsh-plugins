/**
 * Two ProjectStore instances share one file, because the plugin activates once
 * per context: the board panel at the root and the agent tools inside the agent
 * preset. Each must see the other's writes.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProjectStore } from '../store.js'

const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

const dir = mkdtempSync(join(tmpdir(), 'projshare-'))
const panel = new ProjectStore(dir)   // the Web UI half
const agent = new ProjectStore(dir)   // the agent-tools half

agent.createProject('WORK', 'Shared')
check('the panel sees a project the agent created', panel.projects().length === 1)

const created = agent.createIssue({ project: 'WORK', title: 'From the agent' })
check('the panel sees an issue the agent created', panel.issues().length === 1)
check('the panel reads it by key', panel.issue(created.key)?.title === 'From the agent')

panel.updateIssue(created.key, { status: 'in_progress' })
check('the agent sees a move the panel made', agent.issue(created.key).status === 'in_progress')

// Key allocation must not collide across instances.
const fromPanel = panel.createIssue({ project: 'WORK', title: 'From the panel' })
const fromAgent = agent.createIssue({ project: 'WORK', title: 'Also the agent' })
check('issue keys stay unique across both holders',
  new Set([created.key, fromPanel.key, fromAgent.key]).size === 3)
check('both holders agree on the total', panel.issues().length === agent.issues().length)

// Board progress must be computed from the shared records, not stale memory.
agent.updateIssue(fromPanel.key, { status: 'done' })
check('the panel recomputes progress after the agent writes',
  panel.board('WORK').progress.done === 1)

// A read with no intervening write must not reload needlessly.
const before = panel.issues().length
check('repeated reads are stable', panel.issues().length === before)

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
