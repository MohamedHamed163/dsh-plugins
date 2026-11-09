# Project tracker (`@local/dsh-projects`)

A built-in issue tracker for the DeepSeek Harness: projects, issues, board
columns and progress, stored locally and usable by the agent.

It is an **out-of-tree bundle**, not a package inside the `deepseek-harness`
checkout, so pulling upstream never conflicts with it.

## What it gives you

A **board panel** in the Web UI sidebar, and **three agent tools**. Both act on
the same records through the same Host store, so a card moved by hand and an
issue moved by the agent are the same operation.

### The panel

A sidebar entry (`Project tracker`) and a full page under the panel id
`projects`: a project picker, a progress bar, six board columns, and issue cards
carrying key, title, priority and assignee. Cards move one column at a time with
the `‹` / `›` buttons, applied optimistically and then reconciled with the Host.
A free-text filter and an assignee filter narrow the board.

Styling uses only `--dsw-alias-*` theme tokens, so it follows the host's
light/dark theme and a renamed token degrades appearance rather than breaking
rendering. No Harness Client package is imported — the controls are the
plugin's own. All visible text comes from the panel's dictionaries in eight
languages; nothing is hardcoded in the view.

### The tools

| Tool | Actions | Purpose |
|---|---|---|
| `issue_board` | `projects`, `board`, `issue`, `search` | Read the tracker. `board` returns columns plus `done/total` and a percentage. |
| `issue_write` | `create`, `update` | Create an issue, edit it, move it between columns, append a progress note. |
| `project_write` | `create`, `update` | Create or rename a project. A project owns its issue key prefix. |

Board columns: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`.
Priorities: `low`, `medium`, `high`, `urgent`. Issues are keyed `WORK-1`, `WORK-2`, …

## How the panel reaches the Host

Two exact routes on the Harness's own authenticated `/api` channel, registered
with `ctx.connection.fetch.register`:

| Route | Method | Purpose |
|---|---|---|
| `/api/dsh-projects.board` | GET | Projects, the selected project and its issues. `?project=KEY` selects one. |
| `/api/dsh-projects.write` | POST | `{ issue, status }` moves one issue. Invalid input answers 400 with a reason. |

The shared `/api` handler admits the **owner only** and the browser's signed
`dsh-auth-*` cookie travels with `credentials: 'same-origin'`, so the panel
carries no token. The Host registers the leading-slash path and the browser
requests it without the slash, which is how the Harness resolves client routes
document-relative.

`connection` is read with `ctx.get()` rather than declared in `inject`: a
headless profile has no Web UI, and declaring it would keep the agent tools
inactive there too. Without it the plugin registers the tools and no routes.

## Storage

One JSON file, written atomically (temp file + rename). The plugin activates
once per context, so two instances share it; each reloads when the file's
modification time changes, which is what lets a card moved in the panel and an
issue moved by the agent be the same record.


- `$DSH_PROFILE_DIR/projects/store.json` when the Harness runs under a profile
- otherwise `~/.dsh/projects/store.json`
- or the `dataDirectory` set in the patch row

A corrupt file is moved aside as `store.json.corrupt-<timestamp>` and the
tracker starts clean rather than failing activation.

Records are the tracker's own rather than session events, because issues must
outlive the session that created them, and the harness forbids appending new
session event types.

## Install

The bundle needs **two rows**, because its halves need different services. The
root row serves the board panel (`connection` exists only where there is a Web
UI); a row inside the agent preset registers the tools (`tools` is agent-scoped,
not a root service). Each half activates only where its service exists, so the
same package serves both.

**1 — link the Harness runtime.** An out-of-tree bundle sits outside the
Harness's `node_modules`, so the tools' one import cannot resolve on its own.
Point this at the dsh that actually runs; a source checkout and an installed dsh
are different versions:

```bash
./scripts/link-dsh.sh /path/to/deepseek-harness
```

**2 — install and select the bundle.** From a Harness session,
`plugin_manager` with `action: install_bundle` and this directory as `target`;
or from a shell:

```bash
dsh plugin --profile web add link:/path/to/hamed/dsh-plugins/projects
```

That adds the dependency and appends the bundle to `dsh.profile.bundles`.

**3 — mount the agent tools.** `tools` is agent-scoped, so the root row only
serves the panel; the tools need a row inside an agent preset.

```bash
./scripts/mount-tools.py --harness /path/to/deepseek-harness --profile web
```

A partial override will not do: writing only `config.plugins` with one entry
**replaces the preset's whole plugin list** and removes all 31 shipped plugin
rows (bash, fs, web, subagent…). The script instead copies the shipped list
verbatim and appends the tracker, which is what the Web UI's preset editor
produces. The built-in presets are read-only in the UI, and its only custom-preset
path needs a working agent, so this is the route that works without a model.

Because the list is a copy it freezes at the upstream state it was taken from:
**re-run the script after upgrading the Harness** to pick up newly shipped
tools. The block it writes is delimited, so re-running replaces it cleanly and
`--remove` restores the stock preset.

**4 — restart the Harness.** Replacing an installed package needs a fresh
JavaScript module generation; a patch edit alone will not pick it up.

Confirm with `dsh --profile <name> --dump-config | grep dsh-projects` — two rows
— and check the activation line the plugin logs: `[dsh-projects] store: <path>
(N projects, M issues)`.

## Configuration

Both fields in `cordis.patch.yml` are optional:

- `dataDirectory` — absolute path for `store.json`; empty means the default above.
- `defaultProjectKey` — project assumed when a tool call omits one (default `WORK`).

## Tests

```
./tests/run.sh
```

Six suites, 90 checks, no running Harness required:

| Suite | Covers |
|---|---|
| `tools` | The three tools against a stubbed `@deepseek-ai/dsh-tools`: registration, key allocation, status moves, progress arithmetic, search filters, rejection reasons, and survival across a fresh activation. |
| `routes` | The Host board routes driven with real `Request` objects: project selection and fallback, 400s for a missing field, unknown issue, invalid status and malformed body, and that a headless profile still gets the tools. Also asserts the Client's route names are the Host's paths minus the leading slash. |
| `sharing` | Two store instances — the panel at the root and the tools in the preset — seeing each other's writes: new projects and issues, status moves, unique key allocation across holders, and recomputed progress. |
| `board-view` | Pure board derivations: column order and stability, priority then recency ordering, progress arithmetic, filters, and tolerance of absent or unknown values. |
| `locale-sync` | That `client.js`'s inlined dictionaries equal `ui-locales.js` exactly, that every `t(...)` key exists, and that templated keys cover every status and priority. |
| `panel` | The real `client.js` loaded through a stubbed `window.__ModuleLoader__` with React: the module id, `inject`, the keyed `main` page and sidebar entry, that registrations are labelled effects, and that a failed read renders a state instead of throwing out of render. |

The `panel` suite borrows React from the harness checkout's `node_modules` and
is skipped with a notice when that is absent.

## Known limitations and deferred work

- **The agent tools have not been called by a live agent.** They register —
  the activation log says so — and their handlers are covered by tests, but
  exercising them end to end needs a model configured in the Harness.
- **The mounted plugin list is a frozen copy.** See install step 3: re-run
  `scripts/mount-tools.py` after a Harness upgrade or the preset will keep
  serving the older tool set.
- **The tools' link is version-specific.** `scripts/link-dsh.sh` pins
  `@deepseek-ai/dsh-tools` to one dsh installation. Re-run it after switching
  between a source checkout and an installed dsh, or the tools go quiet with a
  diagnostic while the panel keeps working.
- **Cards move one column at a time**, with buttons rather than drag and drop.
- **The board does not refresh by itself.** It reads on open, on project change
  and on Refresh; another session's writes appear on the next read.
- **No multi-record transaction.** Each write persists on its own, so a crash
  between two related writes can leave one applied.
- **No comments, attachments, sprints or dependencies between issues.**
- **The data directory depends on the profile.** It is `$DSH_PROFILE_DIR/projects`
  when that variable is set and `~/.dsh/projects` otherwise, so the same bundle
  can appear empty under a different launch. The activation line states the path
  it actually used; set `dataDirectory` to pin it.
- **Single writer.** Two Harness processes sharing one `dataDirectory` can
  overwrite each other's last write.
