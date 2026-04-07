#!/bin/bash
# Rafters SessionStart hook: inject design tool requirements
INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if [ -z "$CWD" ]; then
  exit 0
fi

# Check if this is a site/frontend project (has .astro files or src/pages/)
HAS_FRONTEND=""
if [ -d "$CWD/src/pages" ] || [ -d "$CWD/src/components" ] || ls "$CWD"/*.astro >/dev/null 2>&1; then
  HAS_FRONTEND="true"
fi

if [ -z "$HAS_FRONTEND" ]; then
  exit 0
fi

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
