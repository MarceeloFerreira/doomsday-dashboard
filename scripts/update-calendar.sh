#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
runtime="/mnt/c/Users/maarc/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"
if [[ ! -f "$runtime" ]]; then
  echo 'Runtime Python Windows ausente; calendário anterior preservado.' >&2
  exit 1
fi
"$runtime" "$(wslpath -w "$PWD/scripts/update_calendar.py")"
