# Deployment Checklist - Rylie SEO Hub

## Current Status
- ✅ OAuth authentication working
- ✅ Database schema synced
- ✅ Super admin access granted
- ⚠️ GA4 integration needs API fix
- ⚠️ Chat needs OpenRouter API key

## Required Environment Variables

### Authentication
✅ `NEXTAUTH_URL=https://rylie-seo-hub.onrender.com`
✅ `NEXTAUTH_SECRET` (generate with: openssl rand -base64 32)
✅ `GOOGLE_CLIENT_ID=703879232708-tkq8cqhhu9sr3qrqeniff908erda3i7v.apps.googleusercontent.com`
✅ `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)

### Database
✅ `DATABASE_URL` (PostgreSQL connection string)

### AI Chat (Required for chat functionality)
❌ `OPENROUTER_API_KEY` - Get from https://openrouter.ai/keys
❌ `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`

### GA4 Integration
✅ `GA4_PROPERTY_ID=493777160`
✅ `GA4_SERVICE_ACCOUNT_EMAIL=seo-ga4-service@onekeel-seo.iam.gserviceaccount.com`
⚠️ `GA4_SERVICE_ACCOUNT_KEY` (JSON as single line)

## To Fix Chat
1. Sign up at https://openrouter.ai
2. Create an API key
3. Add to Render environment variables:
   - `OPENROUTER_API_KEY=your-key-here`
   - `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`

## To Fix GA4
The GA4 properties list API needs deployment of the latest fix that properly handles account listing.

## Next Steps
1. Add OpenRouter API key to enable chat
2. Wait for deployment of GA4 fix
3. Test all features
