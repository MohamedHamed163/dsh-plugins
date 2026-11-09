import {
  COLUMN_ORDER, adjacentStatus, applyFilter, assigneesOf, columnsFor, orderIssues, priorityKey, progressOf, statusKey,
} from '../board-view.js'

const fail = []
const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}`); if (!cond) fail.push(label) }

const issues = [
  { key: 'W-1', title: 'Ship overlay', description: 'pulses', status: 'in_progress', priority: 'high', assignee: 'ahmed', updatedAt: '2026-11-09T10:00:00Z' },
  { key: 'W-2', title: 'Wire whisper', description: '', status: 'in_progress', priority: 'urgent', assignee: '', updatedAt: '2026-11-08T10:00:00Z' },
  { key: 'W-3', title: 'Write docs', description: '', status: 'done', priority: 'low', assignee: 'ahmed', updatedAt: '2026-11-07T10:00:00Z' },
  { key: 'W-4', title: 'Fix hotkeys', description: 'carbon', status: 'todo', priority: 'medium', assignee: 'sam', updatedAt: '2026-11-06T10:00:00Z' },
]

check('columns keep a stable layout', columnsFor(issues).length === COLUMN_ORDER.length)
check('done renders last', COLUMN_ORDER[COLUMN_ORDER.length - 1] === 'done')
const inProgress = columnsFor(issues).find(c => c.status === 'in_progress')
check('urgent sorts above high', inProgress.issues[0].key === 'W-2')
check('column holds only its status', inProgress.issues.every(i => i.status === 'in_progress'))
check('empty column still present', columnsFor(issues).find(c => c.status === 'backlog').issues.length === 0)

const equalPriority = orderIssues([
  { key: 'A', priority: 'low', updatedAt: '2026-01-01T00:00:00Z' },
  { key: 'B', priority: 'low', updatedAt: '2026-06-01T00:00:00Z' },
])
check('equal priority falls back to recency', equalPriority[0].key === 'B')
check('unknown priority does not crash', orderIssues([{ key: 'X', priority: 'weird', updatedAt: '' }]).length === 1)

const p = progressOf(issues)
check('progress counts done only', p.total === 4 && p.done === 1 && p.percent === 25)
check('empty progress is zero not NaN', progressOf([]).percent === 0)
check('non-array input is tolerated', progressOf(undefined).total === 0 && columnsFor(null).length === COLUMN_ORDER.length)

check('filter matches title', applyFilter(issues, { query: 'whisper' }).length === 1)
check('filter matches key', applyFilter(issues, { query: 'w-4' }).length === 1)
check('filter matches description', applyFilter(issues, { query: 'carbon' }).length === 1)
check('filter by assignee', applyFilter(issues, { assignee: 'ahmed' }).length === 2)
check('blank query returns everything', applyFilter(issues, { query: '   ' }).length === 4)
check('assignees exclude unassigned', assigneesOf(issues).join(',') === 'ahmed,sam')

check('forward moves one column', adjacentStatus('todo', 'forward') === 'in_progress')
check('back moves one column', adjacentStatus('in_progress', 'back') === 'todo')
check('clamped at the end', adjacentStatus('done', 'forward') === 'done')
check('clamped at the start', adjacentStatus('backlog', 'back') === 'backlog')
check('unknown status is left alone', adjacentStatus('nope', 'forward') === 'nope')

check('labels are locale keys, not English', statusKey('in_review') === 'status.in_review' && priorityKey('urgent') === 'priority.urgent')
check('input is not mutated', issues[0].key === 'W-1' && issues.length === 4)

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length ? 1 : 0)
