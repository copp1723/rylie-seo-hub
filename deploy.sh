#!/bin/bash

# Deploy script for rylie-seo-hub-v2
# This script commits all changes and pushes to GitHub

echo "🚀 Starting deployment process..."

# Navigate to project directory
cd /Users/copp1723/Desktop/rylie-seo-hub-v2

# Show current status
echo "📊 Current git status:"
git status --short

# Add all changes
echo "📝 Adding all changes..."
git add .

# Create commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="fix: deploy hardcoded requests terminology, chat page, and GA4 UI fixes - $TIMESTAMP"

echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

# Push to origin
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Push complete! Now trigger a manual deploy on Render."
echo ""
echo "Next steps:"
echo "1. Go to Render Dashboard: https://dashboard.render.com"
echo "2. Find your service (rylie-seo-hub)"
echo "3. Go to the 'Deploys' tab"
echo "4. Click 'Manual Deploy' or 'Deploy Latest Commit'"
echo "5. Optional: Clear build cache in Advanced settings"
echo ""
echo "🎯 Watch for the new commit SHA in the build logs!"
