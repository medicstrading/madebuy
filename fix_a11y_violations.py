#!/usr/bin/env python3
"""
Fix biome a11y/useKeyWithClickEvents violations in TypeScript/React files.
Adds keyboard support to clickable non-button elements.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

def find_tsx_files(root_dir: Path) -> List[Path]:
    """Find all .tsx and .ts files in the project."""
    files = []
    for pattern in ['**/*.tsx', '**/*.ts']:
        files.extend(root_dir.glob(pattern))

    # Exclude node_modules, .next, dist
    return [f for f in files if 'node_modules' not in str(f) and '.next' not in str(f) and 'dist' not in str(f)]

def has_onclick_without_keyboard(content: str) -> bool:
    """Check if content has onClick handlers without keyboard support."""
    # Look for onClick= without onKeyDown= on the same element
    lines = content.split('\n')

    for i, line in enumerate(lines):
        if 'onClick=' in line:
            # Check if this is a button or anchor tag (which are OK)
            # Look backwards for the opening tag
            tag_start = None
            for j in range(i, max(0, i-10), -1):
                if '<button' in lines[j] or '<a ' in lines[j] or '<a>' in lines[j]:
                    tag_start = 'button_or_link'
                    break
                if '<div' in lines[j] or '<span' in lines[j] or '<li' in lines[j] or '<td' in lines[j] or '<tr' in lines[j]:
                    tag_start = 'needs_fix'
                    break

            if tag_start == 'needs_fix':
                # Check if onKeyDown is nearby
                has_keyboard = False
                for j in range(max(0, i-5), min(len(lines), i+5)):
                    if 'onKeyDown=' in lines[j] or 'onKeyPress=' in lines[j]:
                        has_keyboard = True
                        break

                if not has_keyboard:
                    return True

    return False

def fix_onclick_violations(content: str) -> str:
    """Fix onClick violations by adding keyboard support."""
    lines = content.split('\n')
    result = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Check if this line has onClick
        if 'onClick=' in line and 'onKeyDown=' not in line:
            # Check if this is a div, span, li, td, tr, or other non-interactive element
            is_non_interactive = False
            tag_indent = ''

            # Look backwards to find the tag
            for j in range(i, max(0, i-10), -1):
                if re.search(r'<(div|span|li|td|tr|th|p|section|article|main|nav|header|footer)', lines[j]):
                    is_non_interactive = True
                    # Get indentation
                    match = re.match(r'^(\s*)', lines[j])
                    if match:
                        tag_indent = match.group(1)
                    break
                if re.search(r'<(button|a)\b', lines[j]):
                    # It's already a button or link, skip
                    break

            if is_non_interactive:
                # Extract the onClick handler
                onclick_match = re.search(r'onClick=\{([^}]*(?:\{[^}]*\})*[^}]*)\}', line)
                if onclick_match:
                    onclick_handler = onclick_match.group(1).strip()

                    # Check if we already have role and tabIndex
                    has_role = False
                    has_tabindex = False

                    for j in range(max(0, i-5), min(len(lines), i+5)):
                        if 'role=' in lines[j]:
                            has_role = True
                        if 'tabIndex=' in lines[j]:
                            has_tabindex = True

                    # Add onKeyDown after onClick
                    result.append(line)

                    # Add onKeyDown with proper indentation
                    indent = re.match(r'^(\s*)', line)
                    if indent:
                        indent_str = indent.group(1)
                    else:
                        indent_str = tag_indent + '  '

                    # Create keyboard handler
                    # Check if handler is a simple function call
                    if onclick_handler.startswith('()') or onclick_handler.startswith('(e)'):
                        # Extract the function call
                        func_call = onclick_handler.split('=>', 1)[1].strip() if '=>' in onclick_handler else onclick_handler
                        keyboard_handler = f"onKeyDown={{(e) => {{ if (e.key === 'Enter' || e.key === ' ') {{ e.preventDefault(); {func_call} }} }}}}"
                    else:
                        # Use the same handler variable
                        keyboard_handler = f"onKeyDown={{(e) => {{ if (e.key === 'Enter' || e.key === ' ') {{ e.preventDefault(); ({onclick_handler})(e) }} }}}}"

                    result.append(f"{indent_str}{keyboard_handler}")

                    if not has_role:
                        result.append(f'{indent_str}role="button"')
                    if not has_tabindex:
                        result.append(f'{indent_str}tabIndex={{0}}')

                    i += 1
                    continue

        result.append(line)
        i += 1

    return '\n'.join(result)

def process_file(file_path: Path) -> Tuple[bool, str]:
    """Process a single file and fix violations."""
    try:
        content = file_path.read_text()

        if not has_onclick_without_keyboard(content):
            return False, "No violations found"

        fixed_content = fix_onclick_violations(content)

        if fixed_content != content:
            file_path.write_text(fixed_content)
            return True, "Fixed"
        else:
            return False, "No changes needed"

    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    root_dir = Path('/home/aaron/claude-project/madebuy')

    print(f"Scanning {root_dir} for .tsx/.ts files...")
    files = find_tsx_files(root_dir)
    print(f"Found {len(files)} files")

    print("\nProcessing files...")
    fixed_count = 0

    for file_path in files:
        was_fixed, message = process_file(file_path)
        if was_fixed:
            print(f"✓ {file_path.relative_to(root_dir)}")
            fixed_count += 1

    print(f"\n✓ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
