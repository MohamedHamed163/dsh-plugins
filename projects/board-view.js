/**
 * Pure presentation helpers for the board panel.
 *
 * Kept free of React and of any Harness service so the same derivations run in
 * the browser and under test. Every function here is a total function of its
 * arguments: no clocks, no I/O, no mutation of the input.
 *
 * @module @local/dsh-projects/board-view
 */

/** Board columns in render order. Mirrors `STATUSES` in store.js. */
export const COLUMN_ORDER = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done']

/** Statuses that count as finished for progress figures. */
const DONE_STATUSES = new Set(['done'])

/** Sort weight per priority; higher sorts first within a column. */
const PRIORITY_WEIGHT = { urgent: 3, high: 2, medium: 1, low: 0 }

/**
 * Locale key for a status label, so no English reaches the view.
 * @param status - a board status.
 * @returns the dictionary key under the panel namespace.
 */
export function statusKey(status) {
  return `status.${status}`
}

/**
 * Locale key for a priority label.
 * @param priority - an issue priority.
 */
export function priorityKey(priority) {
  return `priority.${priority}`
}

/**
 * Orders issues within a column: urgent first, then most recently updated.
 * @param issues - issues sharing one status.
 * @returns a new sorted array.
 */
export function orderIssues(issues) {
  return [...issues].sort((a, b) => {
    const byPriority = (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0)
    if (byPriority !== 0) return byPriority
    return String(b.updatedAt).localeCompare(String(a.updatedAt))
  })
}

/**
 * Groups issues into the fixed column order.
 *
 * Every column is present even when empty, so the board keeps a stable layout
 * instead of reflowing as work moves.
 * @param issues - every issue in the project.
 * @returns one entry per column, in render order.
 */
export function columnsFor(issues) {
  const list = Array.isArray(issues) ? issues : []
  return COLUMN_ORDER.map(status => ({
    status,
    issues: orderIssues(list.filter(issue => issue.status === status)),
  }))
}

/**
 * Completion figures for a set of issues.
 * @param issues - every issue in the project.
 * @returns total, done and an integer percentage (0 when there is nothing).
 */
export function progressOf(issues) {
  const list = Array.isArray(issues) ? issues : []
  const done = list.filter(issue => DONE_STATUSES.has(issue.status)).length
  return {
    total: list.length,
    done,
    percent: list.length === 0 ? 0 : Math.round((done / list.length) * 100),
  }
}

/**
 * Narrows issues by the panel's filter controls.
 * @param issues - every issue in the project.
 * @param filter - optional free text and assignee.
 * @returns the matching issues, input order preserved.
 */
export function applyFilter(issues, filter = {}) {
  const list = Array.isArray(issues) ? issues : []
  const text = filter.query ? String(filter.query).trim().toLowerCase() : ''
  return list.filter(issue => {
    if (filter.assignee && issue.assignee !== filter.assignee) return false
    if (!text) return true
    return String(issue.key).toLowerCase().includes(text)
      || String(issue.title).toLowerCase().includes(text)
      || String(issue.description ?? '').toLowerCase().includes(text)
  })
}

/**
 * Every assignee present, for the filter menu.
 * @param issues - every issue in the project.
 * @returns sorted unique assignee names, excluding unassigned.
 */
export function assigneesOf(issues) {
  const list = Array.isArray(issues) ? issues : []
  return [...new Set(list.map(issue => issue.assignee).filter(Boolean))].sort()
}

/**
 * The status an issue moves to when the user nudges it along the board.
 * @param status - the current status.
 * @param direction - `forward` or `back`.
 * @returns the neighbouring status, or the same one at either end.
 */
export function adjacentStatus(status, direction) {
  const index = COLUMN_ORDER.indexOf(status)
  if (index === -1) return status
  const next = direction === 'back' ? index - 1 : index + 1
  if (next < 0 || next >= COLUMN_ORDER.length) return status
  return COLUMN_ORDER[next]
}
