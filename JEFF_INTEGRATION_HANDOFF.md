# SEOWorks Integration Handoff Document

**Contact**: Josh Copp - 913.526.5281

## Overview

This document contains all the technical details for integrating with the Rylie SEO Hub webhook endpoints. There are two main integrations:

1. **Task Status Webhooks** - For sending task updates from SEOWorks to Rylie SEO Hub
2. **Onboarding Data Webhooks** - For receiving dealership onboarding submissions

---

## 1. Task Status Webhook (SEOWorks → Rylie SEO Hub)

### Endpoint Details
- **URL**: `https://rylie-seo-hub.onrender.com/api/seoworks/webhook`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: `x-api-key` header (API key to be provided)

### Request Format

```json
{
  "eventType": "task.completed",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "externalId": "task-123",
    "taskType": "blog",
    "status": "completed",
    "completionDate": "2024-03-15T10:30:00Z",
    "completionNotes": "Blog post completed with all SEO optimizations",
    "deliverables": [
      {
        "type": "blog_post",
        "url": "https://example.com/blog/seo-tips-2024",
        "title": "10 Essential SEO Tips for 2024",
        "description": "Comprehensive guide covering modern SEO best practices"
      }
    ],
    "actualHours": 6.5,
    "qualityScore": 5
  }
}
```

### Field Descriptions

**Required Fields:**
- `eventType`: One of: `task.created`, `task.updated`, `task.completed`, `task.cancelled`
- `timestamp`: ISO 8601 datetime when the event occurred
- `data.externalId`: Unique identifier for the task from SEOWorks
- `data.taskType`: One of: `blog`, `page`, `gbp`, `maintenance`, `seo`, `seo_audit`
- `data.status`: One of: `pending`, `in_progress`, `completed`, `cancelled`

**Optional Fields:**
- `data.completionDate`: ISO 8601 datetime when task was completed
- `data.completionNotes`: Additional notes about the completion
- `data.deliverables`: Array of deliverable objects
- `data.actualHours`: Actual hours spent on the task
- `data.qualityScore`: Quality rating from 1-5

### Testing Commands

```bash
# Test webhook connectivity
curl -X GET https://rylie-seo-hub.onrender.com/api/seoworks/webhook \
  -H "x-api-key: your-webhook-secret"

# Simulate a task completion
curl -X POST https://rylie-seo-hub.onrender.com/api/seoworks/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "task-123",
    "taskType": "blog",
    "completionNotes": "Blog post completed"
  }'
```

---

## 2. Onboarding Webhook (Rylie SEO Hub → SEOWorks)

### Endpoint Details
- **URL**: Your webhook endpoint (please provide)
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: `x-api-key` header (you provide the key)

### Request Format

When a dealership completes the onboarding form, we'll send this JSON payload:

```json
{
  "timestamp": "2024-03-15T10:30:00Z",
  "businessName": "Example Dealership",
  "package": "GOLD",
  "mainBrand": "Toyota",
  "otherBrand": "Lexus",
  "address": "123 Main Street",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "contactName": "John Smith",
  "contactTitle": "General Manager",
  "email": "john.smith@example.com",
  "phone": "(512) 555-0123",
  "websiteUrl": "https://www.exampledealership.com",
  "billingEmail": "billing@exampledealership.com",
  "siteAccessNotes": "WordPress admin access will be provided via email",
  "targetVehicleModels": "Toyota Camry;Toyota RAV4;Toyota Highlander;Lexus RX350",
  "targetCities": "Austin;Round Rock;Cedar Park;Georgetown;Pflugerville",
  "targetDealers": "Competitor Auto Group;City Motors;Premier Toyota of Downtown"
}
```

### Important Notes on Format

- **Semicolon-Delimited Lists**: The fields `targetVehicleModels`, `targetCities`, and `targetDealers` are semicolon-delimited strings (not arrays)
- **Minimum Requirements**: Each semicolon-delimited field will have at least 3 items
- **Optional Fields**: `otherBrand` and `siteAccessNotes` may be empty strings if not provided

### Parsing Example

```javascript
// To parse the semicolon-delimited fields:
const vehicles = payload.targetVehicleModels.split(';');
const cities = payload.targetCities.split(';');
const dealers = payload.targetDealers.split(';');
```

### Expected Response

Please return a JSON response indicating success or failure:

**Success Response:**
```json
{
  "success": true,
  "message": "Onboarding received",
  "referenceId": "optional-reference-id"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Configuration Requirements

### From Jeff (SEOWorks):

1. **For Task Status Webhooks:**
   - API key for the `x-api-key` header (we'll configure this on our end)

2. **For Onboarding Webhooks:**
   - Your webhook endpoint URL
   - API key that we should send in the `x-api-key` header

### Environment Variables We'll Configure:

```
# For receiving task status updates
SEOWORKS_WEBHOOK_SECRET="your-api-key-for-task-webhooks"

# For sending onboarding data
SEOWORKS_WEBHOOK_URL="https://your-endpoint.com/onboarding"
SEOWORKS_API_KEY="your-api-key-for-onboarding"
```

---

## Testing Endpoints

We've created test endpoints to help with integration:

1. **View Onboarding JSON Format:**
   ```
   GET https://rylie-seo-hub.onrender.com/api/onboarding/test
   ```

2. **Test Task Webhook:**
   ```
   POST https://rylie-seo-hub.onrender.com/api/seoworks/test-webhook
   ```

---

## Security Notes

- All webhooks use HTTPS
- API keys use timing-safe comparison to prevent timing attacks
- Failed authentication attempts are logged
- API keys should be kept secure and not exposed in client-side code

---

## Next Steps

1. **Jeff to provide:**
   - Webhook endpoint URL for onboarding data
   - API key for onboarding webhook authentication
   - API key for task status webhook authentication

2. **We will:**
   - Configure the environment variables
   - Test the integration
   - Monitor initial webhook traffic

---

## Questions or Issues?

Contact Josh Copp at 913.526.5281 or through the development team.
