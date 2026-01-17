#!/bin/bash
# Script to fix a11y/useKeyWithClickEvents violations in madebuy codebase

cd /home/aaron/claude-project/madebuy

# Run biome and capture output
echo "Running biome check to find violations..."
npx @biomejs/biome check --only=a11y/useKeyWithClickEvents . 2>&1 | tee /tmp/biome-violations.txt

echo ""
echo "Total violations found:"
grep -c "useKeyWithClickEvents" /tmp/biome-violations.txt || echo "0"

echo ""
echo "Files with violations:"
grep -E "\.tsx?:" /tmp/biome-violations.txt | cut -d: -f1 | sort -u | tee /tmp/files-to-fix.txt
