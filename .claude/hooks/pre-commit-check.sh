#!/bin/bash
# MadeBuy-specific pre-commit check - quick lint only
# Event: PreToolUse, Matcher: Bash

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git commit commands
if ! echo "$COMMAND" | grep -qE "git commit"; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Skip with --no-verify or [skip-hooks]
if echo "$COMMAND" | grep -qE "\-\-no-verify|\[skip-hooks\]"; then
  echo '{"decision": "allow"}'
  exit 0
fi

WORKDIR="$HOME/claude-project/madebuy"

# Quick lint check
echo "Running lint..." >&2
LINT_OUTPUT=$(cd "$WORKDIR" && timeout 30 pnpm lint 2>&1)
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ] && [ $LINT_EXIT -ne 124 ]; then
  echo '{"decision": "block", "reason": "Lint errors found. Run: Act as code-fixer and fix all errors"}'
  exit 0
fi

echo '{"decision": "allow"}'
