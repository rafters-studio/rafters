#!/bin/bash
# Rafters PreToolUse hook for Edit|Write
# Enforces: classy (not cn/twMerge), no arbitrary Tailwind, Container/Grid layout,
# no raw spacing, no wrapper divs, no var() in components

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# REGISTRY FILES ARE READ-ONLY
# Files installed by `rafters add` must never be edited in consumer sites.
# Fix your consuming code, or file a bug upstream on rafters.
REGISTRY_VIOLATION=""
case "$FILE_PATH" in
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

# Only enforce remaining rules on TS/TSX files in enforced paths
case "$FILE_PATH" in
  *.tsx|*.ts) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  *packages/ui/*|*apps/*|*packages/cli/src/mcp/*) ;;
  *) exit 0 ;;
esac

# Skip test files
case "$FILE_PATH" in
  *.test.*|*.spec.*|*.a11y.*|*.e2e.*) exit 0 ;;
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

# No arbitrary Tailwind values
if echo "$CONTENT" | grep -qE '(className|classy).*\w-\[[0-9]+px\]'; then
  VIOLATIONS+="NO ARBITRARY VALUES: Found arbitrary pixel value. Use design tokens.\n"
fi
if echo "$CONTENT" | grep -qE '(className|classy).*(bg|text|border)-\[#'; then
  VIOLATIONS+="NO ARBITRARY VALUES: Found arbitrary color. Use semantic tokens (bg-primary, text-foreground, etc).\n"
fi

# LAYOUT IS SOLVED - Container and Grid handle layout
if echo "$CONTENT" | grep -qE 'className="[^"]*\b(flex|grid|items-|justify-|gap-)[^"]*"'; then
  VIOLATIONS+="LAYOUT IS SOLVED: Found raw layout utility. Use Container/Grid components.\n"
fi

# CONTAINER OWNS SPACING
if echo "$CONTENT" | grep -qE 'className="[^"]*\b(p-[0-9]|px-[0-9]|py-[0-9]|m-[0-9]|mx-[0-9]|my-[0-9]|mt-|mb-|ml-|mr-|pt-|pb-|pl-|pr-)[^"]*"'; then
  VIOLATIONS+="CONTAINER OWNS SPACING: Found direct spacing in className. Container handles spacing.\n"
fi

# NEVER var() IN COMPONENTS - exporter handles var()
if echo "$CONTENT" | grep -qE 'var\(--rafters' ; then
  VIOLATIONS+="NEVER var() IN COMPONENTS: Found var(--rafters-...). Use Tailwind utilities. The exporter handles var().\n"
fi

# COMPONENTS ARE COMPLETE - no wrapper divs
if echo "$CONTENT" | grep -qE '<div className="[^"]*">\s*<(Button|Input|Card|Select|Dialog)'; then
  VIOLATIONS+="COMPONENTS ARE COMPLETE: Found wrapper div around a Rafters component. Components include their own spacing/sizing.\n"
fi

if [ -z "$VIOLATIONS" ]; then
  exit 0
fi

REASON=$(printf "$VIOLATIONS" | head -5)
jq -n --arg reason "$REASON" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $reason
  }
}'

exit 0
