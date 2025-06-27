#!/bin/bash

echo "🚀 Starting deployment fix..."

# Clean local build
echo "🧹 Cleaning build artifacts..."
npm run clean
rm -rf .next node_modules/.cache

# Ensure dependencies are fresh
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Test build
echo "🏗️ Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Commit any changes
    echo "📝 Committing changes..."
    git add .
    git commit -m "fix: deployment sync - all 11 tickets included" || echo "No changes to commit"
    
    # Push to remote
    echo "🚢 Pushing to GitHub..."
    git push origin main
    
    echo "✅ Done! Now go to Render and click 'Clear cache & deploy'"
    echo ""
    echo "📋 Post-deployment checklist:"
    echo "1. Go to Render dashboard"
    echo "2. Click 'Manual Deploy'"
    echo "3. Select 'Clear build cache & deploy'"
    echo "4. Wait for deployment to complete"
    echo "5. Clear browser cache"
    echo "6. Visit https://rylie-seo-hub.onrender.com/requests"
else
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi