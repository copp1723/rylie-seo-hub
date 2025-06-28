# Required Environment Variables for Deployment

Set these environment variables in your Render dashboard:

## Essential Variables

1. **DATABASE_URL** (Required)
   - Your PostgreSQL connection string
   - Example: `postgresql://user:password@host:5432/dbname`

2. **NEXTAUTH_URL** (Required)
   - The full URL of your deployed application
   - For Render: `https://your-app-name.onrender.com`
   - **Important**: This must be the actual URL, not just the app name

3. **NEXTAUTH_SECRET** (Required)
   - A random secret for NextAuth
   - Generate with: `openssl rand -base64 32`

4. **GOOGLE_CLIENT_ID** (Required for auth)
   - From Google Cloud Console
   - OAuth 2.0 Client ID

5. **GOOGLE_CLIENT_SECRET** (Required for auth)
   - From Google Cloud Console
   - OAuth 2.0 Client Secret

## Optional Variables

6. **OPENROUTER_API_KEY**
   - For AI functionality
   - Get from OpenRouter dashboard

7. **OPENROUTER_BASE_URL**
   - Default: `https://openrouter.ai/api/v1`

8. **NODE_ENV**
   - Set to `production`

## Render-Specific Settings

In your Render service settings:
- Build Command: `npm ci && npm run build && npx prisma generate`
- Start Command: `npm start`
- Port: The app runs on port 3001 by default

## Troubleshooting

If you see "Invalid URL" errors:
- Make sure NEXTAUTH_URL is set to your full Render URL
- Ensure all URLs include the protocol (https://)
- Check that no environment variables contain just the domain name without protocol
