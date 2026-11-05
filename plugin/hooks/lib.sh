#!/bin/bash
# Shared helpers for Rafters hooks.

# find_rafters_root <start-dir>
# Walks up from <start-dir> looking for the .rafters/config.rafters.json
# marker -- the same marker the CLI's discoverProjectRoot uses. Prints the
# project root on stdout and returns 0 if found; prints nothing and returns
# 1 if <start-dir> is empty or no ancestor contains the marker. Relative
# inputs are resolved against $PWD first, matching discoverProjectRoot's
# resolve(startDir).
find_rafters_root() {
  local dir="$1"
  [ -n "$dir" ] || return 1
  case "$dir" in /*) ;; *) dir="$PWD/$dir" ;; esac
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

# find_check_bin <project-root>
# The nearest rafters-check bin at or above the root, the same walk as
# findBin in packages/cli/src/commands/check.ts, so a workspace root's bin
# serves its packages. Prints the bin's path and returns 0, or returns 1.
find_check_bin() {
  local dir="$1"
  while :; do
    if [ -e "$dir/node_modules/.bin/rafters-check" ]; then
      printf '%s\n' "$dir/node_modules/.bin/rafters-check"
      return 0
    fi
    [ "$dir" != "/" ] || return 1
    dir=$(dirname "$dir")
  done
}

# is_installed_path <project-root> <file>
# Returns 0 when <file> is under a folder `rafters add` installs into: the
# project's componentsPath or primitivesPath, each a string or an array of
# strings and { "path": ... } entries, relative to the root. A config naming
# neither falls back to the folders rafters init writes by default.
is_installed_path() {
  local root="$1" file="$2" dir
  local dirs
  dirs=$(jq -r '[.componentsPath, .primitivesPath][]
    | select(. != null) | (if type == "array" then .[] else . end)
    | (if type == "object" then .path else . end) | select(type == "string")' \
    "$root/.rafters/config.rafters.json" 2>/dev/null)
  if [ -z "$dirs" ]; then
    case "$file" in
      */components/ui/*|*/lib/primitives/*) return 0 ;;
    esac
    return 1
  fi
  while IFS= read -r dir; do
    dir="${dir#./}"
    dir="${dir%/}"
    [ -n "$dir" ] || continue
    case "$dir" in /*) ;; *) dir="$root/$dir" ;; esac
    case "$file" in "$dir"/*) return 0 ;; esac
  done <<< "$dirs"
  return 1
}
