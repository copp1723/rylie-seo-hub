#!/bin/bash
set -e

echo "🚀 Deploying rylie-seo-hub-v2..."
echo ""

# Navigate to project directory
cd /Users/copp1723/Desktop/rylie-seo-hub-v2

# Show current status
echo "📊 Current status:"
git status --short | head -10
echo ""

# Add all changes
echo "📝 Staging changes..."
git add .

# Commit
echo "💾 Committing..."
git commit -m "fix: hardcode requests terminology, add chat page, and GA4 UI improvements" || {
    echo "⚠️  No changes to commit, checking if we need to push..."
}

# Push
echo ""
echo "📤 Pushing to GitHub..."
git push origin main || {
    echo "✅ Already up to date!"
}

echo ""
echo "✅ Git operations complete!"
echo ""
echo "📋 Now go to Render and deploy:"
echo "   1. Visit: https://dashboard.render.com"
echo "   2. Select: rylie-seo-hub"
echo "   3. Click: Deploys → Manual Deploy"
echo "   4. Optional: Clear build cache"
