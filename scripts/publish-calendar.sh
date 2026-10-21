#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/update-calendar.sh
node scripts/publish-calendar.cjs "$@"
