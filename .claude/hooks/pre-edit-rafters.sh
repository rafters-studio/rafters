#!/bin/bash
# pre-edit-rafters.sh
# PreToolUse hook for Edit|Write - enforces Rafters preamble rules
# Only checks .tsx/.ts files in packages/ui, apps/, packages/cli/src/mcp

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only enforce on relevant source files
case "$FILE_PATH" in
  *.tsx|*.ts) ;;
  *) exit 0 ;; # not a TS/TSX file, skip
esac

case "$FILE_PATH" in
  *packages/ui/*|*apps/*|*packages/cli/src/mcp/*) ;;
  *) exit 0 ;; # not in enforced paths, skip
esac

# Skip test files - they may legitimately test these patterns
case "$FILE_PATH" in
  *.test.*|*.spec.*|*.a11y.*) exit 0 ;;
esac

# Get the content being written
if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

# No content to check
[ -z "$CONTENT" ] && exit 0

VIOLATIONS=""

# CLASSY IS THE LAW - no cn(), twMerge(), or raw clsx()
if echo "$CONTENT" | grep -qE '\bcn\('; then
  VIOLATIONS+="CLASSY IS THE LAW: Found cn(). Use classy() instead.\n"
fi
if echo "$CONTENT" | grep -qE '\btwMerge\('; then
  VIOLATIONS+="CLASSY IS THE LAW: Found twMerge(). Use classy() instead.\n"
fi

# CLASSY IS THE LAW - no arbitrary Tailwind values
if echo "$CONTENT" | grep -qE '(className|classy).*\w-\[[0-9]+px\]'; then
  VIOLATIONS+="CLASSY IS THE LAW: Found arbitrary pixel value (w-[Xpx], h-[Xpx], etc). Use design tokens.\n"
fi
if echo "$CONTENT" | grep -qE '(className|classy).*bg-\[#'; then
  VIOLATIONS+="CLASSY IS THE LAW: Found arbitrary color (bg-[#...]). Use design tokens.\n"
fi
if echo "$CONTENT" | grep -qE '(className|classy).*text-\[#'; then
  VIOLATIONS+="CLASSY IS THE LAW: Found arbitrary color (text-[#...]). Use design tokens.\n"
fi

# LAYOUT IS SOLVED - no raw Tailwind layout utilities in className
# Match className="..." or classy(...) containing flex, grid, items-, justify-, gap-
if echo "$CONTENT" | grep -qE 'className="[^"]*\b(flex|grid|items-|justify-|gap-)[^"]*"'; then
  VIOLATIONS+="LAYOUT IS SOLVED: Found raw Tailwind layout utility in className. Use Container/Grid components.\n"
fi

# LAYOUT IS SOLVED - no direct margin/padding in className
if echo "$CONTENT" | grep -qE 'className="[^"]*\b(p-[0-9]|px-[0-9]|py-[0-9]|m-[0-9]|mx-[0-9]|my-[0-9]|mt-|mb-|ml-|mr-|pt-|pb-|pl-|pr-)[^"]*"'; then
  VIOLATIONS+="CONTAINER OWNS SPACING: Found direct spacing in className. Container handles spacing.\n"
fi

# COMPONENTS ARE COMPLETE - no wrapper divs with just className around components
# This is hard to detect perfectly, so we check for the most common anti-pattern
if echo "$CONTENT" | grep -qE '<div className="[^"]*">\s*<(Button|Input|Card|Select|Dialog)'; then
  VIOLATIONS+="COMPONENTS ARE COMPLETE: Found wrapper div around a Rafters component. Components include their own spacing/sizing.\n"
fi

# No violations found
if [ -z "$VIOLATIONS" ]; then
  exit 0
fi

# Block the edit with violation details
REASON=$(printf "$VIOLATIONS" | head -5)
jq -n --arg reason "$REASON" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $reason
  }
}'

exit 0
