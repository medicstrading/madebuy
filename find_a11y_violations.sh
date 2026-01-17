#!/bin/bash
# Find all a11y/useKeyWithClickEvents violations
# This script searches for divs, spans, and other non-interactive elements with onClick

echo "=== Searching for onClick violations ==="
echo ""

# Search for divs with onClick (excluding buttons and links)
echo "--- DIV elements with onClick ---"
find apps -name "*.tsx" -type f -exec grep -Hn "<div.*onClick=" {} \; 2>/dev/null | grep -v "onKeyDown=" | head -20

echo ""
echo "--- SPAN elements with onClick ---"
find apps -name "*.tsx" -type f -exec grep -Hn "<span.*onClick=" {} \; 2>/dev/null | grep -v "onKeyDown=" | head -20

echo ""
echo "--- LI elements with onClick ---"
find apps -name "*.tsx" -type f -exec grep -Hn "<li.*onClick=" {} \; 2>/dev/null | grep -v "onKeyDown=" | head -20

echo ""
echo "=== Summary ==="
div_count=$(find apps -name "*.tsx" -type f -exec grep -H "<div.*onClick=" {} \; 2>/dev/null | grep -v "onKeyDown=" | wc -l)
span_count=$(find apps -name "*.tsx" -type f -exec grep -H "<span.*onClick=" {} \; 2>/dev/null | grep -v "onKeyDown=" | wc -l)
li_count=$(find apps -name "*.tsx" -type f -exec grep -H "<li.*onClick=" {} \; 2>/dev/null | grep -v "onKeyDown=" | wc -l)

echo "Total DIV violations: $div_count"
echo "Total SPAN violations: $span_count"
echo "Total LI violations: $li_count"
echo "TOTAL: $((div_count + span_count + li_count))"
