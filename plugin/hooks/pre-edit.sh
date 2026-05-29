#!/bin/bash
# Rafters PreToolUse hook for Edit|Write
# Enforces: classy (not cn/twMerge), no arbitrary Tailwind, Container/Grid layout,
# no raw spacing, no wrapper divs, no var() in components

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only enforce in projects that actually use rafters. Walk up from the
# file's directory looking for .rafters/config.rafters.json (the marker
# the CLI's discoverProjectRoot uses). If absent, this isn't a rafters
# project -- exit silently so non-rafters sites aren't blocked.
if [ -n "$FILE_PATH" ]; then
  dir=$(dirname "$FILE_PATH")
  found=""
  while [ -n "$dir" ] && [ "$dir" != "/" ]; do
    if [ -f "$dir/.rafters/config.rafters.json" ]; then
      found="1"
      break
    fi
    parent=$(dirname "$dir")
    if [ "$parent" = "$dir" ]; then
      break
    fi
    dir="$parent"
  done
  if [ -z "$found" ]; then
    exit 0
  fi
fi

# REGISTRY FILES ARE READ-ONLY
# Files installed by `rafters add` must never be edited in consumer sites.
# Fix your consuming code, or file a bug upstream on rafters.
REGISTRY_VIOLATION=""
# Skip registry guard in the rafters source repo (packages/ui/src is the source, not a consumer install)
case "$FILE_PATH" in
  */packages/ui/src/*|*/packages/cli/src/*|*/apps/registry/*) ;;
  */lib/primitives/*)
    REGISTRY_VIOLATION="REGISTRY FILES ARE READ-ONLY: $(basename "$FILE_PATH") in lib/primitives/ is installed by rafters. Do not edit. Fix your consuming code or file a bug upstream on rafters." ;;
  */components/ui/*.classes.ts)
    REGISTRY_VIOLATION="REGISTRY FILES ARE READ-ONLY: $(basename "$FILE_PATH") is installed by rafters. Do not edit. Fix your consuming code or file a bug upstream on rafters." ;;
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
# rafters-owned `components/ui/` subtree, which is read-only and already
# guarded above). When authoring, consumers DO need to write class
# strings, DO use classy() for conditional merging, and DO reference
# semantic tokens via Tailwind utilities (bg-primary etc.) -- that is
# how custom components hook into the rafters token system.
#
# Assembly (pages, layouts, app code, routes) is the opposite: zero
# class authoring, pure composition of pre-made composites and
# components. The visual-utility deny rules below apply there.
#
# Hard rules (no var(--rafters-), no arbitrary values, no cn()/twMerge,
# no className on rafters components, no wrapper divs, no raw <h1>/<p>
# with classes) apply in BOTH contexts and are checked unconditionally.
IS_AUTHORING=0
case "$FILE_PATH" in
  */src/components/ui/*) ;;  # rafters-installed, already gated above
  */src/components/*) IS_AUTHORING=1 ;;
esac

# Get the content being written
if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

[ -z "$CONTENT" ] && exit 0

VIOLATIONS=""

# CLASSY IS THE LAW
if echo "$CONTENT" | grep -qE '\bcn\('; then
  VIOLATIONS+="CLASSY IS THE LAW: Found cn(). Use classy() instead.\n"
fi
if echo "$CONTENT" | grep -qE '\btwMerge\('; then
  VIOLATIONS+="CLASSY IS THE LAW: Found twMerge(). Use classy() instead.\n"
fi

# No arbitrary Tailwind values (className for React, class for Astro)
if echo "$CONTENT" | grep -qE '(className|class|classy).*\w-\[[0-9]+px\]'; then
  VIOLATIONS+="NO ARBITRARY VALUES: Found arbitrary pixel value. Use design tokens.\n"
fi
if echo "$CONTENT" | grep -qE '(className|class|classy).*(bg|text|border)-\[#'; then
  VIOLATIONS+="NO ARBITRARY VALUES: Found arbitrary color. Use semantic tokens (bg-primary, text-foreground, etc).\n"
fi

# Class-bearing contexts: `class=` / `className=` attributes (string OR JSX
# expression), `classy(...)` calls, and template literals assigned to a
# class-bearing destination. Catching strings in any of these contexts
# without overfitting on a specific attribute syntax.

# Visual-utility rules apply only in ASSEMBLY context. Authoring custom
# components in src/components/ needs to reference these utilities --
# that's how a custom component hooks into the rafters token system.
if [ "$IS_AUTHORING" != "1" ]; then
  # LAYOUT IS SOLVED - Container and Grid handle layout
  if echo "$CONTENT" | grep -qE '(className|class)=|classy\(' && echo "$CONTENT" | grep -qE '\b(flex|grid|items-(start|center|end|baseline|stretch)|justify-(start|center|end|between|around|evenly)|gap-[0-9])\b'; then
    VIOLATIONS+="LAYOUT IS SOLVED: Found raw layout utility (flex/grid/items-/justify-/gap-). Use Container/Grid components.\n"
  fi

  # CONTAINER OWNS SPACING
  if echo "$CONTENT" | grep -qE '(className|class)=|classy\(' && echo "$CONTENT" | grep -qE '\b(p-[0-9]|px-[0-9]|py-[0-9]|m-[0-9]|mx-[0-9]|my-[0-9]|mt-[0-9]|mb-[0-9]|ml-[0-9]|mr-[0-9]|pt-[0-9]|pb-[0-9]|pl-[0-9]|pr-[0-9])\b'; then
    VIOLATIONS+="CONTAINER OWNS SPACING: Found direct spacing utility in a class-bearing context. Container handles spacing.\n"
  fi

  # THE SYSTEM OWNS SEMANTIC COLOR
  # In assembly: bg-primary / text-destructive / border-success means the
  # agent is picking a visual hierarchy choice. That belongs to the
  # composite (block.meta.variant) or component (variant prop, dictated
  # by JSDoc), never to consumer-side className.
  if echo "$CONTENT" | grep -qE '(className|class)=|classy\(' && echo "$CONTENT" | grep -qE '\b(bg|text|border)-(primary|secondary|tertiary|accent|highlight|destructive|success|warning|info|muted|foreground|background|card|popover|sidebar|chart-[0-9]|ring|input)\b'; then
    VIOLATIONS+="THE SYSTEM OWNS VISUAL VALUES: Found semantic color utility (bg-primary / text-destructive / etc.) in a class-bearing context. The composite manifest (block.meta.variant) or component (variant prop per JSDoc) owns variant choice -- never consumer className/classy(). Query rafters_pattern / rafters_composite / rafters_component. (If you are authoring a custom component, put it in src/components/ where these utilities are allowed.)\n"
  fi

  # THE SYSTEM OWNS TYPOGRAPHY SIZE + WEIGHT
  if echo "$CONTENT" | grep -qE '(className|class)=|classy\(' && echo "$CONTENT" | grep -qE '\b(text-(xs|sm|base|lg|xl|[0-9]+xl)|font-(thin|light|normal|medium|semibold|bold|extrabold|black))\b'; then
    VIOLATIONS+="THE SYSTEM OWNS TYPOGRAPHY: Found text-* size or font-weight-* utility. Wrap content in <Container as=\"article\"> and use bare native HTML, or render the composite the manifest specifies.\n"
  fi

  # THE SYSTEM OWNS RADIUS / SHADOW / SIZING
  if echo "$CONTENT" | grep -qE '(className|class)=|classy\(' && echo "$CONTENT" | grep -qE '\b(rounded-|shadow-|w-[0-9]|h-[0-9]|max-w-|min-w-|max-h-|min-h-)'; then
    VIOLATIONS+="THE SYSTEM OWNS RADIUS / SHADOW / SIZING: Found rounded-/shadow-/w-/h-/max-/min- utility. These are component-owned design choices.\n"
  fi
fi

# NEVER var() IN COMPONENTS - exporter handles var()
if echo "$CONTENT" | grep -qE 'var\(--rafters' ; then
  VIOLATIONS+="NEVER var() IN COMPONENTS: Found var(--rafters-...). The exporter wires the CSS variables; consumers never reference them directly.\n"
fi

# COMPONENTS ARE COMPLETE - no wrapper divs
if echo "$CONTENT" | grep -qE '<div className="[^"]*">\s*<(Button|Input|Card|Select|Dialog)'; then
  VIOLATIONS+="COMPONENTS ARE COMPLETE: Found wrapper div around a Rafters component. Components include their own spacing/sizing.\n"
fi

# TOKEN PROPS, NOT CLASSES - Rafters components use token props for overrides
# class/className on a Rafters component bypasses the design intelligence layer
RAFTERS_COMPONENTS='H1|H2|H3|H4|H5|H6|Typography|Button|Card|CardHeader|CardTitle|CardDescription|CardContent|CardFooter|CardAction|Container|Grid|GridItem|Badge|Input|Label|Separator|Alert|AlertTitle|AlertDescription|Empty|EmptyIcon|EmptyTitle|EmptyDescription|EmptyAction|Breadcrumb|Tabs|TabsList|TabsTrigger|TabsContent|Table|Pagination|Spinner|Skeleton|Avatar|Image|Kbd|Tooltip|Progress|Field'
if echo "$CONTENT" | grep -qE "<(${RAFTERS_COMPONENTS})\b[^>]*\b(class=|className=)"; then
  VIOLATIONS+="TOKEN PROPS, NOT CLASSES: Do not pass class/className to Rafters components. Use token props (size, weight, color, variant, etc.) for overrides. The component owns its classes.\n"
fi

# RAW HTML ELEMENTS -- use Rafters typography components
if echo "$CONTENT" | grep -qE '<(h[1-6]|p|span)\b[^>]*(class=|className=)'; then
  VIOLATIONS+="USE TYPOGRAPHY COMPONENTS: Found raw <h1>/<p>/<span> with classes. Use H1, H2, P, Small, Code typography components with token props instead.\n"
fi

if [ -z "$VIOLATIONS" ]; then
  exit 0
fi

REASON=$(printf '%s' "$VIOLATIONS" | head -5)
jq -n --arg reason "$REASON" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $reason
  }
}'

exit 0
