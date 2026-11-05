#!/bin/bash
# Rafters PreToolUse hook for Edit|Write
# Enforces: classy (not cn/twMerge), no arbitrary Tailwind, Container/Grid layout,
# no raw spacing, no wrapper divs, no var() in components, installed files read-only

LIB="$(dirname "${BASH_SOURCE[0]}")/lib.sh"
if ! source "$LIB" || ! declare -F find_rafters_root >/dev/null; then
  echo "rafters pre-edit hook: cannot load $LIB -- enforcement skipped" >&2
  exit 1
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only enforce in projects that actually use rafters. If the edited file
# isn't inside a rafters project, exit silently so non-rafters sites aren't
# blocked. (Empty FILE_PATH falls through to the registry checks below.)
PROJECT_ROOT=""
if [ -n "$FILE_PATH" ]; then
  PROJECT_ROOT=$(find_rafters_root "$(dirname "$FILE_PATH")") || exit 0
fi

# INSTALLED FILES ARE READ-ONLY
# Every file `rafters add` installed, under the project's componentsPath and
# primitivesPath, must never be edited in consumer sites. Fix your consuming
# code, or file a bug upstream on rafters.
REGISTRY_VIOLATION=""
case "$FILE_PATH" in
  # The rafters source repo: packages/ui/src is the source, not a consumer install.
  */packages/ui/src/*|*/packages/cli/src/*|*/apps/registry/*) ;;
  *)
    if [ -n "$PROJECT_ROOT" ] && is_installed_path "$PROJECT_ROOT" "$FILE_PATH"; then
      REGISTRY_VIOLATION="INSTALLED FILES ARE READ-ONLY: $(basename "$FILE_PATH") is installed by rafters. Do not edit. Fix your consuming code or file a bug upstream on rafters."
    fi ;;
esac

if [ -n "$REGISTRY_VIOLATION" ]; then
  jq -n --arg reason "$REGISTRY_VIOLATION" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "deny",
      "permissionDecisionReason": $reason
    }
  }'
  exit 0
fi

# Only enforce remaining rules on TS/TSX/Astro files in enforced paths
case "$FILE_PATH" in
  *.tsx|*.ts|*.astro) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  *packages/ui/*|*apps/*|*packages/cli/src/mcp/*|*sites/*|*src/pages/*|*src/app/*|*src/routes/*|*src/components/*|*src/layouts/*) ;;
  *) exit 0 ;;
esac

# Skip test files
case "$FILE_PATH" in
  *.test.*|*.spec.*|*.a11y.*|*.e2e.*) exit 0 ;;
esac

# CONTEXT: authoring vs assembly.
#
# Custom component authoring lives in `src/components/` (excluding the
# rafters-owned `components/ui/` subtree, read-only and guarded above). When authoring, consumers DO need to write class
# strings, DO use classy() for conditional merging, and DO reference
# semantic tokens via Tailwind utilities (bg-primary etc.) -- that is
# how custom components hook into the rafters token system.
#
# Assembly (pages, layouts, app code, routes) is the opposite: zero
# class authoring, pure composition of pre-made composites and
# components. The visual-utility deny rules below apply there.
#
# Hard rules (no var(--rafters-), no arbitrary values, no cn()/twMerge,
# no className on rafters components, no wrapper divs) apply in BOTH contexts
# and are checked unconditionally. Raw <h1>/<p>/<span> with classes is an
# assembly rule: an own component is where they are written.
IS_AUTHORING=0
case "$FILE_PATH" in
  */src/components/ui/*) ;;  # rafters-installed, already gated above
  */src/components/*) IS_AUTHORING=1 ;;
esac

# SOURCE context: the rafters design-system monorepo itself. Building the
# typography components means writing raw <h1>/<p> with token classes --
# that IS the product. The raw-HTML rule below is a consumer rule only.
IS_SOURCE=0
case "$FILE_PATH" in
  */packages/ui/src/*) IS_SOURCE=1 ;;
esac

# Get the content being written
if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

VIOLATIONS=""
# One violation per line, each a real newline: head -5 below keeps five reasons.
violate() { VIOLATIONS+="$1"$'\n'; }

# CLASSY IS THE LAW
if echo "$CONTENT" | grep -qE '\bcn\('; then
  violate "CLASSY IS THE LAW: Found cn(). Use classy() instead."
fi
if echo "$CONTENT" | grep -qE '\btwMerge\('; then
  violate "CLASSY IS THE LAW: Found twMerge(). Use classy() instead."
fi

# No arbitrary Tailwind values (className for React, class for Astro)
if echo "$CONTENT" | grep -qE '(className|class|classy).*\w-\[[0-9]+px\]'; then
  violate "NO ARBITRARY VALUES: Found arbitrary pixel value. Use design tokens."
fi
if echo "$CONTENT" | grep -qE '(className|class|classy).*(bg|text|border)-\[#'; then
  violate "NO ARBITRARY VALUES: Found arbitrary color. Use semantic tokens (bg-primary, text-foreground, etc)."
fi

# Class-bearing contexts: `class=` / `className=` attributes (string OR JSX
# expression), `classy(...)` calls, and template literals assigned to a
# class-bearing destination. Catching strings in any of these contexts
# without overfitting on a specific attribute syntax.

# The utility rules below read only what is class-bearing: the quoted string or
# braces after class= / className=, and the arguments of classy(...). Prose in a
# tag's text, such as <a class="hs-link">the grid</a>, is not a class. A utility
# is a whole class name, so hs-grid and inline-flex are judged as the names
# they are: a name must not start inside another name.
CLASS_TEXT=$(printf '%s' "$CONTENT" | tr '\n' ' ' \
  | grep -oE "(class|className)=(\"[^\"]*\"|'[^']*'|\{[^}]*\})|classy\([^)]*\)")
class_has() { printf '%s' "$CLASS_TEXT" | grep -qE "(^|[^A-Za-z0-9_-])$1"; }

# Visual-utility rules apply only in ASSEMBLY context. Authoring custom
# components in src/components/ needs to reference these utilities --
# that's how a custom component hooks into the rafters token system.
if [ "$IS_AUTHORING" != "1" ]; then
  # LAYOUT IS SOLVED - Container and Grid handle layout
  if class_has '(flex|grid|inline-flex|inline-grid|items-(start|center|end|baseline|stretch)|justify-(start|center|end|between|around|evenly)|gap-[0-9])\b'; then
    violate "LAYOUT IS SOLVED: Found raw layout utility (flex/grid/items-/justify-/gap-). Use Container/Grid components."
  fi

  # CONTAINER OWNS SPACING
  if class_has '-?(p-[0-9]|px-[0-9]|py-[0-9]|m-[0-9]|mx-[0-9]|my-[0-9]|mt-[0-9]|mb-[0-9]|ml-[0-9]|mr-[0-9]|pt-[0-9]|pb-[0-9]|pl-[0-9]|pr-[0-9])\b'; then
    violate "CONTAINER OWNS SPACING: Found direct spacing utility in a class-bearing context. Container handles spacing."
  fi

  # THE SYSTEM OWNS SEMANTIC COLOR
  # In assembly: bg-primary / text-destructive / border-success means the
  # agent is picking a visual hierarchy choice. That belongs to the
  # composite (block.meta.variant) or component (variant prop, dictated
  # by JSDoc), never to consumer-side className.
  if class_has '(bg|text|border)-(primary|secondary|tertiary|accent|highlight|destructive|success|warning|info|muted|foreground|background|card|popover|sidebar|chart-[0-9]|ring|input)\b'; then
    violate "THE SYSTEM OWNS VISUAL VALUES: Found semantic color utility (bg-primary / text-destructive / etc.) in a class-bearing context. The composite manifest (block.meta.variant) or component (variant prop per JSDoc) owns variant choice -- never consumer className/classy(). Query rafters_describe to find the right variant. (If you are authoring a custom component, put it in src/components/ where these utilities are allowed.)"
  fi

  # THE SYSTEM OWNS TYPOGRAPHY SIZE + WEIGHT
  if class_has '(text-(xs|sm|base|lg|xl|[0-9]+xl)|font-(thin|light|normal|medium|semibold|bold|extrabold|black))\b'; then
    violate "THE SYSTEM OWNS TYPOGRAPHY: Found text-* size or font-weight-* utility. Wrap content in <Container as=\"article\"> and use bare native HTML, or render the composite the manifest specifies."
  fi

  # THE SYSTEM OWNS RADIUS / SHADOW / SIZING
  if class_has '(rounded-|shadow-|w-[0-9]|h-[0-9]|max-w-|min-w-|max-h-|min-h-)'; then
    violate "THE SYSTEM OWNS RADIUS / SHADOW / SIZING: Found rounded-/shadow-/w-/h-/max-/min- utility. These are component-owned design choices."
  fi
fi

# NEVER var() IN COMPONENTS - exporter handles var()
if echo "$CONTENT" | grep -qE 'var\(--rafters' ; then
  violate "NEVER var() IN COMPONENTS: Found var(--rafters-...). The exporter wires the CSS variables; consumers never reference them directly."
fi

# COMPONENTS ARE COMPLETE - no wrapper divs
if echo "$CONTENT" | grep -qE '<div className="[^"]*">\s*<(Button|Input|Card|Select|Dialog)'; then
  violate "COMPONENTS ARE COMPLETE: Found wrapper div around a Rafters component. Components include their own spacing/sizing."
fi

# TOKEN PROPS, NOT CLASSES - Rafters components use token props for overrides
# class/className on a Rafters component bypasses the design intelligence layer
RAFTERS_COMPONENTS='H1|H2|H3|H4|H5|H6|Typography|Button|Card|CardHeader|CardTitle|CardDescription|CardContent|CardFooter|CardAction|Container|Grid|GridItem|Badge|Input|Label|Separator|Alert|AlertTitle|AlertDescription|Empty|EmptyIcon|EmptyTitle|EmptyDescription|EmptyAction|Breadcrumb|Tabs|TabsList|TabsTrigger|TabsContent|Table|Pagination|Spinner|Skeleton|Avatar|Image|Kbd|Tooltip|Progress|Field'
if echo "$CONTENT" | grep -qE "<(${RAFTERS_COMPONENTS})\b[^>]*\b(class=|className=)"; then
  violate "TOKEN PROPS, NOT CLASSES: Do not pass class/className to Rafters components. Use token props (size, weight, color, variant, etc.) for overrides. The component owns its classes."
fi

# RAW HTML ELEMENTS -- use Rafters typography components. An assembly rule:
# exempt in SOURCE context (the design system builds these elements) and in an
# own component, where the class strings are yours to write.
if [ "$IS_SOURCE" != "1" ] && [ "$IS_AUTHORING" != "1" ] && echo "$CONTENT" | grep -qE '<(h[1-6]|p|span)\b[^>]*(class=|className=)'; then
  violate "USE TYPOGRAPHY COMPONENTS: Found raw <h1>/<p>/<span> with classes. Use H1, H2, P, Small, Code typography components with token props instead."
fi

# THE CHECK: veneer's rafters-check, when the project has it, on the file as it
# would be after the edit. It adds to the rules above and replaces none of them:
# it reports brackets, fill, surface and type errors. An error denies only on a line the
# edit changes, so an unrelated edit, or a fix of one finding out of two, goes
# through. Every line of a Write counts as changed.
CHECK_ERRORS=""
CHECK_NOTE=""
case "$FILE_PATH" in
  *.tsx|*.astro|*.classes.ts) CHECK_BIN=$(find_check_bin "$PROJECT_ROOT") ;;
  *) CHECK_BIN="" ;;
esac

if [ -n "$CHECK_BIN" ]; then
  CHECK_APPLIES=1
  CHANGED_RANGES=""
  if [ "$TOOL_NAME" = "Write" ]; then
    PROPOSED="$CONTENT"
  else
    # No file on disk, or old_string not in it: the Edit itself will fail, so
    # there is no after to check.
    PROPOSED=$(printf '%s' "$INPUT" | jq -r --rawfile disk "$FILE_PATH" '
      (.tool_input.old_string // "") as $old | (.tool_input.new_string // "") as $new
      | if $old == "" then error("no old_string") else . end
      | ($disk | split($old)) as $parts
      | if ($parts | length) < 2 then error("old_string not found")
        elif .tool_input.replace_all == true then $parts | join($new)
        else $parts[0] + $new + ($parts[1:] | join($old))
        end' 2>/dev/null) || CHECK_APPLIES=0
    if [ "$CHECK_APPLIES" = "1" ]; then
      # Normal diff output names the new file's lines after an a or c: 3c3, 5,6c5,7, 8a9,10.
      CHANGED_RANGES=$(diff <(printf '%s\n' "$(cat "$FILE_PATH")") <(printf '%s\n' "$PROPOSED") \
        | sed -nE 's/^[0-9,]+[ac]([0-9,]+)$/\1/p')
    fi
  fi

  if [ "$CHECK_APPLIES" = "1" ]; then
    # stderr joins stdout for the could-not-run reason; only report lines are read from it.
    CHECK_OUTPUT=$(printf '%s' "$PROPOSED" | "$CHECK_BIN" "$PROJECT_ROOT" --stdin "$FILE_PATH" 2>&1)
    CHECK_EXIT=$?
    case "$CHECK_EXIT" in
      0) ;;
      1)
        # file:line:column severity code message
        REPORT_LINE='^[^[:space:]:][^:]*:([0-9]+):[0-9]+ error [^ ]+ '
        # A finding's cause follows it on indented lines (a type error's "Property
        # 'id' is missing"); they stay with it. The "help:" line and the summary do not.
        KEEPING=0
        while IFS= read -r LINE; do
          if [[ "$LINE" =~ $REPORT_LINE ]]; then
            FINDING_LINE="${BASH_REMATCH[1]}"
            KEEPING=0
            [ "$TOOL_NAME" = "Write" ] && KEEPING=1
            for RANGE in $CHANGED_RANGES; do
              if [ "$FINDING_LINE" -ge "${RANGE%,*}" ] && [ "$FINDING_LINE" -le "${RANGE#*,}" ]; then
                KEEPING=1
              fi
            done
            [ "$KEEPING" = "1" ] && CHECK_ERRORS+="$LINE"$'\n'
          elif [[ "$LINE" == "  "* && "$LINE" != "  help:"* ]]; then
            [ "$KEEPING" = "1" ] && CHECK_ERRORS+="$LINE"$'\n'
          else
            KEEPING=0
          fi
        done <<< "$CHECK_OUTPUT"
        ;;
      *)
        CHECK_NOTE="rafters-check could not run (exit $CHECK_EXIT), so the design check did not judge this edit: $CHECK_OUTPUT"
        ;;
    esac
  fi
fi

if [ -z "$VIOLATIONS" ] && [ -z "$CHECK_ERRORS" ]; then
  # A check that could not run does not decide: no permissionDecision, so the
  # edit goes through the normal permission flow. additionalContext reaches the agent.
  if [ -n "$CHECK_NOTE" ]; then
    jq -n --arg note "$CHECK_NOTE" '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": $note
      }
    }'
  fi
  exit 0
fi

REASON=$([ -n "$VIOLATIONS" ] && printf '%s' "$VIOLATIONS" | head -5; printf '%s' "$CHECK_ERRORS$CHECK_NOTE")
jq -n --arg reason "$REASON" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $reason
  }
}'

exit 0
