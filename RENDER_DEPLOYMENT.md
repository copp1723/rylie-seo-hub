# Render Deployment Guide for Rylie SEO Hub

## 🚀 Quick Deploy to Render

### **Option 1: One-Click Deploy (Recommended)**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/copp1723/rylie-seo-hub)

### **Option 2: Manual Deployment**

1. **Fork or Clone the Repository**
   ```bash
   git clone https://github.com/copp1723/rylie-seo-hub.git
   cd rylie-seo-hub
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the `rylie-seo-hub` repository

3. **Configure Environment Variables**
   
   **Required Variables:**
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```
   
   **Optional Variables:**
   ```
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your_mailgun_domain
   SENTRY_DSN=your_sentry_dsn
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
   ```

4. **Deploy**
   - Click "Apply" to start deployment
   - Wait for build and deployment to complete
   - Your app will be available at `https://your-app-name.onrender.com`

## 📋 **What Gets Deployed**

### **Web Service:**
- **Runtime:** Node.js
- **Plan:** Starter (can be upgraded)
- **Region:** Oregon (can be changed)
- **Auto-deploy:** Enabled (deploys on git push)

### **Database:**
- **Type:** PostgreSQL 15
- **Plan:** Starter (can be upgraded)
- **Auto-backup:** Enabled
- **Connection:** Automatically configured

### **Build Process:**
1. Install dependencies (`npm ci`)
2. Build Next.js application (`npm run build`)
3. Generate Prisma client (`npx prisma generate`)
4. Push database schema (`npx prisma db push`)
5. Start production server (`npm start`)

## 🔧 **Environment Variables Setup**

### **Google OAuth Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-app-name.onrender.com/api/auth/callback/google`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render

### **OpenRouter API Setup:**
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Generate API key
3. Set `OPENROUTER_API_KEY` in Render

### **Optional Services:**

**Mailgun (Email):**
1. Sign up at [Mailgun](https://www.mailgun.com/)
2. Get API key and domain
3. Set `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`

**Sentry (Error Tracking):**
1. Sign up at [Sentry](https://sentry.io/)
2. Create project and get DSN
3. Set `SENTRY_DSN`

**PostHog (Analytics):**
1. Sign up at [PostHog](https://posthog.com/)
2. Get project key
3. Set `NEXT_PUBLIC_POSTHOG_KEY`

## 🔄 **Automatic Deployments**

The `render.yaml` configuration enables:
- **Auto-deploy on git push** to main branch
- **Database migrations** run automatically
- **Environment variables** managed through Render dashboard
- **Health checks** to ensure app is running
- **Rollback capability** if deployment fails

## 📊 **Monitoring & Scaling**

### **Built-in Monitoring:**
- Application logs available in Render dashboard
- Performance metrics and uptime monitoring
- Error tracking with Sentry integration
- User analytics with PostHog integration

### **Scaling Options:**
- **Vertical scaling:** Upgrade to Standard or Pro plans
- **Horizontal scaling:** Add multiple instances (Pro plan)
- **Database scaling:** Upgrade PostgreSQL plan as needed

## 🛠️ **Troubleshooting**

### **Common Issues:**

**Build Failures:**
- Check environment variables are set correctly
- Ensure all required secrets are configured
- Review build logs in Render dashboard

**Database Connection:**
- Verify `DATABASE_URL` is automatically set by Render
- Check database is in same region as web service
- Ensure Prisma migrations completed successfully

**Authentication Issues:**
- Verify Google OAuth redirect URIs include your Render domain
- Check `NEXTAUTH_URL` matches your deployed URL
- Ensure `NEXTAUTH_SECRET` is generated and set

### **Support:**
- **Render Documentation:** https://render.com/docs
- **Application Logs:** Available in Render dashboard
- **GitHub Issues:** Report bugs in the repository

## 🎯 **Production Checklist**

Before going live:
- [ ] Set all required environment variables
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificate (automatic with Render)
- [ ] Configure email service for notifications
- [ ] Set up error tracking and analytics
- [ ] Test authentication flow
- [ ] Verify database connectivity
- [ ] Test AI chat functionality
- [ ] Review security settings

## 💰 **Cost Estimation**

**Basic Plan (Recommended for MVP):**
- Web Service (Standard): $25/month
- PostgreSQL (Basic): $15/month
- **Total: ~$40/month**

**Production Plan:**
- Web Service (Standard): $25/month
- PostgreSQL (Standard): $50/month
- **Total: ~$75/month**

**Enterprise Plan:**
- Web Service (Pro): $85/month
- PostgreSQL (Premium): $200/month
- **Total: ~$285/month**

---

**Your Rylie SEO Hub will be live and ready for agencies in minutes!** 🚀

