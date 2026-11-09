/**
 * Project tracker — issues, boards and progress that outlive a session.
 *
 * Host half of the bundle. It owns a durable JSON store and exposes the same
 * operations to the agent as three tools: one read face and two write faces.
 * Records are the tracker's own, not session events, because issues must
 * survive the session that created them.
 *
 * @module @local/dsh-projects
 */

import { PRIORITIES, ProjectStore, STATUSES, resolveDataDirectory } from './store.js'

export const name = 'projects'
// Nothing is declared required. `tools` is agent-scoped and `connection` only
// exists where there is a Web UI, so a declared injection would leave the whole
// plugin inactive in a profile that lacks either. Both are read with ctx.get(),
// which is the documented way to consume an optional service.

/** Document-relative route names the board panel fetches. */
const ROUTES = {
  board: '/api/dsh-projects.board',
  write: '/api/dsh-projects.write',
}

/**
 * JSON response helper.
 * @param value - serialisable body.
 * @param status - HTTP status, 200 by default.
 */
function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Shared parameter fragment: which project an operation addresses. */
const PROJECT_PARAM = {
  type: 'string',
  required: true,
  description: 'Project key or id, for example WORK.',
}

/** Compact issue shape returned to the model — enough to act on, no prose. */
const ISSUE_VALUE = {
  type: 'object',
  additionalProperties: true,
  properties: {
    key: { type: 'string', required: true },
    title: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: [...STATUSES] },
    priority: { type: 'string', required: true, enum: [...PRIORITIES] },
    assignee: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
}

/**
 * Projects one stored issue onto the model-facing shape.
 * @param issue - a stored issue record.
 * @returns the compact representation.
 */
function projectIssue(issue) {
  return {
    key: issue.key,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    assignee: issue.assignee,
    updatedAt: issue.updatedAt,
  }
}

/**
 * One line per issue, as the model reads best.
 * @param issues - stored issue records.
 */
function lines(issues) {
  if (issues.length === 0) return 'No issues.'
  return issues
    .map(issue => {
      const who = issue.assignee ? ` @${issue.assignee}` : ''
      return `${issue.key}  [${issue.status}] ${issue.priority.padEnd(6)} ${issue.title}${who}`
    })
    .join('\n')
}

/**
 * Loads `defineTool` from whichever dsh runtime is hosting this bundle.
 *
 * An out-of-tree bundle sits outside the Harness's own `node_modules`, so this
 * import resolves only through the `@deepseek-ai/dsh-tools` link that
 * `scripts/link-dsh.sh` creates. A missing or mismatched link must not take the
 * whole plugin down: the board panel needs no Harness import at all, so the
 * failure is reported and the routes still come up.
 * @returns `defineTool`, or undefined with the reason logged.
 */
async function loadDefineTool() {
  try {
    const tools = await import('@deepseek-ai/dsh-tools')
    return tools.defineTool
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error)
    console.error(
      '[dsh-projects] agent tools unavailable: cannot resolve @deepseek-ai/dsh-tools '
      + `(${reason}). The board panel still works. Run scripts/link-dsh.sh in the bundle `
      + 'directory, pointing at the dsh installation that is actually running.')
    return undefined
  }
}

/**
 * Activates the tracker: the board routes first, then the agent tools.
 * @param ctx - the plugin context.
 * @param config - row configuration; every field is optional.
 */
export async function apply(ctx, config) {
  const settings = config && typeof config === 'object' ? config : {}
  const directory = resolveDataDirectory(settings.dataDirectory)
  const store = new ProjectStore(directory)
  const fallbackKey = String(settings.defaultProjectKey || 'WORK').toUpperCase()
  // Where the records live is the first thing anyone needs when the board looks
  // empty, and it varies with the profile, so state it once at activation.
  console.error(`[dsh-projects] store: ${directory} (${store.projects().length} projects, ${store.issues().length} issues)`)

  // The panel depends on nothing from the Harness, so it is registered first
  // and survives a tools-resolution failure.
  registerBoardRoutes(ctx, store, fallbackKey)

  const defineTool = await loadDefineTool()
  if (defineTool === undefined) return

  // `inject` waits for the service and re-runs if it comes and goes; reading it
  // once with ctx.get() at activation is too early and always missed it.
  ctx.inject(['tools'], (scope) => {
    const tools = scope.tools
    // Says plainly that the agent half came up; the panel logs its own line.
    console.error('[dsh-projects] agent tools registered: issue_board, issue_write, project_write')

    // Reading the board.
    tools.register(defineTool({
      name: 'issue_board',
      description:
        'Read the project tracker: list projects, read one project\'s board with progress, read a '
        + 'single issue, or search issues. Use this before writing so keys and statuses are correct.',
      parameters: {
        action: {
          type: 'string',
          required: true,
          enum: ['projects', 'board', 'issue', 'search'],
          description:
            'projects (every project) | board (one project grouped by status, with progress) | '
            + 'issue (one issue in full) | search (filter issues).',
        },
        project: { type: 'string', description: 'Project key or id. Required for board.' },
        issue: { type: 'string', description: 'Issue key such as WORK-3. Required for issue.' },
        status: { type: 'string', enum: [...STATUSES], description: 'Restrict a search to one status.' },
        assignee: { type: 'string', description: 'Restrict a search to one assignee.' },
        label: { type: 'string', description: 'Restrict a search to one label.' },
        query: { type: 'string', description: 'Free text matched against key, title and description.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: true,
          properties: {
            action: { type: 'string', required: true },
            summary: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: value.summary }],
      },
      isConcurrencySafe: () => true,
      async execute(args) {
        switch (args.action) {
          case 'projects': {
            const projects = store.projects()
            return {
              action: 'projects',
              projects: projects.map(p => ({ key: p.key, name: p.name, description: p.description })),
              summary: projects.length === 0
                ? 'No projects yet. Create one with project_write.'
                : projects.map(p => `${p.key}  ${p.name}`).join('\n'),
            }
          }
          case 'board': {
            const board = store.board(args.project || fallbackKey)
            const filled = board.columns.filter(column => column.issues.length > 0)
            const body = filled
              .map(column => `## ${column.status} (${column.issues.length})\n${lines(column.issues)}`)
              .join('\n\n')
            return {
              action: 'board',
              project: board.project.key,
              progress: board.progress,
              columns: board.columns.map(c => ({ status: c.status, issues: c.issues.map(projectIssue) })),
              summary: `${board.project.key} — ${board.progress.done}/${board.progress.total} done `
                + `(${board.progress.percent}%)\n\n${body || 'No issues.'}`,
            }
          }
          case 'issue': {
            const issue = store.issue(args.issue)
            if (!issue) throw new Error(`no issue ${args.issue}`)
            const notes = issue.notes.map(note => `  - ${note.at}: ${note.text}`).join('\n')
            return {
              action: 'issue',
              issue: projectIssue(issue),
              summary: `${issue.key}  [${issue.status}] ${issue.priority}\n${issue.title}\n`
                + `${issue.description || '(no description)'}`
                + `${issue.labels.length ? `\nlabels: ${issue.labels.join(', ')}` : ''}`
                + `${notes ? `\nnotes:\n${notes}` : ''}`,
            }
          }
          case 'search': {
            const found = store.issues({
              project: args.project,
              status: args.status,
              assignee: args.assignee,
              label: args.label,
              query: args.query,
            })
            return {
              action: 'search',
              issues: found.map(projectIssue),
              summary: `${found.length} issue(s)\n${lines(found)}`,
            }
          }
          default:
            throw new Error(`unknown action ${args.action}`)
        }
      },
    }))

    // Creating and updating issues.
    tools.register(defineTool({
      name: 'issue_write',
      description:
        'Create or update an issue in the project tracker. Moving an issue between board columns is '
        + 'an update with a new status. Call issue_board first when you need the exact key.',
      parameters: {
        action: {
          type: 'string',
          required: true,
          enum: ['create', 'update'],
          description: 'create a new issue | update an existing one.',
        },
        project: { type: 'string', description: 'Project key. Required for create.' },
        issue: { type: 'string', description: 'Issue key such as WORK-3. Required for update.' },
        title: { type: 'string', description: 'Short imperative summary.' },
        description: { type: 'string', description: 'Detail, acceptance criteria, links.' },
        status: { type: 'string', enum: [...STATUSES], description: 'Board column.' },
        priority: { type: 'string', enum: [...PRIORITIES], description: 'Priority.' },
        assignee: { type: 'string', description: 'Who owns it.' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Replaces the whole label set.' },
        note: { type: 'string', description: 'Appends a timestamped progress note.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: true,
          properties: {
            issue: { ...ISSUE_VALUE, required: true },
            summary: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: value.summary }],
      },
      async execute(args) {
        if (args.action === 'create') {
          const issue = store.createIssue({
            project: args.project || fallbackKey,
            title: args.title,
            description: args.description,
            status: args.status,
            priority: args.priority,
            assignee: args.assignee,
            labels: args.labels,
          })
          return { issue: projectIssue(issue), summary: `Created ${issue.key}: ${issue.title} [${issue.status}]` }
        }
        if (!args.issue) throw new Error('update needs the issue key')
        const before = store.issue(args.issue)
        if (!before) throw new Error(`no issue ${args.issue}`)
        const previousStatus = before.status
        const issue = store.updateIssue(args.issue, args)
        const moved = issue.status !== previousStatus ? ` (${previousStatus} → ${issue.status})` : ''
        return { issue: projectIssue(issue), summary: `Updated ${issue.key}${moved}: ${issue.title}` }
      },
    }))

    // Creating and updating projects.
    tools.register(defineTool({
      name: 'project_write',
      description: 'Create or rename a project in the tracker. A project owns its issue key prefix.',
      parameters: {
        action: { type: 'string', required: true, enum: ['create', 'update'], description: 'create | update.' },
        project: { ...PROJECT_PARAM },
        name: { type: 'string', description: 'Display name.' },
        description: { type: 'string', description: 'What the project covers.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: true,
          properties: {
            key: { type: 'string', required: true },
            summary: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: value.summary }],
      },
      async execute(args) {
        if (args.action === 'create') {
          const project = store.createProject(args.project, args.name, args.description)
          return { key: project.key, summary: `Project ${project.key} — ${project.name}` }
        }
        const project = store.updateProject(args.project, args)
        return { key: project.key, summary: `Updated ${project.key} — ${project.name}` }
      },
    }))
  })
}

/**
 * Serves the board panel over the Harness's own authenticated `/api` channel.
 *
 * These routes are exact registrations, so the shared handler admits the owner
 * only and the browser's signed cookie travels automatically — the panel needs
 * no token plumbing. A profile without a Web UI has no `connection` service and
 * simply gets no routes.
 *
 * @param ctx - the plugin context.
 * @param store - the tracker's records.
 * @param fallbackKey - project assumed when a request names none.
 */
function registerBoardRoutes(ctx, store, fallbackKey) {
  ctx.inject(['connection'], (scope) => {
    registerRoutesOn(scope, store, fallbackKey)
  })
}

/**
 * Registers both routes on a scope that already has `connection`.
 * @param scope - the injected scope.
 * @param store - the tracker's records.
 * @param fallbackKey - project assumed when a request names none.
 */
function registerRoutesOn(scope, store, fallbackKey) {
  const connection = scope.connection

  scope.effect(() => connection.fetch.register({
    path: ROUTES.board,
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const requested = new URL(request.url).searchParams.get('project') ?? undefined
      const projects = store.projects().map(p => ({ key: p.key, name: p.name, description: p.description }))
      if (projects.length === 0) return json({ projects: [], project: undefined, issues: [] })
      const selected = store.project(requested) ?? store.project(fallbackKey) ?? store.project(projects[0].key)
      return json({
        projects,
        project: { key: selected.key, name: selected.name },
        issues: store.issues({ project: selected.key }),
      })
    },
  }), 'dsh-projects: board route')

  scope.effect(() => connection.fetch.register({
    path: ROUTES.write,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      const input = await request.json().catch(() => undefined)
      if (input === undefined || typeof input.issue !== 'string' || typeof input.status !== 'string') {
        return json({ error: 'issue and status are required' }, 400)
      }
      try {
        const issue = store.updateIssue(input.issue, { status: input.status })
        return json({ issue })
      } catch (error) {
        // A bad key or status is the caller's mistake, not a server fault.
        return json({ error: error instanceof Error ? error.message : String(error) }, 400)
      }
    },
  }), 'dsh-projects: write route')
}
