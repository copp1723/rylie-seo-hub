# SEOWorks Webhook Testing

This endpoint is for testing the SEOWorks webhook integration.

## Test Payload Examples

### 1. New Format with Deliverables Array

```json
{
  "eventType": "task.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "externalId": "seo-task-123",
    "taskType": "blog",
    "status": "completed",
    "assignedTo": "writer@example.com",
    "completionDate": "2024-01-15T10:30:00Z",
    "deliverables": [
      {
        "type": "blog_post",
        "url": "https://example.com/blog/seo-best-practices",
        "title": "10 SEO Best Practices for 2024",
        "description": "Comprehensive guide on modern SEO techniques"
      }
    ],
    "actualHours": 4.5,
    "qualityScore": 5
  }
}
```

### 2. Old Format (Backward Compatibility)

```json
{
  "eventType": "task.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "externalId": "seo-task-124",
    "taskType": "page",
    "status": "completed",
    "postTitle": "About Us - SEO Optimized",
    "postUrl": "https://example.com/about",
    "completionNotes": "Page optimized with target keywords"
  }
}
```

### 3. Testing Different Task Types

- **Blog**: Content Creation category
- **Page**: Content Creation category
- **GBP**: Local SEO category
- **Maintenance**: Technical SEO category
- **SEO**: SEO Optimization category
- **SEO Audit**: SEO Audit category

## Using the Test Endpoint

1. POST to `/api/seoworks/test-webhook` with any of the above payloads
2. The endpoint will forward the request to the actual webhook
3. Check the response for extracted data
4. Verify data in database and audit logs

## Headers

For testing in development:
```
x-api-key: test-api-key
Content-Type: application/json
```

For production testing:
```
x-api-key: [Your actual API key]
Content-Type: application/json
```