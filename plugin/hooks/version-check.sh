#!/bin/bash
# Warn at session start when the plugin is not what it should be, in two ways:
#
# 1. The on-disk plugin artifact has desynced from the version plugin.json
#    declares. Spawns the bundle fresh (bin/rafters --version) rather than
#    reading plugin/package.json directly -- comparing two committed files would
#    prove nothing about whether the artifact actually loads.
# 2. The installed plugin is older than the released rafters. The released
#    version is the npm registry's `latest` for rafters, asked with a short
#    timeout; an unreachable registry is no warning.
#
# Fails silently (no context, exit 0) when jq, plugin.json, the spawn or the
# registry are unavailable, matching session-start.sh's skip-don't-crash convention.
PLUGIN_DIR="$(dirname "${BASH_SOURCE[0]}")/.."
DECLARED=$(jq -r '.version // empty' "$PLUGIN_DIR/.claude-plugin/plugin.json" 2>/dev/null)
RUNNING=$("$PLUGIN_DIR/bin/rafters" --version 2>/dev/null)

MESSAGE=""
if [ -n "$DECLARED" ] && [ -n "$RUNNING" ] && [ "$DECLARED" != "$RUNNING" ]; then
  MESSAGE="[Rafters] WARNING: the installed plugin declares version $DECLARED but the bundled MCP artifact reports $RUNNING. Restart Claude Code so the rafters MCP server matches the installed plugin."
fi

if [ -n "$DECLARED" ]; then
  RELEASED=$(curl -fsS --max-time 3 https://registry.npmjs.org/rafters/latest 2>/dev/null | jq -r '.version // empty' 2>/dev/null)
  if [ -n "$RELEASED" ] && [ "$DECLARED" != "$RELEASED" ] \
    && [ "$(printf '%s\n%s\n' "$DECLARED" "$RELEASED" | sort -V | head -n 1)" = "$DECLARED" ]; then
    MESSAGE="${MESSAGE:+$MESSAGE }[Rafters] WARNING: the installed plugin is version $DECLARED and rafters $RELEASED is released. Update the rafters plugin from the /plugin menu, then restart Claude Code."
  fi
fi

if [ -n "$MESSAGE" ]; then
  jq -n --arg ctx "$MESSAGE" \
    '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":$ctx}}'
fi
