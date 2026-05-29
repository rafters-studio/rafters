#!/bin/bash
# Rafters SessionStart hook: inject design tool requirements
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only inject in projects that actually use rafters. Walk up from CWD for
# the .rafters/config.rafters.json marker; exit silently if not found.
find_rafters_root "$CWD" >/dev/null || exit 0

jq -n --arg ctx "[Rafters] You are working in a Rafters-powered frontend project. MANDATORY rules:

1. Before writing ANY UI code, use the rafters MCP tools: rafters_pattern (how to implement a pattern), rafters_component (component intelligence), rafters_vocabulary (what exists in the design system).

2. If you do not know what to build or how it should look, invoke the frontend-design skill FIRST to get a design direction before writing code.

3. Container and Grid handle ALL layout. Never write flex, grid, gap, padding, or margin utilities directly.

4. Use typography components (H1, H2, P, Code, Small) with token props (size, weight, color). Never use raw <h1>/<p>/<span> with class attributes.

5. Use semantic color tokens (bg-primary, text-accent). Never use arbitrary values, hex colors, or var().

6. Never pass class/className to Rafters components. Use token props for overrides.

The pre-edit hook WILL block violations. Consult the design system BEFORE writing, not after." '{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $ctx
  }
}'
