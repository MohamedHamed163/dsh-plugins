/**
 * Which tabs the bar shows, and how it resolves the active one.
 *
 * Kept free of React so the ordering and matching rules can be tested.
 *
 * @module @local/dsh-shell/tabs
 */

/**
 * The bar's entries, in display order.
 *
 * `panel` is the `MainPanelId` passed to `ctx.layout.selectPanel`; `null` means
 * the conversation, which is what the Harness shows when no panel is selected.
 * Ids that are not registered are dropped at render time rather than throwing,
 * because `selectPanel` rejects an unregistered key.
 */
export const TABS = [
  { id: 'chat', panel: null, labelKey: 'tab.chat', icon: 'chat' },
  { id: 'projects', panel: 'projects', labelKey: 'tab.projects', icon: 'board' },
  { id: 'schedules', panel: 'schedules', labelKey: 'tab.tasks', icon: 'clock' },
  { id: 'plugins', panel: 'plugins', labelKey: 'tab.plugins', icon: 'plug' },
]

/**
 * The tab matching the current panel selection.
 * @param activePanelId - `ctx.layout.panelInfo`'s current value, or null.
 * @returns the matching tab id; 'chat' when no panel is selected.
 */
export function activeTabId(activePanelId) {
  if (activePanelId === null || activePanelId === undefined) return 'chat'
  const match = TABS.find(tab => tab.panel === activePanelId)
  return match ? match.id : 'chat'
}

/**
 * The tabs worth drawing: chat always, plus whichever panels exist.
 *
 * A panel belongs to another plugin, so a profile without that plugin must not
 * show a tab that cannot be selected.
 * @param registeredPanelIds - panel ids currently registered in `main`.
 * @returns the tabs to render, in order.
 */
export function visibleTabs(registeredPanelIds) {
  const available = new Set(registeredPanelIds ?? [])
  return TABS.filter(tab => tab.panel === null || available.has(tab.panel))
}
