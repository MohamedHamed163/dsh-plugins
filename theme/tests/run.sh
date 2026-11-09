#!/bin/bash
# Verifies the palette against the Harness's real token names, checks text
# contrast, and drives the shipped client.js through a stubbed loader.
set -euo pipefail
cd "$(dirname "$0")/.."
node tests/theme.test.mjs
