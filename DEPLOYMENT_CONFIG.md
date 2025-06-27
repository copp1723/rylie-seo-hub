# Deployment Configuration

## Current Setup
- **Repository**: https://github.com/copp1723/rylie-seo-hub
- **Branch**: main
- **Hosting**: Render (https://rylie-seo-hub.onrender.com)
- **Framework**: Next.js 14
- **Database**: PostgreSQL (Supabase)

## Auto-Deploy Options

### Option 1: GitHub Actions + Render Deploy Hook (Recommended)
**Status**: ✅ Configured (needs deploy hook URL)
**File**: `.github/workflows/deploy-render.yml`
**Setup**: Add `RENDER_DEPLOY_HOOK_URL` secret in GitHub

**Pros**:
- Full control over deployment process
- Can add custom steps (tests, notifications)
- Clear deployment history in GitHub
- Works with any branch strategy

**Cons**:
- Requires manual setup of deploy hook
- One more thing to maintain

### Option 2: Render's Native GitHub Integration
**Status**: ❓ Check Render dashboard
**Setup**: In Render → Settings → Build & Deploy → Connect GitHub

**Pros**:
- Simpler setup
- Managed by Render
- Automatic branch tracking

**Cons**:
- Less visibility into deploy process
- Limited customization
- Tied to Render's implementation

## Environment Variables

### Build-time (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_USE_REQUESTS_TERMINOLOGY=true` (now hardcoded)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Runtime
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`

## Build Settings on Render

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18.x or higher
- **Auto-Deploy**: Enable for main branch

## Deploy Checklist

1. ✅ Code changes committed locally
2. ✅ Changes pushed to GitHub
3. ⏳ Deploy triggered (manual or auto)
4. ⏳ Build completes on Render
5. ⏳ New version live

## Monitoring

- **Build Logs**: Render Dashboard → Deploys
- **Runtime Logs**: Render Dashboard → Logs
- **GitHub Actions**: Repo → Actions tab
- **Uptime**: Consider adding monitoring (UptimeRobot, etc.)

## Rollback Process

If something goes wrong:
1. Render Dashboard → Deploys
2. Find last working deploy
3. Click "Rollback to this deploy"
4. Or: Git revert and push to trigger new deploy
