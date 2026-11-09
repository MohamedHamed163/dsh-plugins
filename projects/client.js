/**
 * Board panel for the Harness Web UI.
 *
 * Registers a sidebar entry and a keyed `main` page. The view is a pure
 * function of the records handed to it; reaching the Host is isolated in
 * `createBoardSource` so the transport can change without touching the board.
 *
 * Styling uses only `--dsw-alias-*` theme tokens, so light/dark and a renamed
 * token degrade appearance rather than breaking rendering. No Harness Client
 * package is imported: the controls here are the plugin's own.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-projects',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState } = React

    const PANEL_ID = 'projects'
    const NS = 'local.projects'

    // ---- pure presentation helpers (mirrors board-view.js) ----------------

    const COLUMN_ORDER = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done']
    const PRIORITY_WEIGHT = { urgent: 3, high: 2, medium: 1, low: 0 }
    const DONE = new Set(['done'])

    const orderIssues = issues => [...issues].sort((a, b) => {
      const byPriority = (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0)
      return byPriority !== 0 ? byPriority : String(b.updatedAt).localeCompare(String(a.updatedAt))
    })

    const columnsFor = issues => COLUMN_ORDER.map(status => ({
      status,
      issues: orderIssues((issues ?? []).filter(issue => issue.status === status)),
    }))

    const progressOf = issues => {
      const list = issues ?? []
      const done = list.filter(issue => DONE.has(issue.status)).length
      return { total: list.length, done, percent: list.length === 0 ? 0 : Math.round((done / list.length) * 100) }
    }

    const applyFilter = (issues, query, assignee) => {
      const text = query ? query.trim().toLowerCase() : ''
      return (issues ?? []).filter(issue => {
        if (assignee && issue.assignee !== assignee) return false
        if (!text) return true
        return String(issue.key).toLowerCase().includes(text)
          || String(issue.title).toLowerCase().includes(text)
          || String(issue.description ?? '').toLowerCase().includes(text)
      })
    }

    const assigneesOf = issues =>
      [...new Set((issues ?? []).map(issue => issue.assignee).filter(Boolean))].sort()

    const adjacentStatus = (status, direction) => {
      const index = COLUMN_ORDER.indexOf(status)
      if (index === -1) return status
      const next = direction === 'back' ? index - 1 : index + 1
      return next < 0 || next >= COLUMN_ORDER.length ? status : COLUMN_ORDER[next]
    }

    /** Accent token per column, so the board reads at a glance. */
    const COLUMN_ACCENT = {
      backlog: 'var(--dsw-alias-label-caption, #8a94a6)',
      todo: 'var(--dsw-alias-label-secondary, #9aa4b5)',
      in_progress: 'var(--dsw-alias-link, #5aa9e6)',
      in_review: 'var(--dsw-alias-link, #9b8cf0)',
      blocked: 'var(--dsw-alias-state-error-primary, #e06b6b)',
      done: 'var(--dsw-alias-state-success-primary, #4fb286)',
    }

    const PRIORITY_ACCENT = {
      urgent: 'var(--dsw-alias-state-error-primary, #e06b6b)',
      high: 'var(--dsw-alias-state-warn-primary, #e0a24a)',
      medium: 'var(--dsw-alias-label-secondary, #9aa4b5)',
      low: 'var(--dsw-alias-label-caption, #8a94a6)',
    }

    // ---- styling ----------------------------------------------------------

    const S = {
      page: {
        display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
        color: 'var(--dsw-alias-label-primary, #e8ecf2)',
        background: 'var(--dsw-alias-bg-base, transparent)',
      },
      header: { padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: 12 },
      titleRow: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
      title: { margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle: { margin: 0, fontSize: 13, color: 'var(--dsw-alias-label-secondary, #9aa4b5)' },
      controls: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
      control: {
        appearance: 'none', font: 'inherit', fontSize: 13, padding: '6px 10px', borderRadius: 8,
        color: 'var(--dsw-alias-label-primary, #e8ecf2)',
        background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.06))',
        border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12))',
      },
      button: { cursor: 'pointer' },
      progressTrack: {
        height: 6, borderRadius: 999, overflow: 'hidden',
        background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.08))',
      },
      progressFill: {
        height: '100%', borderRadius: 999,
        background: 'var(--dsw-alias-state-success-primary, #4fb286)',
        transition: 'width 200ms ease',
      },
      board: {
        display: 'flex', gap: 14, flex: 1, minHeight: 0,
        overflowX: 'auto', overflowY: 'hidden', padding: '8px 24px 24px',
      },
      column: {
        display: 'flex', flexDirection: 'column', minWidth: 248, width: 248, flexShrink: 0,
        minHeight: 0, borderRadius: 12, padding: 10,
        background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.04))',
        border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.08))',
      },
      columnHead: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px 10px',
        fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
      },
      count: {
        marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', fontWeight: 500,
        color: 'var(--dsw-alias-label-secondary, #9aa4b5)',
      },
      stack: { display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 0 },
      card: {
        borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7,
        background: 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,0.25))',
        border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.10))',
      },
      cardTop: { display: 'flex', alignItems: 'center', gap: 8 },
      key: {
        fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        color: 'var(--dsw-alias-label-secondary, #9aa4b5)',
      },
      cardTitle: { fontSize: 13, lineHeight: 1.35 },
      cardFoot: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 },
      chip: { padding: '1px 7px', borderRadius: 999, border: '1px solid currentColor', fontWeight: 600 },
      move: {
        appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
        color: 'var(--dsw-alias-label-caption, #8a94a6)', font: 'inherit', fontSize: 13,
        lineHeight: 1, padding: '2px 4px', borderRadius: 6,
      },
      empty: { fontSize: 12, color: 'var(--dsw-alias-label-caption, #8a94a6)', padding: '6px 4px' },
      notice: { padding: '24px', display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520 },
    }

    // ---- host channel ------------------------------------------------------

    // The Host registers these with a leading slash and the browser requests
    // them without one: the Harness resolves client routes document-relative.
    const ROUTES = {
      board: 'api/dsh-projects.board',
      write: 'api/dsh-projects.write',
    }

    /**
     * Calls the plugin's own Host routes on the shared, authenticated `/api`
     * channel. The signed browser cookie travels with `same-origin`, so there is
     * no token to carry, and the Host admits the owner only.
     * @param path - a document-relative route from ROUTES.
     * @param body - JSON body; omit for a GET.
     * @returns the parsed JSON response.
     */
    async function callHost(path, body) {
      const response = await fetch(path, {
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
      })
      if (!response.ok) throw new Error(`dsh-projects ${path}: HTTP ${response.status}`)
      return await response.json()
    }

    /**
     * The board's only route to its records.
     * @returns `read(projectKey)` and `move(issueKey, status)`.
     */
    function createBoardSource() {
      return {
        read: projectKey => callHost(
          projectKey === undefined ? ROUTES.board : `${ROUTES.board}?project=${encodeURIComponent(projectKey)}`),
        move: (issueKey, status) => callHost(ROUTES.write, { issue: issueKey, status }),
      }
    }

    // ---- dictionaries ------------------------------------------------------
    // Generated from ui-locales.js, which the tests exercise; tests/run.sh
    // fails if the two drift.
    const DICTIONARIES = {
      "en": {
        "panel": "Project tracker",
        "title": "Project tracker",
        "subtitle": "Issues and progress, stored on this machine.",
        "project.select": "Project",
        "project.none": "No projects yet",
        "project.emptyHint": "Ask the agent to create one, for example “create project WORK called Hamed apps”.",
        "progress.label": "{done} of {total} done",
        "progress.empty": "No issues yet",
        "board.empty": "Nothing here",
        "filter.placeholder": "Filter issues",
        "filter.assignee.all": "Everyone",
        "filter.clear": "Clear filter",
        "filter.noMatch": "No issue matches this filter.",
        "issue.unassigned": "Unassigned",
        "issue.move.forward": "Move forward",
        "issue.move.back": "Move back",
        "action.refresh": "Refresh",
        "state.loading": "Loading the board…",
        "state.error": "Could not reach the tracker.",
        "state.errorHint": "The plugin is installed but its Host half did not answer. Check the Harness log and try Refresh.",
        "status.backlog": "Backlog",
        "status.todo": "To do",
        "status.in_progress": "In progress",
        "status.in_review": "In review",
        "status.blocked": "Blocked",
        "status.done": "Done",
        "priority.urgent": "Urgent",
        "priority.high": "High",
        "priority.medium": "Medium",
        "priority.low": "Low"
      },
      "zh": {
        "panel": "项目跟踪",
        "title": "项目跟踪",
        "subtitle": "事项与进度，保存在本机。",
        "project.select": "项目",
        "project.none": "暂无项目",
        "project.emptyHint": "可以让智能体创建一个，例如“创建项目 WORK，名称为 Hamed apps”。",
        "progress.label": "已完成 {done} / {total}",
        "progress.empty": "暂无事项",
        "board.empty": "暂无内容",
        "filter.placeholder": "筛选事项",
        "filter.assignee.all": "全部成员",
        "filter.clear": "清除筛选",
        "filter.noMatch": "没有符合筛选条件的事项。",
        "issue.unassigned": "未指派",
        "issue.move.forward": "向后流转",
        "issue.move.back": "向前回退",
        "action.refresh": "刷新",
        "state.loading": "正在加载看板…",
        "state.error": "无法连接到跟踪器。",
        "state.errorHint": "插件已安装，但其主机端没有响应。请查看 Harness 日志后重试刷新。",
        "status.backlog": "待办池",
        "status.todo": "待处理",
        "status.in_progress": "进行中",
        "status.in_review": "评审中",
        "status.blocked": "已阻塞",
        "status.done": "已完成",
        "priority.urgent": "紧急",
        "priority.high": "高",
        "priority.medium": "中",
        "priority.low": "低"
      },
      "ja": {
        "panel": "プロジェクト管理",
        "title": "プロジェクト管理",
        "subtitle": "課題と進捗をこのマシンに保存します。",
        "project.select": "プロジェクト",
        "project.none": "プロジェクトがありません",
        "project.emptyHint": "エージェントに作成を依頼してください。例:「WORK というプロジェクトを Hamed apps の名前で作成して」。",
        "progress.label": "{total} 件中 {done} 件完了",
        "progress.empty": "課題がありません",
        "board.empty": "項目なし",
        "filter.placeholder": "課題を絞り込む",
        "filter.assignee.all": "全員",
        "filter.clear": "絞り込みを解除",
        "filter.noMatch": "条件に一致する課題はありません。",
        "issue.unassigned": "未割り当て",
        "issue.move.forward": "次へ進める",
        "issue.move.back": "前に戻す",
        "action.refresh": "再読み込み",
        "state.loading": "ボードを読み込んでいます…",
        "state.error": "トラッカーに接続できません。",
        "state.errorHint": "プラグインは導入済みですが、ホスト側が応答しませんでした。Harness のログを確認して再読み込みしてください。",
        "status.backlog": "バックログ",
        "status.todo": "未着手",
        "status.in_progress": "進行中",
        "status.in_review": "レビュー中",
        "status.blocked": "ブロック中",
        "status.done": "完了",
        "priority.urgent": "緊急",
        "priority.high": "高",
        "priority.medium": "中",
        "priority.low": "低"
      },
      "es": {
        "panel": "Seguimiento de proyectos",
        "title": "Seguimiento de proyectos",
        "subtitle": "Incidencias y progreso, guardados en este equipo.",
        "project.select": "Proyecto",
        "project.none": "Todavía no hay proyectos",
        "project.emptyHint": "Pide al agente que cree uno, por ejemplo «crea el proyecto WORK llamado Hamed apps».",
        "progress.label": "{done} de {total} completadas",
        "progress.empty": "Todavía no hay incidencias",
        "board.empty": "Sin elementos",
        "filter.placeholder": "Filtrar incidencias",
        "filter.assignee.all": "Todos",
        "filter.clear": "Quitar el filtro",
        "filter.noMatch": "Ninguna incidencia coincide con este filtro.",
        "issue.unassigned": "Sin asignar",
        "issue.move.forward": "Avanzar",
        "issue.move.back": "Retroceder",
        "action.refresh": "Actualizar",
        "state.loading": "Cargando el tablero…",
        "state.error": "No se pudo contactar con el seguimiento.",
        "state.errorHint": "El complemento está instalado pero su mitad de host no respondió. Revisa el registro del Harness y vuelve a actualizar.",
        "status.backlog": "Pendientes",
        "status.todo": "Por hacer",
        "status.in_progress": "En curso",
        "status.in_review": "En revisión",
        "status.blocked": "Bloqueadas",
        "status.done": "Hechas",
        "priority.urgent": "Urgente",
        "priority.high": "Alta",
        "priority.medium": "Media",
        "priority.low": "Baja"
      },
      "fr": {
        "panel": "Suivi de projets",
        "title": "Suivi de projets",
        "subtitle": "Tickets et avancement, stockés sur cette machine.",
        "project.select": "Projet",
        "project.none": "Aucun projet pour le moment",
        "project.emptyHint": "Demandez à l’agent d’en créer un, par exemple « crée le projet WORK nommé Hamed apps ».",
        "progress.label": "{done} sur {total} terminés",
        "progress.empty": "Aucun ticket pour le moment",
        "board.empty": "Rien ici",
        "filter.placeholder": "Filtrer les tickets",
        "filter.assignee.all": "Tout le monde",
        "filter.clear": "Effacer le filtre",
        "filter.noMatch": "Aucun ticket ne correspond à ce filtre.",
        "issue.unassigned": "Non attribué",
        "issue.move.forward": "Avancer",
        "issue.move.back": "Reculer",
        "action.refresh": "Actualiser",
        "state.loading": "Chargement du tableau…",
        "state.error": "Impossible de joindre le suivi.",
        "state.errorHint": "Le plugin est installé mais sa moitié hôte n’a pas répondu. Consultez le journal du Harness puis actualisez.",
        "status.backlog": "Réserve",
        "status.todo": "À faire",
        "status.in_progress": "En cours",
        "status.in_review": "En relecture",
        "status.blocked": "Bloqués",
        "status.done": "Terminés",
        "priority.urgent": "Urgente",
        "priority.high": "Haute",
        "priority.medium": "Moyenne",
        "priority.low": "Basse"
      },
      "de": {
        "panel": "Projektverfolgung",
        "title": "Projektverfolgung",
        "subtitle": "Vorgänge und Fortschritt, auf diesem Rechner gespeichert.",
        "project.select": "Projekt",
        "project.none": "Noch keine Projekte",
        "project.emptyHint": "Bitte den Agenten, eines anzulegen, etwa „lege das Projekt WORK mit dem Namen Hamed apps an“.",
        "progress.label": "{done} von {total} erledigt",
        "progress.empty": "Noch keine Vorgänge",
        "board.empty": "Nichts vorhanden",
        "filter.placeholder": "Vorgänge filtern",
        "filter.assignee.all": "Alle",
        "filter.clear": "Filter entfernen",
        "filter.noMatch": "Kein Vorgang passt zu diesem Filter.",
        "issue.unassigned": "Nicht zugewiesen",
        "issue.move.forward": "Vorwärts bewegen",
        "issue.move.back": "Zurück bewegen",
        "action.refresh": "Aktualisieren",
        "state.loading": "Board wird geladen…",
        "state.error": "Die Verfolgung ist nicht erreichbar.",
        "state.errorHint": "Das Plugin ist installiert, aber seine Host-Hälfte hat nicht geantwortet. Prüfe das Harness-Protokoll und aktualisiere erneut.",
        "status.backlog": "Sammelliste",
        "status.todo": "Zu erledigen",
        "status.in_progress": "In Arbeit",
        "status.in_review": "In Prüfung",
        "status.blocked": "Blockiert",
        "status.done": "Erledigt",
        "priority.urgent": "Dringend",
        "priority.high": "Hoch",
        "priority.medium": "Mittel",
        "priority.low": "Niedrig"
      },
      "ru": {
        "panel": "Отслеживание проектов",
        "title": "Отслеживание проектов",
        "subtitle": "Задачи и прогресс хранятся на этом компьютере.",
        "project.select": "Проект",
        "project.none": "Проектов пока нет",
        "project.emptyHint": "Попросите агента создать проект, например «создай проект WORK с названием Hamed apps».",
        "progress.label": "Готово {done} из {total}",
        "progress.empty": "Задач пока нет",
        "board.empty": "Пусто",
        "filter.placeholder": "Фильтр задач",
        "filter.assignee.all": "Все",
        "filter.clear": "Сбросить фильтр",
        "filter.noMatch": "Нет задач, соответствующих фильтру.",
        "issue.unassigned": "Без исполнителя",
        "issue.move.forward": "Переместить вперёд",
        "issue.move.back": "Переместить назад",
        "action.refresh": "Обновить",
        "state.loading": "Загрузка доски…",
        "state.error": "Не удалось связаться с трекером.",
        "state.errorHint": "Плагин установлен, но его хост-часть не ответила. Проверьте журнал Harness и обновите.",
        "status.backlog": "Очередь",
        "status.todo": "К выполнению",
        "status.in_progress": "В работе",
        "status.in_review": "На проверке",
        "status.blocked": "Заблокировано",
        "status.done": "Готово",
        "priority.urgent": "Срочный",
        "priority.high": "Высокий",
        "priority.medium": "Средний",
        "priority.low": "Низкий"
      },
      "pt": {
        "panel": "Acompanhamento de projetos",
        "title": "Acompanhamento de projetos",
        "subtitle": "Tarefas e progresso, guardados nesta máquina.",
        "project.select": "Projeto",
        "project.none": "Ainda não há projetos",
        "project.emptyHint": "Peça ao agente para criar um, por exemplo «cria o projeto WORK chamado Hamed apps».",
        "progress.label": "{done} de {total} concluídas",
        "progress.empty": "Ainda não há tarefas",
        "board.empty": "Nada aqui",
        "filter.placeholder": "Filtrar tarefas",
        "filter.assignee.all": "Todos",
        "filter.clear": "Limpar o filtro",
        "filter.noMatch": "Nenhuma tarefa corresponde a este filtro.",
        "issue.unassigned": "Sem responsável",
        "issue.move.forward": "Avançar",
        "issue.move.back": "Recuar",
        "action.refresh": "Atualizar",
        "state.loading": "A carregar o quadro…",
        "state.error": "Não foi possível contactar o acompanhamento.",
        "state.errorHint": "O plugin está instalado mas a sua metade de host não respondeu. Verifique o registo do Harness e atualize.",
        "status.backlog": "Reserva",
        "status.todo": "A fazer",
        "status.in_progress": "Em curso",
        "status.in_review": "Em revisão",
        "status.blocked": "Bloqueadas",
        "status.done": "Concluídas",
        "priority.urgent": "Urgente",
        "priority.high": "Alta",
        "priority.medium": "Média",
        "priority.low": "Baixa"
      }
    }

    // ---- components --------------------------------------------------------

    /** Sidebar glyph: three board columns. */
    function ProjectsIcon() {
      return h('svg', {
        viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round',
      },
        h('rect', { key: 'a', x: 3, y: 4, width: 5, height: 11, rx: 1.5 }),
        h('rect', { key: 'b', x: 9.5, y: 4, width: 5, height: 16, rx: 1.5 }),
        h('rect', { key: 'c', x: 16, y: 4, width: 5, height: 7, rx: 1.5 }))
    }

    function IssueCard({ issue, t, onMove }) {
      return h('div', { style: S.card },
        h('div', { style: S.cardTop, key: 'top' },
          h('span', { style: S.key }, issue.key),
          h('span', {
            style: { ...S.chip, color: PRIORITY_ACCENT[issue.priority] ?? PRIORITY_ACCENT.medium, marginLeft: 'auto' },
          }, t(`priority.${issue.priority}`))),
        h('div', { style: S.cardTitle, key: 'title' }, issue.title),
        h('div', { style: S.cardFoot, key: 'foot' },
          h('span', { style: { color: 'var(--dsw-alias-label-caption, #8a94a6)' } },
            issue.assignee || t('issue.unassigned')),
          onMove ? h('span', { style: { marginLeft: 'auto', display: 'flex', gap: 2 } },
            h('button', {
              key: 'back', type: 'button', style: S.move, title: t('issue.move.back'),
              'aria-label': t('issue.move.back'),
              onClick: () => onMove(issue, 'back'),
            }, '‹'),
            h('button', {
              key: 'fwd', type: 'button', style: S.move, title: t('issue.move.forward'),
              'aria-label': t('issue.move.forward'),
              onClick: () => onMove(issue, 'forward'),
            }, '›')) : null))
    }

    function Column({ column, t, onMove }) {
      const accent = COLUMN_ACCENT[column.status]
      return h('section', { style: S.column, 'aria-label': t(`status.${column.status}`) },
        h('header', { style: { ...S.columnHead, color: accent }, key: 'h' },
          h('span', {
            style: { width: 7, height: 7, borderRadius: 999, background: accent, display: 'inline-block' },
          }),
          h('span', null, t(`status.${column.status}`)),
          h('span', { style: S.count }, String(column.issues.length))),
        h('div', { style: S.stack, key: 's' },
          column.issues.length === 0
            ? h('div', { style: S.empty }, t('board.empty'))
            : column.issues.map(issue =>
                h(IssueCard, { key: issue.key, issue, t, onMove }))))
    }

    /** The board page. All data arrives through `source`. */
    function BoardPage(props) {
      const t = props.t
      const source = props.source
      const [state, setState] = useState({ phase: 'loading', projects: [], issues: [], project: undefined })
      const [query, setQuery] = useState('')
      const [assignee, setAssignee] = useState('')

      const load = useCallback(async (projectKey) => {
        setState(prev => ({ ...prev, phase: prev.phase === 'ready' ? 'ready' : 'loading' }))
        try {
          const data = await source.read(projectKey)
          setState({
            phase: 'ready',
            projects: data.projects ?? [],
            issues: data.issues ?? [],
            project: data.project,
          })
        } catch (_error) {
          // A throwing component blanks the slot, so a failed read becomes a
          // rendered state instead of an exception.
          setState({ phase: 'error', projects: [], issues: [], project: undefined })
        }
      }, [source])

      useEffect(() => { void load(undefined) }, [load])

      const onMove = useCallback(async (issue, direction) => {
        const next = adjacentStatus(issue.status, direction)
        if (next === issue.status) return
        // Optimistic: the column change shows immediately, then the Host answer
        // replaces it. A rejected write falls back to the error state.
        setState(prev => ({
          ...prev,
          issues: prev.issues.map(i => (i.key === issue.key ? { ...i, status: next } : i)),
        }))
        try {
          await source.move(issue.key, next)
          await load(state.project ? state.project.key : undefined)
        } catch (_error) {
          setState(prev => ({ ...prev, phase: 'error' }))
        }
      }, [source, load, state.project])

      const visible = useMemo(() => applyFilter(state.issues, query, assignee), [state.issues, query, assignee])
      const columns = useMemo(() => columnsFor(visible), [visible])
      const progress = useMemo(() => progressOf(state.issues), [state.issues])
      const people = useMemo(() => assigneesOf(state.issues), [state.issues])

      if (state.phase === 'loading') {
        return h('div', { style: S.page }, h('div', { style: S.notice }, h('p', { style: S.subtitle }, t('state.loading'))))
      }
      if (state.phase === 'error') {
        return h('div', { style: S.page }, h('div', { style: S.notice },
          h('h2', { style: S.title, key: 't' }, t('state.error')),
          h('p', { style: S.subtitle, key: 'h' }, t('state.errorHint')),
          h('div', { key: 'a' }, h('button', {
            type: 'button', style: { ...S.control, ...S.button }, onClick: () => void load(undefined),
          }, t('action.refresh')))))
      }
      if (state.projects.length === 0) {
        return h('div', { style: S.page }, h('div', { style: S.notice },
          h('h2', { style: S.title, key: 't' }, t('project.none')),
          h('p', { style: S.subtitle, key: 'h' }, t('project.emptyHint'))))
      }

      const selectedKey = state.project ? state.project.key : state.projects[0].key
      return h('div', { style: S.page },
        h('header', { style: S.header, key: 'head' },
          h('div', { style: S.titleRow, key: 'tr' },
            h('h1', { style: S.title }, t('title')),
            h('p', { style: S.subtitle }, t('subtitle'))),
          h('div', { style: S.controls, key: 'ctl' },
            h('select', {
              style: { ...S.control, ...S.button }, value: selectedKey,
              'aria-label': t('project.select'),
              onChange: event => { setAssignee(''); void load(event.target.value) },
            }, state.projects.map(p => h('option', { key: p.key, value: p.key }, `${p.key} — ${p.name}`))),
            h('input', {
              style: { ...S.control, minWidth: 180 }, value: query, type: 'search',
              placeholder: t('filter.placeholder'), 'aria-label': t('filter.placeholder'),
              onChange: event => setQuery(event.target.value),
            }),
            people.length > 0 ? h('select', {
              style: { ...S.control, ...S.button }, value: assignee,
              'aria-label': t('filter.assignee.all'),
              onChange: event => setAssignee(event.target.value),
            },
              h('option', { key: '', value: '' }, t('filter.assignee.all')),
              people.map(name => h('option', { key: name, value: name }, name))) : null,
            h('button', {
              type: 'button', style: { ...S.control, ...S.button },
              onClick: () => void load(selectedKey),
            }, t('action.refresh')),
            h('span', {
              style: { marginLeft: 'auto', fontSize: 12, color: 'var(--dsw-alias-label-secondary, #9aa4b5)' },
            }, progress.total === 0
              ? t('progress.empty')
              : t('progress.label', { done: progress.done, total: progress.total }))),
          h('div', { style: S.progressTrack, key: 'pt', role: 'presentation' },
            h('div', { style: { ...S.progressFill, width: `${progress.percent}%` } }))),
        visible.length === 0 && state.issues.length > 0
          ? h('div', { style: S.notice, key: 'nf' }, h('p', { style: S.subtitle }, t('filter.noMatch')))
          : h('div', { style: S.board, key: 'board' },
              columns.map(column => h(Column, { key: column.status, column, t, onMove }))))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'dsh-projects: dictionaries')
        const t = ctx.locale.bind(NS)
        const source = createBoardSource()

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ t, source }),
        }, BoardPage)), 'dsh-projects: board page')

        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => t('panel'),
        }, ProjectsIcon)), 'dsh-projects: sidebar entry')
      },
    }
  },
})
