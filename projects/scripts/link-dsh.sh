#!/bin/bash
# Links @deepseek-ai/dsh-tools into this bundle.
#
# An out-of-tree bundle lives outside the Harness's node_modules, so the agent
# tools' one Harness import cannot resolve on its own. Point this at the dsh
# that actually runs — a source checkout and an installed dsh are different
# versions, and mixing them is what this script exists to avoid.
#
#   ./scripts/link-dsh.sh                       # auto-detect
#   ./scripts/link-dsh.sh /path/to/deepseek-harness   # a source checkout
set -euo pipefail
cd "$(dirname "$0")/.."

candidates=()
if [ $# -gt 0 ]; then
  candidates+=("$1/packages/core/tools")
else
  candidates+=(
    "$HOME/.dsh/profiles/node_modules/@deepseek-ai/dsh-tools"
    "/opt/homebrew/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-tools"
    "/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-tools"
  )
fi

for candidate in "${candidates[@]}"; do
  if [ -f "$candidate/package.json" ]; then
    mkdir -p node_modules/@deepseek-ai
    rm -rf node_modules/@deepseek-ai/dsh-tools
    ln -s "$(cd "$candidate" && pwd -P)" node_modules/@deepseek-ai/dsh-tools
    echo "linked @deepseek-ai/dsh-tools -> $candidate"
    node -e "console.log('   version:', require('./node_modules/@deepseek-ai/dsh-tools/package.json').version)"
    exit 0
  fi
done

echo "could not find @deepseek-ai/dsh-tools in:" >&2
printf '  %s\n' "${candidates[@]}" >&2
echo "Pass the path to a deepseek-harness checkout as the first argument." >&2
exit 1
