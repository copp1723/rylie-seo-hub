# Setting Up Auto-Deploy from GitHub to Render

## Step 1: Get your Render Deploy Hook URL

1. Go to your Render Dashboard: https://dashboard.render.com
2. Select your service: **rylie-seo-hub**
3. Go to **Settings** tab
4. Scroll down to **Deploy Hook**
5. Click **Generate Deploy Hook**
6. Copy the URL (it looks like: `https://api.render.com/deploy/srv-xxxxx?key=yyyy`)

## Step 2: Add the Deploy Hook to GitHub Secrets

1. Go to your GitHub repo: https://github.com/copp1723/rylie-seo-hub
2. Click **Settings** (in the repo, not your profile)
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `RENDER_DEPLOY_HOOK_URL`
6. Value: Paste the deploy hook URL from Render
7. Click **Add secret**

## Step 3: Test the Workflow

The workflow will automatically run when you:
- Push to the `main` branch
- Manually trigger it from GitHub Actions tab

To manually test:
1. Go to your repo's **Actions** tab
2. Click **Deploy to Render** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow** button

## How It Works

1. Every push to `main` triggers the workflow
2. GitHub Actions calls your Render deploy hook
3. Render pulls the latest code and builds it
4. No more manual deploys needed!

## Alternative: Render's Built-in GitHub Integration

If you prefer, Render also offers direct GitHub integration:
1. In Render Dashboard → Settings
2. Look for **Build & Deploy** section
3. Connect your GitHub account
4. Enable **Auto-Deploy** for the main branch

This is simpler but gives you less control than GitHub Actions.

## Monitoring Deployments

- GitHub: Check the Actions tab for workflow runs
- Render: Check the Deploys tab for build logs
- Both will show success/failure status

## Troubleshooting

If deploys aren't triggering:
1. Check the RENDER_DEPLOY_HOOK_URL secret is set correctly
2. Ensure the workflow file is in `.github/workflows/`
3. Check GitHub Actions is enabled for your repo
4. Look at the workflow run logs for errors
