# SEO Werks API Documentation

## Overview

The SEO Werks API allows external partners to update task completion status and deliver content directly to the Rylie SEO Hub platform. All updates will appear in real-time on the dealership's Orders dashboard.

## Authentication

All API requests require authentication via an API key in the `X-API-Key` header.

```bash
curl -H "X-API-Key: your-api-key-here" https://api.rylie-seo.com/api/seoworks/...
```

## Base URL

```
https://api.rylie-seo.com/api/seoworks
```

## Endpoints

### 1. Health Check

Check API connectivity and status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-12-22T10:00:00Z",
  "service": "Rylie SEO Hub - SEO Werks API",
  "version": "1.0.0"
}
```

### 2. Complete Task

Update the status of a task and optionally attach deliverables.

**Endpoint:** `POST /tasks/complete`

**Request Body:**
```json
{
  "requestId": "clq1234567890",
  "status": "completed",
  "deliverables": [
    {
      "type": "blog_post",
      "title": "10 Tips for Winter Car Maintenance",
      "fileUrl": "https://files.seoworks.com/blog-winter-tips.pdf",
      "metadata": {
        "wordCount": 1200,
        "seoScore": 95,
        "keywords": ["winter car care", "vehicle maintenance"]
      }
    }
  ],
  "completionNotes": "Blog post created with focus on local SEO for Chicago area dealerships",
  "actualHours": 4.5,
  "qualityScore": 5
}
```

**Parameters:**
- `requestId` (required): The unique ID of the order/task
- `status` (required): One of: `pending`, `in_progress`, `completed`, `cancelled`
- `deliverables` (optional): Array of deliverable objects
- `completionNotes` (optional): Notes about the completion
- `actualHours` (optional): Actual hours spent on the task
- `qualityScore` (optional): Quality rating from 1-5

**Response:**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "order": {
    "id": "clq1234567890",
    "status": "completed",
    "completedAt": "2024-12-22T10:30:00Z",
    "actualHours": 4.5,
    "qualityScore": 5
  }
}
```

### 3. Get Task Status

Query the current status of one or more tasks.

**Endpoint:** `GET /tasks/status`

**Query Parameters:**
- `requestId` (optional): Specific order ID
- `status` (optional): Filter by status
- `taskType` (optional): Filter by task type

**Example:** `GET /tasks/status?status=in_progress&taskType=blog`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "tasks": [
    {
      "id": "clq1234567890",
      "taskType": "blog",
      "title": "Winter Car Maintenance Blog",
      "status": "in_progress",
      "requestedAt": "2024-12-20T09:00:00Z",
      "assignedTo": "john@seoworks.com",
      "estimatedHours": 4
    }
  ]
}
```

### 4. Get Task Types

Get the list of supported task types.

**Endpoint:** `GET /tasks/types`

**Response:**
```json
{
  "success": true,
  "taskTypes": [
    {
      "id": "blog",
      "name": "Blog Post",
      "description": "SEO-optimized blog post creation",
      "estimatedHours": 4
    },
    {
      "id": "page",
      "name": "Page Content",
      "description": "Website page content creation and optimization",
      "estimatedHours": 6
    },
    {
      "id": "gbp",
      "name": "Google Business Profile",
      "description": "Google Business Profile optimization",
      "estimatedHours": 3
    },
    {
      "id": "maintenance",
      "name": "Site Maintenance",
      "description": "Website maintenance and updates",
      "estimatedHours": 2
    },
    {
      "id": "seo",
      "name": "SEO Optimization",
      "description": "SEO audit, strategy, and optimization",
      "estimatedHours": 8
    }
  ]
}
```

## Deliverable Types

When submitting deliverables, use these standard types:

- `blog_post` - Blog post content
- `page_content` - Website page content
- `seo_report` - SEO audit or analysis report
- `gbp_report` - Google Business Profile optimization report
- `maintenance_log` - Site maintenance activity log
- `keyword_research` - Keyword research document
- `content_calendar` - Content planning calendar
- `performance_report` - Performance metrics report

## Example Usage

### Mark Task as In Progress

```bash
curl -X POST https://api.rylie-seo.com/api/seoworks/tasks/complete \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "clq1234567890",
    "status": "in_progress",
    "completionNotes": "Started keyword research and content outline"
  }'
```

### Complete Task with Deliverables

```bash
curl -X POST https://api.rylie-seo.com/api/seoworks/tasks/complete \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "clq1234567890",
    "status": "completed",
    "deliverables": [
      {
        "type": "blog_post",
        "title": "Ultimate Guide to Electric Vehicle Maintenance",
        "fileUrl": "https://files.seoworks.com/ev-maintenance-guide.pdf",
        "metadata": {
          "wordCount": 2500,
          "seoScore": 98
        }
      },
      {
        "type": "keyword_research",
        "title": "EV Maintenance Keywords Analysis",
        "fileUrl": "https://files.seoworks.com/ev-keywords.xlsx"
      }
    ],
    "actualHours": 6.5,
    "qualityScore": 5,
    "completionNotes": "Comprehensive guide created with local SEO optimization for Denver market"
  }'
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found (order doesn't exist)
- `500` - Internal Server Error

Error Response Format:
```json
{
  "error": "Description of the error",
  "details": "Additional context if available"
}
```

## Rate Limits

- 1000 requests per hour per API key
- 100 concurrent requests maximum

## Best Practices

1. **Always include deliverables** when marking tasks as completed
2. **Use descriptive titles** for deliverables
3. **Include metadata** when relevant (word count, SEO scores, etc.)
4. **Update status progressively** (pending → in_progress → completed)
5. **Include completion notes** for context and future reference

## Support

For API support or to request additional features, contact:
- Email: api-support@rylie-seo.com
- Documentation: https://docs.rylie-seo.com/api

## Changelog

### Version 1.0.0 (2024-12-22)
- Initial release
- Support for 5 task types
- Complete task status management
- Deliverables attachment
- Quality scoring