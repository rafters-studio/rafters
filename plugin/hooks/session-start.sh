#!/bin/bash
# Rafters SessionStart hook: inject design tool requirements
LIB="$(dirname "${BASH_SOURCE[0]}")/lib.sh"
if ! source "$LIB" || ! declare -F find_rafters_root >/dev/null; then
  echo "rafters session-start hook: cannot load $LIB -- context injection skipped" >&2
  exit 1
fi

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only inject in projects that actually use rafters. Walk up from CWD for
# the .rafters/config.rafters.json marker; exit silently if not found.
find_rafters_root "$CWD" >/dev/null || exit 0

# The injected contract is generated from the live MCP tool surface and
# committed alongside this hook. If it is missing or unreadable, skip context
# injection rather than crashing session start (matches version-check.sh).
CONTRACT="$(dirname "${BASH_SOURCE[0]}")/agent-contract.md"
[ -r "$CONTRACT" ] || exit 0
CONTEXT="$(cat "$CONTRACT")" || exit 0

jq -n --arg ctx "$CONTEXT" '{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $ctx
  }
}'
