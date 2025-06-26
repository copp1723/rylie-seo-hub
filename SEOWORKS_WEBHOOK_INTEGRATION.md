# SEOWorks Webhook Integration

## Overview

The Rylie SEO Hub accepts webhooks from SEOWorks to track task completion and status updates.

## Webhook Endpoint

```
POST https://rylie-seo-hub.onrender.com/api/seoworks/webhook
```

## Authentication

The webhook uses a simple API key authentication. Include the API key in the request header:

```
x-api-key: [your-webhook-secret]
```

The API key should be provided by the Rylie SEO Hub team and kept secure.

## Request Format

### Headers

```
Content-Type: application/json
x-api-key: [your-webhook-secret]
```

### Body

Send a JSON payload with the following structure:

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

## Field Descriptions

### Required Fields

- `eventType`: One of: `task.created`, `task.updated`, `task.completed`, `task.cancelled`
- `timestamp`: ISO 8601 datetime when the event occurred
- `data.externalId`: Unique identifier for the task from SEOWorks
- `data.taskType`: One of: `blog`, `page`, `gbp`, `maintenance`, `seo`, `seo_audit`
- `data.status`: One of: `pending`, `in_progress`, `completed`, `cancelled`

### Optional Fields

- `data.assignedTo`: Email of the assigned team member
- `data.completionDate`: ISO 8601 datetime when the task was completed
- `data.deliverables`: Array of deliverable objects
  - `type`: Type of deliverable (e.g., "blog_post", "audit_report")
  - `url`: URL where the deliverable can be accessed
  - `title`: Title of the deliverable
  - `description`: Brief description
- `data.completionNotes`: Additional notes about the completion
- `data.actualHours`: Actual hours spent on the task
- `data.qualityScore`: Quality rating from 1-5

## Response

### Success Response (200 OK or 201 Created)

```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": "internal-task-id",
    "externalId": "task-123",
    "status": "completed",
    "completedAt": "2024-03-15T10:30:00Z"
  }
}
```

### Error Response (400 Bad Request, 401 Unauthorized, etc.)

```json
{
  "error": "Error type",
  "details": "Detailed error message"
}
```

## Testing

A test endpoint is available to verify webhook connectivity:

```
GET https://rylie-seo-hub.onrender.com/api/seoworks/webhook
```

Include the API key in the header:

```
x-api-key: [your-webhook-secret]
```

This will return information about the webhook configuration and expected format.

## Example cURL Commands

### Send a task completion webhook:

```bash
curl -X POST https://rylie-seo-hub.onrender.com/api/seoworks/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-secret" \
  -d '{
    "eventType": "task.completed",
    "timestamp": "2024-03-15T10:30:00Z",
    "data": {
      "externalId": "task-123",
      "taskType": "blog",
      "status": "completed",
      "completionDate": "2024-03-15T10:30:00Z",
      "completionNotes": "Blog post completed",
      "deliverables": [{
        "type": "blog_post",
        "url": "https://example.com/blog/post",
        "title": "SEO Best Practices",
        "description": "Guide to modern SEO"
      }],
      "actualHours": 5,
      "qualityScore": 5
    }
  }'
```

### Test webhook connectivity:

```bash
curl -X GET https://rylie-seo-hub.onrender.com/api/seoworks/webhook \
  -H "x-api-key: your-webhook-secret"
```

## Security Notes

- The API key should be kept secure and not exposed in client-side code
- All webhook requests must use HTTPS
- The API key uses timing-safe comparison to prevent timing attacks
- Failed authentication attempts are logged for security monitoring

## Contact

For API key generation or any integration questions, please contact the Rylie SEO Hub development team.
