#!/bin/bash
# Warn at session start when the on-disk plugin artifact has desynced from the
# version plugin.json declares. Spawns the bundle fresh (bin/rafters --version)
# rather than reading plugin/package.json directly -- comparing two committed
# files would prove nothing about whether the artifact actually loads. Fails
# silently (no context, exit 0) when jq, plugin.json, or the spawn are
# unavailable, matching session-start.sh's skip-don't-crash convention.
PLUGIN_DIR="$(dirname "${BASH_SOURCE[0]}")/.."
DECLARED=$(jq -r '.version // empty' "$PLUGIN_DIR/.claude-plugin/plugin.json" 2>/dev/null)
RUNNING=$("$PLUGIN_DIR/bin/rafters" --version 2>/dev/null)

if [ -n "$DECLARED" ] && [ -n "$RUNNING" ] && [ "$DECLARED" != "$RUNNING" ]; then
  jq -n --arg ctx "[Rafters] WARNING: the installed plugin declares version $DECLARED but the bundled MCP artifact reports $RUNNING. Restart Claude Code so the rafters MCP server matches the installed plugin." \
    '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":$ctx}}'
fi
