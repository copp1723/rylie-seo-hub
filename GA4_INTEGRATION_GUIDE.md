# GA4 Integration Guide for Rylie SEO Hub

## Current State
The platform currently has:
- ✅ Google OAuth authentication
- ✅ Multi-tenant architecture
- ✅ AI-powered chat interface
- ✅ User management

## What's Needed for GA4 Integration

### 1. Google Analytics Data API Setup
- Enable Google Analytics Data API in Google Cloud Console
- Add necessary scopes to OAuth: 
  - `https://www.googleapis.com/auth/analytics.readonly`

### 2. Update OAuth Scopes
In `src/lib/auth.ts`, update the Google provider:
```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'openid email profile https://www.googleapis.com/auth/analytics.readonly'
    }
  }
})
```

### 3. Add GA4 Service
Create `src/lib/ga4.ts`:
```typescript
import { google } from 'googleapis'

export class GA4Service {
  async getProperties(accessToken: string) {
    // List GA4 properties user has access to
  }

  async getReports(propertyId: string, accessToken: string) {
    // Fetch SEO-related reports
    // - Organic traffic
    // - Top landing pages
    // - Search queries
    // - User engagement metrics
  }
}
```

### 4. Store GA4 Property Association
Add to Prisma schema:
```prisma
model Agency {
  // ... existing fields
  ga4PropertyId String?
  ga4PropertyName String?
}
```

### 5. Create GA4 Setup Flow
- After login, prompt user to select their GA4 property
- Store the selected property ID with their agency
- Use this for all subsequent data fetches

### 6. Integrate with Chat Interface
Update the AI chat to:
- Fetch real GA4 data when answering SEO questions
- Provide insights based on actual metrics
- Generate reports from live data

## Testing with Dealership Data

### Option 1: Direct Integration
1. Dealership logs in with their Google account
2. Grants access to their GA4 property
3. System automatically fetches and analyzes their data

### Option 2: Service Account (Advanced)
1. Dealership creates a service account
2. Grants GA4 access to the service account
3. Uploads service account key to platform
4. System uses service account for data access

### Option 3: Demo Mode
For testing without real data:
1. Create mock GA4 data
2. Use demo dealership scenarios
3. Test all features without real GA4 connection

## Implementation Priority

1. **Phase 1**: OAuth scope update + property selection
2. **Phase 2**: Basic GA4 data fetching (traffic, pages)
3. **Phase 3**: Advanced analytics (search queries, conversions)
4. **Phase 4**: AI-powered insights from GA4 data

## Environment Variables Needed

Add to your `.env`:
```
# Google Analytics
GA4_PROPERTY_ID=your-test-property-id
```

## Security Considerations

- Store access tokens securely
- Implement token refresh logic
- Ensure data isolation between agencies
- Add rate limiting for GA4 API calls