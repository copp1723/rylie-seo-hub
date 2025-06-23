# Environment Variables Configuration Guide

## Required Environment Variables

### 🔴 Critical (App won't work without these)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Authentication
NEXTAUTH_URL=https://your-app.onrender.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# AI Chat (NEW - Required for chat functionality)
OPENROUTER_API_KEY=<your-openrouter-api-key>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### 🟡 Important (Some features won't work)

```bash
# GA4 Analytics Integration
GA4_SERVICE_ACCOUNT_KEY=<json-string-from-google-cloud>

# Email Service (for notifications)
MAILGUN_API_KEY=<your-mailgun-api-key>
MAILGUN_DOMAIN=<your-mailgun-domain>
MAILGUN_FROM_EMAIL=noreply@yourdomain.com
MAILGUN_FROM_NAME=Your Company Name

# Error Tracking
SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
```

### 🟢 Optional (Enhanced features)

```bash
# File Uploads (only if using logo upload feature)
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-cloudinary-key>
CLOUDINARY_API_SECRET=<your-cloudinary-secret>

# Analytics
POSTHOG_KEY=<your-posthog-key>
POSTHOG_HOST=https://app.posthog.com

# SEOWorks Integration
SEOWORKS_API_KEY=<your-seoworks-api-key>
SEOWORKS_API_URL=https://api.seoworks.com

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_EMAILS=admin@yourdomain.com,owner@yourdomain.com
```

## How to Generate Values

### NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable Google Analytics API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-app.onrender.com/api/auth/callback/google`

### GA4 Service Account
1. In Google Cloud Console, create a service account
2. Download the JSON key file
3. Convert to single-line JSON string for environment variable

### OpenRouter API
1. Sign up at [OpenRouter](https://openrouter.ai)
2. Generate API key from dashboard
3. Add credits to your account

## Setting in Render

1. Go to your Render Dashboard
2. Select your Web Service
3. Go to "Environment" tab
4. Add each variable with its value
5. Click "Save Changes"

## Local Development

Create `.env.local` file:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

## Verification

After deployment, verify:
1. Check logs for any missing variable errors
2. Test Google OAuth login
3. Test chat functionality
4. Test GA4 connection (if configured)
