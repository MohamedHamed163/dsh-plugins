/**
 * A tab bar for switching between the chat and the global panels.
 *
 * It takes `shell.bottom`, a root-scope single seat that was unoccupied. That
 * seat reserves a real layout track, so the bar never covers a page header the
 * way a `shell.overlay` bar did — and no other plugin's CSS has to be touched.
 * Tabs drive `ctx.layout.selectPanel`, the same navigation the sidebar's panel
 * list uses, and `selectPanel(null)` returns to the conversation.
 *
 * Only panels that are actually registered get a tab, because `selectPanel`
 * throws on an unregistered key.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-shell',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useState } = React

    const NS = 'local.shell'

    const DICTIONARIES = {
      "en": {
        "tab.chat": "Chat",
        "tab.projects": "Projects",
        "tab.tasks": "Tasks",
        "tab.plugins": "Plugins",
        "sidebar.toggle": "Toggle sidebar"
      },
      "zh": {
        "tab.chat": "对话",
        "tab.projects": "项目",
        "tab.tasks": "任务",
        "tab.plugins": "插件",
        "sidebar.toggle": "显示/隐藏侧边栏"
      },
      "ja": {
        "tab.chat": "チャット",
        "tab.projects": "プロジェクト",
        "tab.tasks": "タスク",
        "tab.plugins": "プラグイン",
        "sidebar.toggle": "サイドバーの表示切り替え"
      },
      "es": {
        "tab.chat": "Chat",
        "tab.projects": "Proyectos",
        "tab.tasks": "Tareas",
        "tab.plugins": "Complementos",
        "sidebar.toggle": "Mostrar u ocultar la barra lateral"
      },
      "fr": {
        "tab.chat": "Chat",
        "tab.projects": "Projets",
        "tab.tasks": "Tâches",
        "tab.plugins": "Plugins",
        "sidebar.toggle": "Afficher ou masquer la barre latérale"
      },
      "de": {
        "tab.chat": "Chat",
        "tab.projects": "Projekte",
        "tab.tasks": "Aufgaben",
        "tab.plugins": "Plugins",
        "sidebar.toggle": "Seitenleiste ein- oder ausblenden"
      },
      "ru": {
        "tab.chat": "Чат",
        "tab.projects": "Проекты",
        "tab.tasks": "Задачи",
        "tab.plugins": "Плагины",
        "sidebar.toggle": "Показать или скрыть боковую панель"
      },
      "pt": {
        "tab.chat": "Chat",
        "tab.projects": "Projetos",
        "tab.tasks": "Tarefas",
        "tab.plugins": "Plugins",
        "sidebar.toggle": "Mostrar ou ocultar a barra lateral"
      }
    }

    const TABS = [
  { id: 'chat', panel: null, labelKey: 'tab.chat', icon: 'chat' },
  { id: 'projects', panel: 'projects', labelKey: 'tab.projects', icon: 'board' },
  { id: 'schedules', panel: 'schedules', labelKey: 'tab.tasks', icon: 'clock' },
  { id: 'plugins', panel: 'plugins', labelKey: 'tab.plugins', icon: 'plug' },
    ]

    /** 'chat' when no panel is selected, else the matching tab. */
    function activeTabId(activePanelId) {
      if (activePanelId === null || activePanelId === undefined) return 'chat'
      const match = TABS.find(tab => tab.panel === activePanelId)
      return match ? match.id : 'chat'
    }

    // ---- icons -------------------------------------------------------------

    const PATHS = {
      chat: 'M4 5.5h16v10H8.5L4 19z',
      board: 'M4 5h4v11H4zM10 5h4v14h-4zM16 5h4v7h-4z',
      clock: 'M12 4a8 8 0 100 16 8 8 0 000-16zm0 3.5V12l3 2',
      plug: 'M8 4v5M16 4v5M6 9h12v3a6 6 0 01-12 0zM12 18v3',
    }

    function Glyph({ name }) {
      return h('svg', {
        viewBox: '0 0 24 24', width: 15, height: 15, 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
        strokeLinecap: 'round', strokeLinejoin: 'round',
      }, h('path', { d: PATHS[name] ?? PATHS.chat }))
    }

    // ---- styling (theme tokens only) ---------------------------------------

    const S = {
      // Occupies the reserved bottom track; nothing is overlapped.
      wrap: {
        display: 'flex', justifyContent: 'center', padding: '7px 0 9px',
        borderTop: '1px solid var(--dsw-alias-border-l1, rgba(150,160,210,0.10))',
        background: 'var(--dsw-alias-bg-base, #0d0f1a)',
      },
      bar: {
        display: 'flex', alignItems: 'center', gap: 3,
        padding: 4, borderRadius: 999,
        background: 'var(--dsw-alias-bg-layer-2, rgba(30,36,57,0.92))',
        border: '1px solid var(--dsw-alias-border-l2, rgba(150,160,210,0.17))',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(12px)',
      },
      tab: {
        appearance: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 13px', borderRadius: 999,
        fontSize: 12.5, fontWeight: 500, background: 'transparent',
        color: 'var(--dsw-alias-label-secondary, #b9c0d4)',
        transition: 'background 140ms ease, color 140ms ease',
      },
      tabActive: {
        background: 'var(--dsw-alias-button-primary-fill, #7c6cff)',
        color: 'var(--dsw-alias-label-primary-foreground, #0b0d16)',
        fontWeight: 600,
      },
      divider: {
        width: 1, height: 18, margin: '0 3px',
        background: 'var(--dsw-alias-border-l2, rgba(150,160,210,0.17))',
      },
      iconButton: {
        appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent',
        color: 'var(--dsw-alias-label-tertiary, #8d96b0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 999,
      },
    }

    // ---- component ---------------------------------------------------------

    function TabBar(props) {
      const { t, layout, panelIds } = props
      const [activePanel, setActivePanel] = useState(() => read(layout))
      const [hovered, setHovered] = useState(null)

      useEffect(() => {
        const observable = layout?.panelInfo
        if (!observable || typeof observable.subscribe !== 'function') return undefined
        // useSyncExternalStore's contract: subscribe returns its own disposer.
        return observable.subscribe(() => { setActivePanel(read(layout)) })
      }, [layout])

      const select = useCallback((panel) => {
        try { layout.selectPanel(panel) }
        catch (_error) { /* an unregistered panel simply keeps the selection */ }
      }, [layout])

      const tabs = TABS.filter(tab => tab.panel === null || panelIds.includes(tab.panel))
      const active = activeTabId(activePanel)

      return h('div', { style: S.wrap },
        h('nav', { style: S.bar, 'aria-label': t('tab.chat') },
          tabs.map(tab => {
            const isActive = tab.id === active
            const isHovered = hovered === tab.id && !isActive
            return h('button', {
              key: tab.id,
              type: 'button',
              style: {
                ...S.tab,
                ...(isActive ? S.tabActive : null),
                ...(isHovered ? { background: 'var(--dsw-alias-interactive-bg-hover, rgba(124,108,255,0.12))', color: 'var(--dsw-alias-label-primary, #eef1fa)' } : null),
              },
              'aria-current': isActive ? 'page' : undefined,
              onMouseEnter: () => setHovered(tab.id),
              onMouseLeave: () => setHovered(null),
              onClick: () => select(tab.panel),
            }, h(Glyph, { name: tab.icon }), t(tab.labelKey))
          }),
          typeof layout?.toggleSidebar === 'function'
            ? [
                h('span', { key: 'div', style: S.divider }),
                h('button', {
                  key: 'side', type: 'button', style: S.iconButton,
                  title: t('sidebar.toggle'), 'aria-label': t('sidebar.toggle'),
                  onClick: () => { layout.toggleSidebar() },
                }, h('svg', {
                  viewBox: '0 0 24 24', width: 15, height: 15, 'aria-hidden': true,
                  fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round',
                }, h('rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2.5 }),
                   h('path', { d: 'M9.5 4.5v15' }))),
              ]
            : null)
      )
    }

    /** Current panel id, tolerating an observable that is not ready yet. */
    function read(layout) {
      try { return layout?.panelInfo?.getSnapshot?.()?.activePanelId ?? null }
      catch (_error) { return null }
    }

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'dsh-shell: dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.effect(() => ctx.slots.inject('shell.bottom', () => ctx.slots.register({
          name: 'shell.bottom',
          locale: NS,
          inject: () => ({
            t,
            layout: ctx.layout,
            // Only panels registered in `main` may be selected.
            panelIds: ctx.slots.entriesOfSlot('main').map(entry => entry.options.key),
          }),
        }, TabBar)), 'dsh-shell: tab bar')
      },
    }
  },
})
