#!/bin/bash

echo "🔧 Fixing MacOS 'Too Many Open Files' Error..."
echo ""

# Check current limit
echo "Current file descriptor limit:"
ulimit -n

echo ""
echo "Increasing limit to 65536..."
ulimit -n 65536

echo ""
echo "New limit:"
ulimit -n

echo ""
echo "✅ File limit increased!"
echo ""
echo "This fix is temporary (for current terminal session only)."
echo ""
echo "For permanent fix, add this to your ~/.zshrc:"
echo "ulimit -n 65536"
echo ""
echo "Now restart your server with: npm run dev"

