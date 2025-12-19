#!/bin/bash

# Script to fix Next.js 15 route handler params signature
# Changes { params: { id: string } } to { params: Promise<{ id: string }> }
# And updates params.id to await params then destructure

cd "$(dirname "$0")/app"

echo "🔧 Fixing Next.js 15 route handler signatures..."

# Find all route.ts files with old params signature
find app/api -name "route.ts" -type f | while read file; do
  # Check if file has old params pattern
  if grep -q "{ params }: { params: { " "$file" 2>/dev/null; then
    echo "Fixing: $file"
    
    # Use sed to fix the params type signature
    # This is a simple fix - may need manual review for complex cases
    sed -i '' \
      -e 's/{ params }: { params: { \([^}]*\) } }/{ params }: { params: Promise<{ \1 }> }/g' \
      -e 's/const { id } = params;/const { id } = await params;/g' \
      -e 's/params\.id/const { id } = await params; \/\/ Fixed: await params first\n    const id = id;/g' \
      "$file"
    
    # More careful replacement for params.id usage
    # This needs to be done more carefully to avoid breaking code
  fi
done

echo "✅ Done! Please review changes and test the build."

