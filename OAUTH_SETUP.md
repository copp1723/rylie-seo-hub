# Google OAuth & GA4 Setup Guide

## 1. Fix Swapped OAuth Credentials

Your credentials appear to be swapped. Based on the format:
- **Client ID** should be: `[YOUR-PROJECT-ID].apps.googleusercontent.com`
- **Client Secret** should be: `GOCSPX-[YOUR-SECRET-KEY]`

Update your environment variables:
```env
GOOGLE_CLIENT_ID=[YOUR-CLIENT-ID]
GOOGLE_CLIENT_SECRET=[YOUR-CLIENT-SECRET]
```

## 2. Add Redirect URIs to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one if needed)
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add these **Authorized redirect URIs**:
   ```
   https://rylie-seo-hub.onrender.com/api/auth/callback/google
   http://localhost:3001/api/auth/callback/google
   ```
6. Click **Save**

## 3. Enable Required APIs

In Google Cloud Console, enable these APIs:
1. **Google Analytics Data API** - Required for GA4 integration
2. **Google Analytics Admin API** - Required for listing GA4 properties

Go to **APIs & Services** → **Library** and search for each API to enable them.

## 4. Configure GA4 Service Account

Create the service account key file:

1. Create a file at `/Users/copp1723/Downloads/rylie-seo-hub-main/ga4-service-account.json`
2. Add your service account JSON (replace with your actual key):
```json
{
  "type": "service_account",
  "project_id": "onekeel-seo",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "seo-ga4-service@onekeel-seo.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/seo-ga4-service%40onekeel-seo.iam.gserviceaccount.com"
}
```

3. Update your environment variables:
```env
GA4_SERVICE_ACCOUNT_EMAIL=seo-ga4-service@onekeel-seo.iam.gserviceaccount.com
GA4_SERVICE_ACCOUNT_KEY={"type":"service_account",...} # Full JSON as single line
GA4_PROPERTY_ID=493777160
```

## 5. Grant GA4 Access to Service Account

1. Go to [Google Analytics](https://analytics.google.com)
2. Select your property (ID: 493777160)
3. Go to **Admin** → **Property Access Management**
4. Click **+** → **Add users**
5. Add email: `seo-ga4-service@onekeel-seo.iam.gserviceaccount.com`
6. Grant **Viewer** role
7. Click **Add**

## 6. Make Yourself Super Admin

After deployment, run this in the Render shell:

```bash
cd /opt/render/project/src
npx prisma db push
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function makeSuperAdmin() {
  const user = await prisma.user.update({
    where: { email: 'YOUR_EMAIL@gmail.com' },
    data: { isSuperAdmin: true }
  });
  console.log('User updated:', user);
}
makeSuperAdmin().then(() => process.exit(0));
"
```

Replace `YOUR_EMAIL@gmail.com` with your actual email address.

## 7. Test the Integration

1. Visit https://rylie-seo-hub.onrender.com
2. Click "Sign in with Google"
3. After login, visit `/super-admin` to access the super admin dashboard
4. Visit `/settings/ga4` to connect your GA4 property
5. Test the chat with questions about your dealership's SEO data

## Troubleshooting

### "redirect_uri_mismatch" Error
- Double-check that the redirect URI in Google Cloud Console matches exactly
- Ensure you're using HTTPS for production (not HTTP)
- Clear browser cache and cookies

### "UntrustedHost" Error
- Already fixed with `trustHost: true` in auth config
- If persists, check NEXTAUTH_URL is set correctly

### GA4 Connection Issues
- Verify the service account has access to the GA4 property
- Check that Google Analytics Data API is enabled
- Ensure the property ID is correct (493777160)

### OAuth Token Issues
- The Google OAuth scopes include GA4 read access
- Tokens are refreshed automatically by NextAuth
- Service account is used as fallback for background tasks