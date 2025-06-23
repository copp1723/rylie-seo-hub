# Google Cloud Service Account Setup for GA4 Integration

## Prerequisites
- Access to Google Cloud Console
- Project Owner or Editor permissions
- GA4 properties that need to be integrated

## Step 1: Create Google Cloud Project (if needed)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Name it: `rylie-seo-hub` (or your preferred name)
5. Click "Create"

## Step 2: Enable Required APIs

1. In your Google Cloud project, go to "APIs & Services" > "Enable APIs and Services"
2. Search for and enable:
   - **Google Analytics Data API**
   - **Google Analytics Admin API** (optional, for property management)

## Step 3: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in:
   - Service account name: `rylie-ga4-integration`
   - Service account ID: `rylie-ga4-integration` (auto-fills)
   - Description: "Service account for Rylie SEO Hub GA4 integration"
4. Click "Create and Continue"
5. Skip the "Grant this service account access" step (click "Continue")
6. Skip the "Grant users access" step (click "Done")

## Step 4: Create and Download Key

1. Click on the newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Click "Create"
6. Save the downloaded JSON file securely

## Step 5: Get Service Account Email

Your service account email will be in this format:
```
rylie-ga4-integration@[PROJECT-ID].iam.gserviceaccount.com
```

You can find it:
- In the service account list
- In the downloaded JSON key file (look for "client_email")

## Step 6: Set Up Environment Variables

Add to your `.env.local` or deployment environment:

```bash
# Google Cloud Service Account (base64 encoded)
GOOGLE_SERVICE_ACCOUNT_KEY="[BASE64_ENCODED_JSON_KEY]"

# Or store individual values
GCP_PROJECT_ID="your-project-id"
GCP_CLIENT_EMAIL="rylie-ga4-integration@your-project.iam.gserviceaccount.com"
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

To encode your JSON key file in base64:
```bash
base64 -i path/to/your-key-file.json
```

## Step 7: Provide to Rowdy

Send Rowdy the following information:

```
Service Account Email: rylie-ga4-integration@[PROJECT-ID].iam.gserviceaccount.com

Please add this service account as a Viewer to the following GA4 properties:
- Property 1: [GA4 Property ID from Rowdy]
- Property 2: [GA4 Property ID from Rowdy]

Instructions for adding viewer access:
1. Go to GA4 > Admin > Property Access Management
2. Click the "+" button
3. Add the service account email above
4. Select "Viewer" role
5. Click "Add"
```

## Security Best Practices

1. **Never commit the JSON key file to version control**
2. Store the key securely in your deployment environment
3. Rotate keys periodically
4. Use least-privilege access (Viewer role only)
5. Monitor service account usage in Google Cloud Console

## Testing the Service Account

Once Rowdy confirms access has been granted, test with:

```typescript
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, 'base64').toString())
});

// Test query
const [response] = await analyticsDataClient.runReport({
  property: `properties/${GA4_PROPERTY_ID}`,
  dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
  metrics: [{ name: 'sessions' }]
});
```

## Next Steps

1. Wait for Rowdy to confirm viewer access has been added
2. Update the OAuth implementation to include GA4 scopes
3. Implement GA4 data fetching service
4. Test with real property data