#!/bin/bash
# Shared helpers for Rafters hooks.

# find_rafters_root <start-dir>
# Walks up from <start-dir> looking for the .rafters/config.rafters.json
# marker -- the same marker the CLI's discoverProjectRoot uses. Prints the
# project root on stdout and returns 0 if found; prints nothing and returns
# 1 if <start-dir> is empty or no ancestor contains the marker.
find_rafters_root() {
  local dir="$1"
  [ -n "$dir" ] || return 1
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.rafters/config.rafters.json" ]; then
      printf '%s\n' "$dir"
      return 0
    fi
    local parent
    parent=$(dirname "$dir")
    [ "$parent" != "$dir" ] || break
    dir="$parent"
  done
  return 1
}
