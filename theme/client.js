/**
 * Midnight theme for the Harness Web UI.
 *
 * Renders one <style> element into a root-scope slot. It overrides the
 * Harness's own `--dsw-alias-*` design tokens rather than any component CSS, so
 * layout, spacing and behaviour are untouched and a token the Harness renames
 * simply keeps its original value.
 *
 * The stylesheet is rendered as a React element, so unmounting the plugin
 * removes it and the stock theme returns with no cleanup of our own.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-theme',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const THEME_CSS = "html body, html body[data-ds-dark-theme] {\n  --dsw-alias-bg-base: #0d0f1a;\n  --dsw-alias-bg-document-preview: #0d0f1a;\n  --dsw-alias-bg-layer-1: #161a2b;\n  --dsw-alias-bg-layer-2: #1e2439;\n  --dsw-alias-bg-layer-3: #273049;\n  --dsw-alias-bg-module-platform: #273049;\n  --dsw-alias-bg-multi-select: #161a2b;\n  --dsw-alias-bg-overlay: #323c58;\n  --dsw-alias-bg-mask-1: rgba(5, 6, 14, 0.62);\n  --dsw-alias-bg-mask-2: rgba(5, 6, 14, 0.28);\n  --dsw-alias-bg-mask-3: rgba(5, 6, 14, 0.55);\n  --dsw-alias-bg-mask-drop: rgba(124, 108, 255, 0.22);\n  --dsw-alias-bg-skeleton: rgba(124, 108, 255, 0.10);\n  --dsw-alias-border-l1: rgba(150, 160, 210, 0.10);\n  --dsw-alias-border-l2: rgba(150, 160, 210, 0.17);\n  --dsw-alias-border-l2-darkmode-thin: rgba(150, 160, 210, 0.12);\n  --dsw-alias-border-l3: rgba(150, 160, 210, 0.26);\n  --dsw-alias-border-l4: rgba(150, 160, 210, 0.34);\n  --dsw-alias-border-inverted: rgba(150, 160, 210, 0.10);\n  --dsw-alias-border-inverted2: rgba(150, 160, 210, 0.16);\n  --dsw-alias-label-primary: #eef1fa;\n  --dsw-alias-label-primary-bluish: #e6ebff;\n  --dsw-alias-label-primary-dimmed: #dbe1f2;\n  --dsw-alias-label-primary-foreground: #0b0d16;\n  --dsw-alias-label-primary-inverted: #273049;\n  --dsw-alias-label-secondary: #b9c0d4;\n  --dsw-alias-label-tertiary: #8d96b0;\n  --dsw-alias-label-caption: #737d99;\n  --dsw-alias-label-dimmed: #3b4463;\n  --dsw-alias-label-document-preview: #b9c0d4;\n  --dsw-alias-label-shimmer: rgba(238, 241, 250, 0.45);\n  --dsw-alias-label-deep-diving: #9fb4ff;\n  --dsw-alias-label-deep-diving-shimmer: #c3d2ff;\n  --dsw-alias-link: #6ea8fe;\n  --dsw-alias-brand-primary: #7c6cff;\n  --dsw-alias-brand-primary-invert: #7c6cff;\n  --dsw-alias-brand-primary-new-colorprimary-new-color: #7c6cff;\n  --dsw-alias-brand-text: #eef1fa;\n  --dsw-alias-button-primary-fill: #7c6cff;\n  --dsw-alias-button-primary-hover: #9a8dff;\n  --dsw-alias-button-primary-dimmed: #4a4480;\n  --dsw-alias-button-contrast-fill: #eef1fa;\n  --dsw-alias-button-elevated-fill: #323c58;\n  --dsw-alias-button-floating-fill: #1e2439;\n  --dsw-alias-button-floating-hover: #273049;\n  --dsw-alias-button-ghost-active-fill: #273049;\n  --dsw-alias-button-ghost-active-hover: #323c58;\n  --dsw-alias-button-ghost-active-border: rgba(150, 160, 210, 0.36);\n  --dsw-alias-button-info-fill: #6ea8fe;\n  --dsw-alias-button-info-hover: #8bbcff;\n  --dsw-alias-button-tool-bar-fill: rgba(39, 48, 73, 0.55);\n  --dsw-alias-button-tool-bar-fill-invisible: rgba(13, 15, 26, 0.40);\n  --dsw-alias-button-tool-bar-hover: rgba(50, 60, 88, 0.70);\n  --dsw-alias-interactive-bg-hover: rgba(124, 108, 255, 0.12);\n  --dsw-alias-interactive-bg-hover-solid: #273049;\n  --dsw-alias-interactive-bg-active: rgba(124, 108, 255, 0.20);\n  --dsw-alias-interactive-bg-hover-accent: rgba(124, 108, 255, 0.30);\n  --dsw-alias-interactive-bg-hover-danger: rgba(255, 107, 129, 0.18);\n  --dsw-alias-turn-trigger-bg: rgba(124, 108, 255, 0.12);\n  --dsw-alias-turn-trigger-bg-hover: rgba(124, 108, 255, 0.20);\n  --dsw-alias-state-success-primary: #3ddc97;\n  --dsw-alias-state-success-secondary: #62e8ae;\n  --dsw-alias-state-success-tertiary: #13332a;\n  --dsw-alias-state-warn-primary: #ffb454;\n  --dsw-alias-state-warn-secondary: #ffc677;\n  --dsw-alias-state-warn-tertiary: #2e2415;\n  --dsw-alias-state-warn-label: #e09a3d;\n  --dsw-alias-state-error-primary: #ff6b81;\n  --dsw-alias-state-error-secondary: #ff6b81;\n  --dsw-alias-state-business-primary: #6ea8fe;\n  --dsw-alias-state-business-tertiary: #1d2746;\n  --dsw-alias-state-done-primary: #b79cff;\n  --dsw-alias-state-idle-primary: #39425e;\n  --dsw-alias-markdown-code-block: #11141f;\n  --dsw-alias-markdown-code-block-banner: #1e2439;\n  --dsw-alias-markdown-inline-code: #1b2133;\n  --dsw-alias-markdown-code-segment-selected: #273049;\n  --dsw-alias-markdown-code-segment-unselected: #11141f;\n  --dsw-alias-markdown-citation: #273049;\n  --dsw-alias-markdown-placeholder: #1e2439;\n  --dsw-alias-markdown-tag: #1e2439;\n  --dsw-alias-code-diff-added: rgba(61, 220, 151, 0.14);\n  --dsw-alias-code-diff-deleted: rgba(255, 107, 129, 0.14);\n  --dsw-alias-file-diff-added-bg: #14301f;\n  --dsw-alias-file-diff-added-gutter: #0d2016;\n  --dsw-alias-file-diff-added-marker: #3ddc97;\n  --dsw-alias-file-diff-deleted-bg: #36151f;\n  --dsw-alias-file-diff-deleted-gutter: #240d14;\n  --dsw-alias-file-diff-deleted-marker: #ff6b81;\n  --dsw-alias-menu-group-header-fill: rgba(30, 36, 57, 0.94);\n  --dsw-alias-menu-icon: #eef1fa;\n  --dsw-alias-tooltip-bg: #323c58;\n  --dsw-alias-tooltip-key-bg: #3e4a6b;\n  --dsw-alias-toast-bg: #323c58;\n  --dsw-alias-toast-label: #eef1fa;\n  --dsw-alias-switch-thumb: #b9c0d4;\n  --dsw-alias-settings-card-fill: #1e2439;\n  --dsw-alias-settings-card-stroke: rgba(150, 160, 210, 0.22);\n  --dsw-alias-scrollbar-bg-l1: #2a3148;\n  --dsw-alias-scrollbar-bg-l2: #39425e;\n  --dsw-alias-scrollbar-hover-l1: #39425e;\n  --dsw-alias-scrollbar-hover-l2: #485375;\n  --dsw-alias-onboarding-accent: #7c6cff;\n  --dsw-alias-onboarding-card-fill: rgba(30, 36, 57, 0.80);\n  --dsw-alias-onboarding-checkbox-border: rgba(150, 160, 210, 0.22);\n  --dsw-alias-onboarding-secondary-fill: #273049;\n  --dsw-alias-illustration-background: #1e2439;\n  --dsw-alias-illustration-backing: #273049;\n  --dsw-alias-illustration-surface: #323c58;\n  --dsw-alias-illustration-inset: #273049;\n  --dsw-alias-illustration-shadow: #273049;\n  --dsw-alias-illustration-detail: #8d96b0;\n  --dsw-radius-xs: 6px;\n  --dsw-radius-sm: 10px;\n  --dsw-radius-md: 14px;\n  --dsw-radius-lg: 18px;\n  --dsw-radius-xl: 24px;\n  --dsw-radius-panel: 30px;\n}\nhtml, html body { background: #0d0f1a; }"

    /** Invisible: its only output is the stylesheet. */
    function MidnightTheme() {
      return h('style', { 'data-dsh-theme': 'midnight' }, THEME_CSS)
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'theme-midnight',
          order: -100,
        }, MidnightTheme)), 'dsh-theme: midnight tokens')
      },
    }
  },
})
