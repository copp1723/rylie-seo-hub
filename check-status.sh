#!/bin/bash

# Quick status check for rylie-seo-hub-v2

echo "🔍 Checking project status..."
echo ""

cd /Users/copp1723/Desktop/rylie-seo-hub-v2

# Show git info
echo "📍 Current branch:"
git branch --show-current

echo ""
echo "📊 Git status summary:"
git status --short | head -20
echo ""

# Count changes
MODIFIED=$(git status --porcelain | grep -c "^ M")
ADDED=$(git status --porcelain | grep -c "^??")
TOTAL=$((MODIFIED + ADDED))

echo "📈 Change summary:"
echo "  - Modified files: $MODIFIED"
echo "  - New files: $ADDED"
echo "  - Total changes: $TOTAL"
echo ""

# Show key files
echo "🔑 Key files status:"
echo -n "  - feature-flags.ts: "
if git status --porcelain | grep -q "src/lib/feature-flags.ts"; then
    echo "✅ Modified (hardcoded to true)"
else
    echo "❌ Not modified"
fi

echo -n "  - chat/page.tsx: "
if [ -f "src/app/chat/page.tsx" ]; then
    echo "✅ Exists"
else
    echo "❌ Missing"
fi

echo ""
echo "💡 Ready to deploy? Run: ./deploy.sh"
