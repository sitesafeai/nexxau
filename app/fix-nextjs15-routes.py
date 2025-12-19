#!/usr/bin/env python3
"""
Fix Next.js 15 route handler params signature
Changes { params: { ... } } to { params: Promise<{ ... }> }
And updates params.xxx to await params first
"""

import os
import re
from pathlib import Path

def fix_route_file(file_path: Path):
    """Fix a single route file"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Pattern 1: Fix params type signature
        # { params }: { params: { id: string } } -> { params }: { params: Promise<{ id: string }> }
        content = re.sub(
            r'\{ params \}: \{ params: \{ ([^}]+) \} \}',
            r'{ params }: { params: Promise<{ \1 }> }',
            content
        )
        
        # Pattern 2: Fix params usage - need to await params first
        # Find all uses of params.xxx and replace with destructured version
        # This is more complex, so we'll do it carefully
        
        # Check if we made any changes
        if content != original:
            # Now fix params.xxx usage patterns
            # Find function definitions that use params
            functions = re.finditer(
                r'(export async function (GET|POST|PUT|DELETE|PATCH|OPTIONS)\s*\([^)]*\{ params \}: \{ params: Promise<\{ ([^}]+) \}> \}[^)]*\)\s*\{[^}]*?)(const \{ id \} = await params;)?',
                content,
                re.MULTILINE | re.DOTALL
            )
            
            # For each function, check if params.xxx is used before await
            # This is a simplified fix - may need manual review
            param_pattern = r'params\.(\w+)'
            matches = list(re.finditer(param_pattern, content))
            
            if matches:
                # Find the function each match belongs to
                for match in reversed(matches):  # Process from end to avoid offset issues
                    param_name = match.group(1)
                    start_pos = match.start()
                    
                    # Find the function this belongs to
                    func_start = content.rfind('export async function', 0, start_pos)
                    if func_start == -1:
                        continue
                    
                    func_end = content.find('}', start_pos)
                    func_content = content[func_start:func_end]
                    
                    # Check if await params is already in this function
                    if 'await params' not in func_content:
                        # Find where to insert await params
                        # Look for first use of params.xxx
                        first_param_use = re.search(rf'params\.{param_name}', func_content)
                        if first_param_use:
                            insert_pos = func_start + first_param_use.start()
                            # Extract param names from Promise<{ ... }>
                            param_match = re.search(r'Promise<\{ ([^}]+) \}>', func_content)
                            if param_match:
                                param_def = param_match.group(1)
                                # Insert await params destructuring
                                destructure = f"    const {{ {param_def} }} = await params;\n"
                                content = content[:insert_pos] + destructure + content[insert_pos:]
                                # Replace params.xxx with just xxx
                                content = re.sub(
                                    rf'\bparams\.{param_name}\b',
                                    param_name,
                                    content[insert_pos + len(destructure):]
                                )
                                content = content[:insert_pos + len(destructure)] + content[insert_pos + len(destructure):]
            
            file_path.write_text(content, encoding='utf-8')
            return True
        return False
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    app_dir = Path(__file__).parent / 'app' / 'api'
    if not app_dir.exists():
        print(f"Error: {app_dir} does not exist")
        return
    
    route_files = list(app_dir.rglob('route.ts'))
    fixed_count = 0
    
    print(f"Found {len(route_files)} route files")
    
    for route_file in route_files:
        if fix_route_file(route_file):
            fixed_count += 1
            print(f"Fixed: {route_file.relative_to(Path(__file__).parent)}")
    
    print(f"\n✅ Fixed {fixed_count} files")
    print("⚠️  Please review changes and test the build")

if __name__ == '__main__':
    main()

