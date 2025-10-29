#!/bin/bash

echo "🔧 Fixing all Prisma imports in API routes..."
echo ""

# Find all files that import from '@/app/lib/prisma'
FILES=$(grep -r "from '@/app/lib/prisma'" app/app/api --include="*.ts" -l)

COUNT=0
for file in $FILES; do
    echo "Updating: $file"
    
    # Replace the import
    sed -i '' "s|from '@/app/lib/prisma'|from '@/app/lib/db'|g" "$file"
    
    # Remove $disconnect calls
    sed -i '' 's|await prisma\.\$disconnect();|// No disconnect needed with singleton|g' "$file"
    sed -i '' 's|await db\.\$disconnect();|// No disconnect needed with singleton|g' "$file"
    
    COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Updated $COUNT files"
echo ""
echo "Files updated:"
echo "$FILES"
echo ""
echo "Now restart your server!"

