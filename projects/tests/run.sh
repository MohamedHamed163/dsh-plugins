#!/bin/bash
# Full test pass for the bundle.
#
#   tools      — the three agent tools against a stubbed @deepseek-ai/dsh-tools
#   routes     — the Host board routes, and that the Client's route names pair
#   sharing    — two store instances (panel + agent tools) see each other's writes
#   board-view — pure board derivations (grouping, ordering, progress, filters)
#   locale-sync— client.js's inlined dictionaries match ui-locales.js
#   panel      — the real client.js driven through a stubbed Harness with React
#
# The panel suite needs React; it is skipped with a notice when the harness
# checkout's node_modules are absent.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/node_modules" "$WORK/tests"
cp index.js store.js client.js board-view.js ui-locales.js "$WORK/"
cp tests/*.mjs "$WORK/tests/"
cp -R tests/stub/@deepseek-ai "$WORK/node_modules/"
printf '{ "name": "plugtest", "type": "module", "private": true }\n' > "$WORK/package.json"

status=0

echo "── tools ──────────────────────────────────────────"
( cd "$WORK" && cp tests/tools.test.mjs run.mjs && TEST_DIR="$WORK/data" node run.mjs ) || status=1

echo
echo "── routes ─────────────────────────────────────────"
( cd "$WORK" && TEST_DIR="$WORK/routedata" node tests/routes.test.mjs ) || status=1

echo
echo "── sharing ────────────────────────────────────────"
( cd "$WORK" && node tests/sharing.test.mjs ) || status=1

echo
echo "── board-view ─────────────────────────────────────"
( cd "$WORK" && node tests/board-view.test.mjs ) || status=1

echo
echo "── locale-sync ────────────────────────────────────"
( cd "$WORK" && node tests/locale-sync.test.mjs ) || status=1

echo
echo "── panel ──────────────────────────────────────────"
PNPM_STORE="$ROOT/../../upstream/deepseek-harness/node_modules/.pnpm"
if [ -d "$PNPM_STORE/react@18.3.1" ]; then
  for pkg in "react@18.3.1/node_modules/react" \
             "react-dom@18.3.1_react@18.3.1/node_modules/react-dom" \
             "scheduler@0.23.2/node_modules/scheduler" \
             "loose-envify@1.4.0/node_modules/loose-envify" \
             "js-tokens@4.0.0/node_modules/js-tokens"; do
    [ -d "$PNPM_STORE/$pkg" ] && ln -sf "$PNPM_STORE/$pkg" "$WORK/node_modules/$(basename "$pkg")"
  done
  ( cd "$WORK" && node tests/panel-render.test.mjs ) || status=1
else
  echo "skipped: React not found at $PNPM_STORE (run pnpm install in the harness checkout)"
fi

echo
[ $status -eq 0 ] && echo "ALL SUITES PASSED" || echo "SOME SUITES FAILED"
exit $status
