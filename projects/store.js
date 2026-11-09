/**
 * Durable JSON store for projects and issues.
 *
 * The tracker owns its data rather than writing session events: issues outlive
 * the session that created them, and the practices guide forbids appending new
 * session event types. Writes are atomic (temp file + rename) so a crash mid-save
 * cannot truncate the board.
 */

import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Board columns, in the order the board renders them. */
export const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked']

/** Statuses that count as finished work for progress figures. */
const CLOSED = new Set(['done'])

export const PRIORITIES = ['low', 'medium', 'high', 'urgent']

/** Bumped when the on-disk shape changes so an old file is recognised. */
const SCHEMA_VERSION = 1

/**
 * Resolves the directory holding `store.json`.
 * @param configured - explicit directory from plugin config, may be empty.
 * @returns absolute directory path.
 */
export function resolveDataDirectory(configured) {
  if (configured) return configured
  const profileDir = process.env.DSH_PROFILE_DIR
  if (profileDir) return join(profileDir, 'projects')
  return join(homedir(), '.dsh', 'projects')
}

/** An empty, valid store. */
function emptyState() {
  return { schemaVersion: SCHEMA_VERSION, projects: [], issues: [], counters: {} }
}

/**
 * Reads, validates and writes the tracker's records.
 *
 * Reads are served from memory; every mutation persists before it returns, so a
 * tool result never reports work that is not yet on disk.
 */
export class ProjectStore {
  /**
   * @param directory - absolute directory for `store.json`.
   */
  constructor(directory) {
    this.directory = directory
    this.file = join(directory, 'store.json')
    this.state = this.#load()
    this.seenMtimeMs = this.#mtimeMs()
  }

  /** Last-modified time of the store file, or 0 when it does not exist yet. */
  #mtimeMs() {
    try { return statSync(this.file).mtimeMs } catch { return 0 }
  }

  /**
   * Reloads when another holder has written since the last read.
   *
   * The plugin activates once per context — the board panel at the root and the
   * agent tools inside the preset — so two instances share one file. Without
   * this, each would serve its own stale memory and the agent's writes would not
   * reach the board until a restart.
   */
  #refreshIfChanged() {
    const mtime = this.#mtimeMs()
    if (mtime === this.seenMtimeMs) return
    this.state = this.#load()
    this.seenMtimeMs = mtime
  }

  #load() {
    if (!existsSync(this.file)) return emptyState()
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8'))
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.projects)) return emptyState()
      return {
        schemaVersion: SCHEMA_VERSION,
        projects: parsed.projects.filter(p => p && typeof p.id === 'string'),
        issues: Array.isArray(parsed.issues) ? parsed.issues.filter(i => i && typeof i.id === 'string') : [],
        counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
      }
    } catch {
      // A corrupt file must not take the Harness down; start clean and keep the
      // damaged copy beside it for inspection.
      try { renameSync(this.file, `${this.file}.corrupt-${Date.now()}`) } catch { /* best effort */ }
      return emptyState()
    }
  }

  #save() {
    mkdirSync(this.directory, { recursive: true })
    const temp = `${this.file}.tmp`
    writeFileSync(temp, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8')
    renameSync(temp, this.file)
    this.seenMtimeMs = this.#mtimeMs()
  }

  // MARK: - Projects

  /** @returns every project, newest first. */
  projects() {
    this.#refreshIfChanged()
    return [...this.state.projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /**
   * Finds a project by id or by its short key, case-insensitively.
   * @param idOrKey - project id or key such as `WORK`.
   */
  project(idOrKey) {
    this.#refreshIfChanged()
    if (!idOrKey) return undefined
    const needle = String(idOrKey).toLowerCase()
    return this.state.projects.find(p => p.id.toLowerCase() === needle || p.key.toLowerCase() === needle)
  }

  /**
   * Creates a project, or returns the existing one with the same key.
   * @param key - short uppercase key used to prefix issue keys.
   * @param name - display name.
   * @param description - optional summary.
   */
  createProject(key, name, description) {
    this.#refreshIfChanged()
    const normalizedKey = String(key || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!normalizedKey) throw new Error('project key must contain at least one letter or digit')
    const existing = this.project(normalizedKey)
    if (existing) return existing
    const project = {
      id: `prj_${normalizedKey.toLowerCase()}_${Date.now().toString(36)}`,
      key: normalizedKey,
      name: String(name || normalizedKey).trim(),
      description: description ? String(description).trim() : '',
      createdAt: new Date().toISOString(),
    }
    this.state.projects.push(project)
    this.state.counters[project.id] = 0
    this.#save()
    return project
  }

  /**
   * Updates a project's name or description.
   * @param idOrKey - project id or key.
   * @param changes - fields to replace.
   */
  updateProject(idOrKey, changes) {
    this.#refreshIfChanged()
    const project = this.project(idOrKey)
    if (!project) throw new Error(`no project ${idOrKey}`)
    if (changes.name !== undefined) project.name = String(changes.name).trim()
    if (changes.description !== undefined) project.description = String(changes.description).trim()
    this.#save()
    return project
  }

  // MARK: - Issues

  /**
   * Creates an issue and assigns it the next key in its project.
   * @param input - project, title and optional fields.
   */
  createIssue(input) {
    this.#refreshIfChanged()
    const project = this.project(input.project)
    if (!project) throw new Error(`no project ${input.project} — create it first`)
    const title = String(input.title || '').trim()
    if (!title) throw new Error('issue title is required')
    const next = (this.state.counters[project.id] || 0) + 1
    this.state.counters[project.id] = next
    const now = new Date().toISOString()
    const issue = {
      id: `iss_${project.key.toLowerCase()}_${next}`,
      key: `${project.key}-${next}`,
      projectId: project.id,
      title,
      description: input.description ? String(input.description).trim() : '',
      status: STATUSES.includes(input.status) ? input.status : 'todo',
      priority: PRIORITIES.includes(input.priority) ? input.priority : 'medium',
      assignee: input.assignee ? String(input.assignee).trim() : '',
      labels: Array.isArray(input.labels) ? input.labels.map(String) : [],
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      notes: [],
    }
    this.state.issues.push(issue)
    this.#save()
    return issue
  }

  /** Finds an issue by id or key such as `WORK-3`. */
  issue(idOrKey) {
    this.#refreshIfChanged()
    if (!idOrKey) return undefined
    const needle = String(idOrKey).toLowerCase()
    return this.state.issues.find(i => i.id.toLowerCase() === needle || i.key.toLowerCase() === needle)
  }

  /**
   * Applies changes to one issue.
   * @param idOrKey - issue id or key.
   * @param changes - any of title, description, status, priority, assignee, labels, note.
   */
  updateIssue(idOrKey, changes) {
    this.#refreshIfChanged()
    const issue = this.issue(idOrKey)
    if (!issue) throw new Error(`no issue ${idOrKey}`)
    if (changes.title !== undefined) issue.title = String(changes.title).trim()
    if (changes.description !== undefined) issue.description = String(changes.description).trim()
    if (changes.priority !== undefined) {
      if (!PRIORITIES.includes(changes.priority)) throw new Error(`priority must be one of ${PRIORITIES.join(', ')}`)
      issue.priority = changes.priority
    }
    if (changes.assignee !== undefined) issue.assignee = String(changes.assignee).trim()
    if (changes.labels !== undefined) issue.labels = Array.isArray(changes.labels) ? changes.labels.map(String) : []
    if (changes.status !== undefined) {
      if (!STATUSES.includes(changes.status)) throw new Error(`status must be one of ${STATUSES.join(', ')}`)
      issue.status = changes.status
      issue.closedAt = CLOSED.has(changes.status) ? new Date().toISOString() : null
    }
    if (changes.note) {
      issue.notes.push({ at: new Date().toISOString(), text: String(changes.note).trim() })
    }
    issue.updatedAt = new Date().toISOString()
    this.#save()
    return issue
  }

  /**
   * Issues matching a filter, newest-updated first.
   * @param filter - optional project, status, assignee, label and text query.
   */
  issues(filter = {}) {
    this.#refreshIfChanged()
    const project = filter.project ? this.project(filter.project) : undefined
    if (filter.project && !project) throw new Error(`no project ${filter.project}`)
    const text = filter.query ? String(filter.query).toLowerCase() : ''
    return this.state.issues
      .filter(issue => !project || issue.projectId === project.id)
      .filter(issue => !filter.status || issue.status === filter.status)
      .filter(issue => !filter.assignee || issue.assignee === filter.assignee)
      .filter(issue => !filter.label || issue.labels.includes(filter.label))
      .filter(issue => !text
        || issue.title.toLowerCase().includes(text)
        || issue.description.toLowerCase().includes(text)
        || issue.key.toLowerCase().includes(text))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /**
   * Board view: one bucket per status plus progress counts.
   * @param idOrKey - project id or key.
   */
  board(idOrKey) {
    this.#refreshIfChanged()
    const project = this.project(idOrKey)
    if (!project) throw new Error(`no project ${idOrKey}`)
    const issues = this.issues({ project: project.key })
    const columns = STATUSES.map(status => ({
      status,
      issues: issues.filter(issue => issue.status === status),
    }))
    const done = issues.filter(issue => CLOSED.has(issue.status)).length
    return {
      project,
      columns,
      progress: {
        total: issues.length,
        done,
        percent: issues.length === 0 ? 0 : Math.round((done / issues.length) * 100),
      },
    }
  }
}
