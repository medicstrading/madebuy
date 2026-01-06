#!/bin/bash
# MadeBuy-specific pre-push check - monorepo aware
# Event: PreToolUse, Matcher: Bash

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git push commands
if ! echo "$COMMAND" | grep -qE "git push"; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Skip with --no-verify
if echo "$COMMAND" | grep -qE "\-\-no-verify"; then
  echo '{"decision": "allow"}'
  exit 0
fi

WORKDIR="$HOME/claude-project/madebuy"

# Check TypeScript for admin app
echo "Checking admin TypeScript..." >&2
TSC_ADMIN=$(cd "$WORKDIR" && timeout 60 pnpm --filter admin tsc --noEmit 2>&1)
if [ $? -ne 0 ] && [ $? -ne 124 ]; then
  ERROR_COUNT=$(echo "$TSC_ADMIN" | grep -c "error TS" || echo "?")
  echo "{\"decision\": \"block\", \"reason\": \"TypeScript errors in admin ($ERROR_COUNT). Run: Act as code-fixer and fix all errors\"}"
  exit 0
fi

# Check TypeScript for web app
echo "Checking web TypeScript..." >&2
TSC_WEB=$(cd "$WORKDIR" && timeout 60 pnpm --filter web tsc --noEmit 2>&1)
if [ $? -ne 0 ] && [ $? -ne 124 ]; then
  ERROR_COUNT=$(echo "$TSC_WEB" | grep -c "error TS" || echo "?")
  echo "{\"decision\": \"block\", \"reason\": \"TypeScript errors in web ($ERROR_COUNT). Run: Act as code-fixer and fix all errors\"}"
  exit 0
fi

echo '{"decision": "allow"}'
