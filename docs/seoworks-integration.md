# SEO Works Integration Documentation

## Overview

The SEO Works integration provides a seamless connection between Rylie SEO Hub and the SEO Works task management system. This integration supports both production and mock modes for development and testing.

## Features

- **Webhook Integration**: Receive real-time updates from SEO Works
- **Task Assignment**: Automatically assign orders to SEO Works team
- **Status Tracking**: Monitor task progress and completion
- **Mock Mode**: Full functionality without SEO Works API access
- **Secure Communication**: HMAC-SHA256 webhook signature validation

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# SEO Works API Configuration
SEOWORKS_API_URL="https://api.seoworks.com/v1"
SEOWORKS_API_KEY="your-api-key-here"
SEOWORKS_WEBHOOK_SECRET="your-webhook-secret"

# Optional: Enable mock mode explicitly
# SEOWORKS_MOCK_MODE="true"
```

### Mock Mode

Mock mode is automatically enabled when:
- `SEOWORKS_API_KEY` is not set
- `SEOWORKS_MOCK_MODE` is set to "true"

In mock mode:
- All API calls return simulated responses
- Webhook authentication is relaxed for testing
- No actual SEO Works API calls are made

## API Endpoints

### Webhook Endpoint

**POST** `/api/seoworks/webhook`

Receives task status updates from SEO Works.

**Headers:**
- `Content-Type: application/json`
- `x-seoworks-signature: <HMAC-SHA256 signature>` (production)
- `x-api-key: <api-key>` (mock mode)

**Payload Schema:**
```json
{
  "eventType": "task.created | task.updated | task.completed | task.cancelled",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "externalId": "seoworks-task-id",
    "taskType": "blog | page | gbp | maintenance | seo | seo_audit",
    "status": "pending | in_progress | completed | cancelled",
    "assignedTo": "team@seoworks.com",
    "completionDate": "2024-01-01T00:00:00Z",
    "deliverables": [
      {
        "type": "document",
        "url": "https://example.com/deliverable.pdf",
        "title": "Deliverable Title",
        "description": "Optional description"
      }
    ],
    "completionNotes": "Task completed successfully",
    "actualHours": 4.5,
    "qualityScore": 5
  }
}
```

### Test Endpoint

**GET** `/api/seoworks/test`

Returns test endpoint information and sample orders.

**POST** `/api/seoworks/test`

Simulates webhook calls for testing.

**Request Body:**
```json
{
  "orderId": "order-123",
  "eventType": "task.updated",
  "status": "in_progress"
}
```

## Integration Workflow

### 1. Task Assignment

When an order is created in Rylie SEO Hub:

```typescript
import { assignTaskToSEOWorks } from '@/lib/seoworks-integration'

const result = await assignTaskToSEOWorks(orderId)
if (result.success) {
  console.log('Task assigned:', result.seoworksTaskId)
}
```

The assignment logic considers:
- Agency package tier (PLATINUM, GOLD, SILVER)
- Task type (blog, page, gbp, etc.)
- Priority and turnaround times

### 2. Status Updates

SEO Works sends webhook notifications for:
- Task creation confirmation
- Status changes (pending → in_progress → completed)
- Task completion with deliverables
- Task cancellation

### 3. Deliverables

Completed tasks include:
- Document URLs
- Completion notes
- Actual hours worked
- Quality scores

## Testing

### Unit Tests

Run the test suite:

```bash
npm test -- seoworks
```

### Integration Testing

1. Enable mock mode (unset `SEOWORKS_API_KEY`)
2. Create a test order
3. Use the test endpoint to simulate webhooks:

```bash
# Get test information
curl http://localhost:3001/api/seoworks/test

# Simulate task update
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id",
    "eventType": "task.completed",
    "status": "completed"
  }'
```

### Webhook Testing

Test webhook signature validation:

```javascript
const crypto = require('crypto')

const payload = { /* webhook data */ }
const secret = process.env.SEOWORKS_WEBHOOK_SECRET

const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex')

// Include in request headers
headers['x-seoworks-signature'] = signature
```

## Security Considerations

1. **Webhook Validation**: Always verify signatures in production
2. **API Keys**: Store securely in environment variables
3. **Error Handling**: Sensitive information is not exposed in errors
4. **Audit Logging**: All webhook events are logged for traceability

## Troubleshooting

### Common Issues

1. **Webhook Signature Failures**
   - Verify `SEOWORKS_WEBHOOK_SECRET` matches SEO Works configuration
   - Ensure payload is not modified before signature verification

2. **Task Not Linking to Order**
   - Check that `seoworksTaskId` is set on the order
   - Verify task `externalId` matches

3. **Mock Mode Not Working**
   - Ensure `SEOWORKS_API_KEY` is not set
   - Check logs for "Mock mode" messages

### Debug Mode

Enable detailed logging:

```typescript
import { logger } from '@/lib/observability'

logger.setLevel('debug')
```

## API Client Usage

### Direct Client Usage

```typescript
import { seoWorksClient } from '@/lib/seoworks'

// Create a task
const task = await seoWorksClient.createTask({
  id: 'order-123',
  taskType: 'blog',
  title: 'Create Blog Post',
  description: 'Write about SEO best practices',
  priority: 'high',
  estimatedHours: 4,
  dealershipId: 'agency-123',
  dealershipName: 'Test Agency',
  package: 'PLATINUM'
})

// Check status
const status = await seoWorksClient.getTaskStatus('seoworks-task-id')

// Cancel task
const result = await seoWorksClient.cancelTask('seoworks-task-id', 'Reason')
```

### Custom Client Configuration

```typescript
import { SEOWorksClient } from '@/lib/seoworks'

const client = new SEOWorksClient({
  apiUrl: 'https://custom.seoworks.com/api',
  apiKey: 'custom-key',
  mockMode: false
})
```

## Package-Based Priority Rules

| Package  | Task Type    | Priority | Default Hours | Turnaround   |
|----------|--------------|----------|---------------|--------------|
| PLATINUM | blog         | high     | 4             | 2-3 days     |
| PLATINUM | page         | high     | 6             | 3-5 days     |
| PLATINUM | seo_audit    | high     | 10            | 7-10 days    |
| GOLD     | blog         | medium   | 3             | 3-5 days     |
| GOLD     | page         | medium   | 5             | 5-7 days     |
| GOLD     | seo_audit    | medium   | 8             | 10-14 days   |
| SILVER   | blog         | low      | 2             | 5-7 days     |
| SILVER   | page         | low      | 4             | 7-10 days    |
| SILVER   | seo_audit    | low      | 6             | 14-21 days   |

## Future Enhancements

- [ ] Batch task assignment
- [ ] Real-time progress tracking
- [ ] Webhook retry mechanism
- [ ] Task priority escalation
- [ ] Performance metrics dashboard