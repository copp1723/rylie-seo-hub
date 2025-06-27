# Integration Requirements for Jeff (Customer Scout) and Rowdy (LocalWerks)

## For Jeff - Customer Scout Task Integration

### Webhook Endpoint Details

**Endpoint:** `POST https://seorylie-production.onrender.com/api/seoworks/webhook`

**Authentication:**
- Header: `X-API-Key: [PROVIDE THE ACTUAL API KEY FROM YOUR ENV]`
- The API key should match your `SEOWORKS_API_KEY` environment variable

### Required Payload Format

```json
{
  "id": "unique-uuid-here",
  "task_type": "blog",  // Options: blog, page, gbp, maintenance, seo, seo_audit
  "status": "completed",  // Options: completed, pending, in_progress, cancelled
  "completion_date": "2025-06-23T20:00:00Z",  // ISO 8601 format
  "post_title": "5 Tips for Winter Car Maintenance",
  "post_url": "https://example-dealer.com/blog/winter-car-maintenance",  // Optional
  "completion_notes": "Published and optimized for local SEO",  // Optional
  "is_weekly": false,  // Set to true for weekly rollup reports
  "payload": {  // Optional - any additional data
    "wordCount": 1200,
    "seoScore": 95
  }
}
```

### Testing Instructions

1. **Test Endpoint Availability:**
   ```bash
   curl -X GET https://seorylie-production.onrender.com/api/seoworks/webhook \
     -H "X-API-Key: YOUR_API_KEY"
   ```

2. **Send Test Payload:**
   ```bash
   curl -X POST https://seorylie-production.onrender.com/api/seoworks/webhook \
     -H "X-API-Key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "test-123",
       "task_type": "blog",
       "status": "completed",
       "completion_date": "2025-06-23T20:00:00Z",
       "post_title": "Test Blog Post",
       "post_url": "https://example.com/test",
       "completion_notes": "Test submission",
       "is_weekly": false
     }'
   ```

### Important Notes for Jeff

1. **Task Creation Flow:**
   - Tasks sent to the webhook are stored in our system
   - They will be automatically matched to existing orders when possible
   - Unmatched tasks are stored for manual review

2. **Weekly Reports:**
   - Use the same endpoint but set `"is_weekly": true`
   - Include aggregated data in the `payload` field

3. **Response Codes:**
   - `201` - New task created successfully
   - `200` - Existing task updated successfully
   - `400` - Invalid payload format
   - `401` - Invalid or missing API key
   - `500` - Server error

## For Rowdy - GA4 Integration

### Service Account Setup Required

1. **Create Service Account:**
   - Follow the instructions in `GOOGLE_CLOUD_SERVICE_ACCOUNT_SETUP.md`
   - Service account email format: `rylie-ga4-integration@[PROJECT-ID].iam.gserviceaccount.com`

2. **What You Need From Rowdy:**
   - Confirmation of GA4 property IDs
   - Once you provide the service account email, Rowdy needs to add it as a Viewer

### Instructions for Rowdy

Once you have created your Google Cloud service account:

```
Service Account Email: [YOUR-SERVICE-ACCOUNT-EMAIL]

Please add this service account as a Viewer to these GA4 properties:
1. Property ID: [Property 1 ID that Rowdy provided]
2. Property ID: [Property 2 ID that Rowdy provided]

To add viewer access:
1. Go to Google Analytics 4
2. Navigate to Admin > Property Access Management
3. Click the "+" button to add a user
4. Enter the service account email above
5. Select "Viewer" role
6. Click "Add"
```

### OAuth Scopes (Already Configured)

The following GA4 scopes are already included in the OAuth configuration:
- `https://www.googleapis.com/auth/analytics.readonly`
- `https://www.googleapis.com/auth/analytics.manage.users.readonly`

## Database Changes Made

1. **New SEOWorksTask Model:**
   - Stores all incoming webhook data
   - Links to existing orders when possible
   - Tracks both daily tasks and weekly reports

2. **Existing GA4 Fields in Agency Model:**
   - `ga4PropertyId` - Stores the GA4 property ID
   - `ga4PropertyName` - Stores the property name
   - `ga4RefreshToken` - Stores encrypted refresh token

## Next Steps

### For You (Josh):

1. **Immediate Actions:**
   - Run database migration: `npx prisma migrate deploy`
   - Set the `SEOWORKS_API_KEY` environment variable
   - Deploy the updated code with the new webhook endpoint

2. **Provide to Jeff:**
   - The actual API key value
   - Confirmation that the webhook endpoint is live
   - Test endpoint URL for verification

3. **Provide to Rowdy:**
   - Your Google Cloud service account email (after creating it)
   - Confirmation of which GA4 properties to add

### Timeline Suggestions:

1. **Today:** Deploy webhook endpoint and provide API key to Jeff
2. **Tomorrow:** Create Google Cloud service account and send email to Rowdy
3. **This Week:** Jeff tests webhook integration, Rowdy adds GA4 access
4. **Next Week:** Full integration testing with real data

## Questions to Answer:

1. **For Jeff:**
   - Do you need a separate endpoint for weekly reports, or is the `is_weekly` flag sufficient?
   - What additional fields might you need in the `payload`?
   - Do you need to query existing tasks via API?

2. **For Rowdy:**
   - Are there additional GA4 properties beyond the two mentioned?
   - Do you need Search Console access setup at the same time?
   - Any specific GA4 metrics you want prioritized?