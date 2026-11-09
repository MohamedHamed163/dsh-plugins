/**
 * Midnight palette: the token overrides that reskin the Harness Web UI.
 *
 * Every key is a real `--dsw-alias-*` token read from the running client, so
 * each entry replaces a value the app already consumes. Overriding tokens, not
 * component CSS, is what keeps the reskin from breaking layout: a token the
 * Harness renames falls back to its own value and only that colour reverts.
 *
 * @module @local/dsh-theme/palette
 */

/** Base hues the rest of the palette is derived from. */
export const SEED = {
  /** Page background, deepest surface. */
  base: '#0d0f1a',
  /** Raised surfaces, in increasing elevation. */
  layer1: '#161a2b',
  layer2: '#1e2439',
  layer3: '#273049',
  layer4: '#323c58',
  /** Primary accent. */
  accent: '#7c6cff',
  accentHover: '#9a8dff',
  /** Secondary accent used for links and informational state. */
  info: '#6ea8fe',
  infoHover: '#8bbcff',
  /** Text, from strongest to faintest. */
  textPrimary: '#eef1fa',
  textSecondary: '#b9c0d4',
  textTertiary: '#8d96b0',
  textCaption: '#737d99',
  /** Status colours. */
  success: '#3ddc97',
  warn: '#ffb454',
  error: '#ff6b81',
  done: '#b79cff',
}

/**
 * The complete override map.
 *
 * Keys are token names without the `--` prefix handling; values are plain CSS
 * colours. Tokens the Harness computes with `color-mix` are replaced with
 * concrete values so they do not depend on the original seed colours.
 * @returns token name to value.
 */
export function tokens() {
  const s = SEED
  return {
    // Surfaces
    '--dsw-alias-bg-base': s.base,
    '--dsw-alias-bg-document-preview': s.base,
    '--dsw-alias-bg-layer-1': s.layer1,
    '--dsw-alias-bg-layer-2': s.layer2,
    '--dsw-alias-bg-layer-3': s.layer3,
    '--dsw-alias-bg-module-platform': s.layer3,
    '--dsw-alias-bg-multi-select': s.layer1,
    '--dsw-alias-bg-overlay': s.layer4,
    '--dsw-alias-bg-mask-1': 'rgba(5, 6, 14, 0.62)',
    '--dsw-alias-bg-mask-2': 'rgba(5, 6, 14, 0.28)',
    '--dsw-alias-bg-mask-3': 'rgba(5, 6, 14, 0.55)',
    '--dsw-alias-bg-mask-drop': 'rgba(124, 108, 255, 0.22)',
    '--dsw-alias-bg-skeleton': 'rgba(124, 108, 255, 0.10)',

    // Borders — tinted toward the accent so edges read as part of the theme.
    '--dsw-alias-border-l1': 'rgba(150, 160, 210, 0.10)',
    '--dsw-alias-border-l2': 'rgba(150, 160, 210, 0.17)',
    '--dsw-alias-border-l2-darkmode-thin': 'rgba(150, 160, 210, 0.12)',
    '--dsw-alias-border-l3': 'rgba(150, 160, 210, 0.26)',
    '--dsw-alias-border-l4': 'rgba(150, 160, 210, 0.34)',
    '--dsw-alias-border-inverted': 'rgba(150, 160, 210, 0.10)',
    '--dsw-alias-border-inverted2': 'rgba(150, 160, 210, 0.16)',

    // Text
    '--dsw-alias-label-primary': s.textPrimary,
    '--dsw-alias-label-primary-bluish': '#e6ebff',
    '--dsw-alias-label-primary-dimmed': '#dbe1f2',
    '--dsw-alias-label-primary-foreground': '#0b0d16',
    '--dsw-alias-label-primary-inverted': s.layer3,
    '--dsw-alias-label-secondary': s.textSecondary,
    '--dsw-alias-label-tertiary': s.textTertiary,
    '--dsw-alias-label-caption': s.textCaption,
    '--dsw-alias-label-dimmed': '#3b4463',
    '--dsw-alias-label-document-preview': s.textSecondary,
    '--dsw-alias-label-shimmer': 'rgba(238, 241, 250, 0.45)',
    '--dsw-alias-label-deep-diving': '#9fb4ff',
    '--dsw-alias-label-deep-diving-shimmer': '#c3d2ff',
    '--dsw-alias-link': s.info,

    // Brand and primary buttons — the accent is the biggest visual change.
    '--dsw-alias-brand-primary': s.accent,
    '--dsw-alias-brand-primary-invert': s.accent,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': s.accent,
    '--dsw-alias-brand-text': s.textPrimary,
    '--dsw-alias-button-primary-fill': s.accent,
    '--dsw-alias-button-primary-hover': s.accentHover,
    '--dsw-alias-button-primary-dimmed': '#4a4480',
    '--dsw-alias-button-contrast-fill': s.textPrimary,
    '--dsw-alias-button-elevated-fill': s.layer4,
    '--dsw-alias-button-floating-fill': s.layer2,
    '--dsw-alias-button-floating-hover': s.layer3,
    '--dsw-alias-button-ghost-active-fill': s.layer3,
    '--dsw-alias-button-ghost-active-hover': s.layer4,
    '--dsw-alias-button-ghost-active-border': 'rgba(150, 160, 210, 0.36)',
    '--dsw-alias-button-info-fill': s.info,
    '--dsw-alias-button-info-hover': s.infoHover,
    '--dsw-alias-button-tool-bar-fill': 'rgba(39, 48, 73, 0.55)',
    '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(13, 15, 26, 0.40)',
    '--dsw-alias-button-tool-bar-hover': 'rgba(50, 60, 88, 0.70)',

    // Interactive states
    '--dsw-alias-interactive-bg-hover': 'rgba(124, 108, 255, 0.12)',
    '--dsw-alias-interactive-bg-hover-solid': s.layer3,
    '--dsw-alias-interactive-bg-active': 'rgba(124, 108, 255, 0.20)',
    '--dsw-alias-interactive-bg-hover-accent': 'rgba(124, 108, 255, 0.30)',
    '--dsw-alias-interactive-bg-hover-danger': 'rgba(255, 107, 129, 0.18)',
    '--dsw-alias-turn-trigger-bg': 'rgba(124, 108, 255, 0.12)',
    '--dsw-alias-turn-trigger-bg-hover': 'rgba(124, 108, 255, 0.20)',

    // Status
    '--dsw-alias-state-success-primary': s.success,
    '--dsw-alias-state-success-secondary': '#62e8ae',
    '--dsw-alias-state-success-tertiary': '#13332a',
    '--dsw-alias-state-warn-primary': s.warn,
    '--dsw-alias-state-warn-secondary': '#ffc677',
    '--dsw-alias-state-warn-tertiary': '#2e2415',
    '--dsw-alias-state-warn-label': '#e09a3d',
    '--dsw-alias-state-error-primary': s.error,
    '--dsw-alias-state-error-secondary': s.error,
    '--dsw-alias-state-business-primary': s.info,
    '--dsw-alias-state-business-tertiary': '#1d2746',
    '--dsw-alias-state-done-primary': s.done,
    '--dsw-alias-state-idle-primary': '#39425e',

    // Code and diffs
    '--dsw-alias-markdown-code-block': '#11141f',
    '--dsw-alias-markdown-code-block-banner': s.layer2,
    '--dsw-alias-markdown-inline-code': '#1b2133',
    '--dsw-alias-markdown-code-segment-selected': s.layer3,
    '--dsw-alias-markdown-code-segment-unselected': '#11141f',
    '--dsw-alias-markdown-citation': s.layer3,
    '--dsw-alias-markdown-placeholder': s.layer2,
    '--dsw-alias-markdown-tag': s.layer2,
    '--dsw-alias-code-diff-added': 'rgba(61, 220, 151, 0.14)',
    '--dsw-alias-code-diff-deleted': 'rgba(255, 107, 129, 0.14)',
    '--dsw-alias-file-diff-added-bg': '#14301f',
    '--dsw-alias-file-diff-added-gutter': '#0d2016',
    '--dsw-alias-file-diff-added-marker': s.success,
    '--dsw-alias-file-diff-deleted-bg': '#36151f',
    '--dsw-alias-file-diff-deleted-gutter': '#240d14',
    '--dsw-alias-file-diff-deleted-marker': s.error,

    // Chrome
    '--dsw-alias-menu-group-header-fill': 'rgba(30, 36, 57, 0.94)',
    '--dsw-alias-menu-icon': s.textPrimary,
    '--dsw-alias-tooltip-bg': s.layer4,
    '--dsw-alias-tooltip-key-bg': '#3e4a6b',
    '--dsw-alias-toast-bg': s.layer4,
    '--dsw-alias-toast-label': s.textPrimary,
    '--dsw-alias-switch-thumb': s.textSecondary,
    '--dsw-alias-settings-card-fill': s.layer2,
    '--dsw-alias-settings-card-stroke': 'rgba(150, 160, 210, 0.22)',
    '--dsw-alias-scrollbar-bg-l1': '#2a3148',
    '--dsw-alias-scrollbar-bg-l2': '#39425e',
    '--dsw-alias-scrollbar-hover-l1': '#39425e',
    '--dsw-alias-scrollbar-hover-l2': '#485375',
    '--dsw-alias-onboarding-accent': s.accent,
    '--dsw-alias-onboarding-card-fill': 'rgba(30, 36, 57, 0.80)',
    '--dsw-alias-onboarding-checkbox-border': 'rgba(150, 160, 210, 0.22)',
    '--dsw-alias-onboarding-secondary-fill': s.layer3,
    '--dsw-alias-illustration-background': s.layer2,
    '--dsw-alias-illustration-backing': s.layer3,
    '--dsw-alias-illustration-surface': s.layer4,
    '--dsw-alias-illustration-inset': s.layer3,
    '--dsw-alias-illustration-shadow': s.layer3,
    '--dsw-alias-illustration-detail': s.textTertiary,

    // Shape: rounder than stock, consistently.
    '--dsw-radius-xs': '6px',
    '--dsw-radius-sm': '10px',
    '--dsw-radius-md': '14px',
    '--dsw-radius-lg': '18px',
    '--dsw-radius-xl': '24px',
    '--dsw-radius-panel': '30px',
  }
}

/**
 * The override map as a CSS declaration block.
 *
 * Specificity must beat `body[data-ds-dark-theme]` (0,1,1), so the rule is
 * written against `html body` plus the attribute, and a second rule covers the
 * light scope.
 * @returns the stylesheet text.
 */
export function stylesheet() {
  const declarations = Object.entries(tokens())
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')
  return [
    `html body, html body[data-ds-dark-theme] {`,
    declarations,
    `}`,
    // The page background is painted before the app mounts, so set it too.
    `html, html body { background: ${SEED.base}; }`,
  ].join('\n')
}
