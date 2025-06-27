# Deployment Checklist for rylie-seo-hub-v2

## Current Status
- ✅ Feature flag hardcoded to USE_REQUESTS_TERMINOLOGY: true
- ✅ Chat page created at /src/app/chat/page.tsx
- ✅ GA4 UI improvements in place
- ❌ Changes NOT committed to git
- ❌ Changes NOT pushed to GitHub
- ❌ Render is building old code (commit 07560f3)

## Immediate Actions Required

### 1. Commit and Push Changes
```bash
cd /Users/copp1723/Desktop/rylie-seo-hub-v2
git add .
git commit -m "fix: hardcode requests terminology, add chat page, GA4 UI fixes"
git push origin main
```

### 2. Verify Push Success
```bash
# Check that local and remote are in sync
git log -1 --oneline
git log origin/main -1 --oneline
# These should show the same new commit SHA
```

### 3. Trigger Render Deploy
1. Go to: https://dashboard.render.com
2. Select your service: **rylie-seo-hub**
3. Navigate to **Deploys** tab
4. Click **Manual Deploy** 
5. (Optional but recommended) Click **Advanced** → **Clear build cache**

### 4. Monitor Build Logs
Watch for:
- New commit SHA (not 07560f3)
- Your commit message in the logs
- Successful build completion

## What Was Fixed

### 1. Hardcoded Feature Flag
- File: `/src/lib/feature-flags.ts`
- Changed: `USE_REQUESTS_TERMINOLOGY: true` (no longer depends on env var)
- Result: UI will show "Requests" instead of "Orders"

### 2. Added Chat Page
- File: `/src/app/chat/page.tsx`
- Added complete chat interface with authentication
- Fixes 404 error when accessing /chat

### 3. GA4 Settings Page
- Already using enhanced UI components
- No changes needed

## Environment Variables on Render
Your current env vars are correct:
- ✅ NEXT_PUBLIC_USE_REQUESTS_TERMINOLOGY=true
- ✅ All database and auth variables set

Since we hardcoded the feature flag, the NEXT_PUBLIC_ variable is no longer critical, but it's good to keep it set.

## Verification After Deploy
1. Visit your live site
2. Check sidebar shows "Requests" not "Orders"
3. Visit /chat - should load without 404
4. Visit /settings/ga4 - should show enhanced UI

## Future Best Practices
1. Always commit before expecting deploys
2. Use `git status` to check for uncommitted changes
3. Consider using the deploy.sh script for one-command deploys
4. Set up GitHub Actions for automatic deploys on push
