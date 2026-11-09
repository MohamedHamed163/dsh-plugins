# Midnight theme (`@local/dsh-theme`)

Reskins the DeepSeek Harness Web UI: deep indigo surfaces, a violet accent, and
rounder corners throughout.

An **out-of-tree bundle**, so pulling upstream never conflicts with it.

## How it works

It overrides the Harness's own `--dsw-alias-*` design tokens — 118 of them —
rather than any component CSS. That choice is the whole design:

- **Layout, spacing and behaviour are untouched.** Only colour and radius values
  change, so nothing can shift or overlap.
- **A renamed token degrades, it does not break.** That token keeps the
  Harness's own value and only that one colour reverts to stock.
- **No `!important`.** The rule is written as `html body` plus the dark-theme
  attribute, which out-specifies the Harness's `body[data-ds-dark-theme]` on
  its own.

The stylesheet renders as a React `<style>` element inside a root-scope slot
(`shell.overlay`), so unloading the plugin removes it and the stock theme
returns with no cleanup of its own.

## The palette

`palette.js` holds the seed colours and the full token map. Edit `SEED` to
change the theme; every derived token follows from it.

| Role | Value |
|---|---|
| Page background | `#0d0f1a` |
| Raised surfaces | `#161a2b` → `#323c58` |
| Accent (primary buttons, brand) | `#7c6cff` |
| Links and informational state | `#6ea8fe` |
| Primary / secondary text | `#eef1fa` / `#b9c0d4` |
| Success / warning / error | `#3ddc97` / `#ffb454` / `#ff6b81` |

Text contrast against the surfaces it sits on is checked by the tests:
16.9:1 primary, 10.5:1 secondary, 5.9:1 tertiary — all at or above WCAG AA.

## Install

```bash
dsh plugin --profile web add link:/path/to/hamed/dsh-plugins/theme
```

Then restart the Harness. Needs no link to the dsh runtime: the bundle imports
nothing from the Harness.

Confirm it took effect in the browser console:

```js
getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base')  // #0d0f1a
document.querySelector('style[data-dsh-theme="midnight"]')               // the element
```

## Turning it off

`dsh plugin --profile web remove @local/dsh-theme`, or disable the
`theme-midnight` row from Plugin Manager. The stock theme returns immediately.

## Tests

```
./tests/run.sh
```

19 checks: that every overridden token is one the Harness actually defines
(checked against `tests/known-tokens.json`, captured from a running client),
that no value inherits a stock `color-mix`, the three contrast ratios, the
specificity of the generated rule, that `client.js`'s inlined stylesheet equals
`palette.js`'s output exactly, and that the plugin registers one labelled effect
into a root-scope slot rendering a single `<style>`.

## Known limitations and deferred work

- **Dark only.** The overrides apply to the dark scope and the default `body`.
  A light-theme Harness would show the dark palette's values; the light scope is
  not themed.
- **Token list is a snapshot.** `tests/known-tokens.json` came from dsh
  0.2.2-rc.1. A Harness that adds tokens will have unthemed colours until the
  palette covers them; one that renames tokens leaves those stock.
- **No typography change.** `--dsw-font-family` and `--dsw-font-family-brand`
  are left alone, so text metrics stay exactly as the Harness lays them out.
- **Not verified against the Plugin Manager's own detail views** or any
  print/export path.
