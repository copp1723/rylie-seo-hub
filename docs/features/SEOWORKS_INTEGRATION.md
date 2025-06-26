# SEO Works Integration Documentation

## Overview

The SEO Works integration provides a seamless connection between the Rylie SEO Hub platform and SEO Works' backend services. This integration maintains the "walled garden" architecture where agencies never see that SEO Works is the actual service provider.

## Architecture

```
Dealership → Agency Platform (Rylie) → SEO Works API
                    ↑                      ↓
                    └──── Webhook Updates ←┘
```

## Key Components

### 1. SEO Works Client (`/src/lib/seoworks/client.ts`)
- Handles all outbound API calls to SEO Works
- Implements retry logic with exponential backoff
- Provides mock mode for development/testing
- Abstracts SEO Works identity from responses

### 2. Order Queue System (`/src/lib/seoworks/queue.ts`)
- Manages reliable order processing
- Handles failures with automatic retries
- Maintains order status in local database
- Processes orders asynchronously

### 3. Webhook Receiver (`/src/app/api/seoworks/webhook/route.ts`)
- Receives status updates from SEO Works
- Validates webhook signatures for security
- Updates local order status
- Sends notifications to users

### 4. API Endpoints

#### Order Management
- `POST /api/orders` - Creates order and queues for SEO Works
- `GET /api/orders` - Lists all orders with current status
- `GET /api/orders/[id]` - Get specific order details
- `PATCH /api/orders/[id]` - Update order (priority, etc.)
- `DELETE /api/orders/[id]` - Soft delete order

#### Order Messages
- `GET /api/orders/[id]/messages` - Get order communication
- `POST /api/orders/[id]/messages` - Add comment to order

#### SEO Works Integration
- `POST /api/seoworks/webhook` - Receives updates from SEO Works
- `GET /api/seoworks/queue` - Monitor queue status
- `POST /api/seoworks/queue` - Manually trigger queue processing
- `GET /api/seoworks/test` - Test webhook documentation
- `POST /api/seoworks/test` - Simulate SEO Works webhooks

## Configuration

### Environment Variables

```bash
# SEO Works API Configuration
SEOWORKS_API_URL=https://api.seoworks.com/v1
SEOWORKS_API_KEY=your-api-key-here
SEOWORKS_WEBHOOK_SECRET=shared-secret-for-webhooks
```

### Webhook Configuration

Configure SEO Works to send webhooks to:
```
https://your-domain.com/api/seoworks/webhook
```

Include the signature header:
```
x-seoworks-signature: <HMAC-SHA256 signature>
```

## Data Flow

### 1. Order Creation
```javascript
// When user creates order
1. Order saved to database with status='pending'
2. Order queued for SEO Works processing
3. Initial status message added
4. User sees immediate confirmation
```

### 2. Sending to SEO Works
```javascript
// Queue processor sends to SEO Works
1. Fetch order details and agency info
2. Transform data to SEO Works format
3. Send via API with retry logic
4. Store SEO Works task ID
5. Update order status to 'in_progress'
```

### 3. Receiving Updates
```javascript
// Webhook receives update from SEO Works
1. Validate webhook signature
2. Find order by SEO Works task ID
3. Update order status and details
4. Add status message for user
5. Send email notification (if enabled)
```

## Testing

### 1. Mock Mode
When `SEOWORKS_API_KEY` is not set, the client operates in mock mode:
- Returns simulated responses
- Logs all operations
- Perfect for development

### 2. Test Webhooks
Use the test endpoint to simulate SEO Works webhooks:

```bash
# Mark order as in progress
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id",
    "eventType": "task.updated",
    "status": "in_progress"
  }'

# Complete an order
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id",
    "eventType": "task.completed",
    "status": "completed"
  }'
```

### 3. Queue Monitoring
Check queue status:
```bash
curl http://localhost:3001/api/seoworks/queue
```

Manually process queue:
```bash
curl -X POST http://localhost:3001/api/seoworks/queue
```

## Security Considerations

### 1. Webhook Validation
- All webhooks must include valid HMAC-SHA256 signature
- Signatures use timing-safe comparison
- Invalid signatures are logged and rejected

### 2. Data Sanitization
- All SEO Works references removed from user-facing content
- Internal IDs never exposed to agencies
- Error messages sanitized

### 3. Rate Limiting
- API calls implement exponential backoff
- Maximum retry attempts configured
- Failed orders marked for manual review

## Troubleshooting

### Common Issues

1. **Orders stuck in 'pending'**
   - Check if `SEOWORKS_API_KEY` is configured
   - Verify queue is processing: `GET /api/seoworks/queue`
   - Check logs for API errors

2. **Webhooks not received**
   - Verify `SEOWORKS_WEBHOOK_SECRET` matches
   - Check webhook URL is accessible
   - Review webhook logs

3. **Orders failing repeatedly**
   - Check API credentials are valid
   - Verify order data is complete
   - Review error messages in queue status

### Debug Logging

Enable debug logging by setting:
```javascript
logger.level = 'debug'
```

Key log entries to monitor:
- `"Order queued for SEO Works"`
- `"Successfully created task in SEO Works"`
- `"SEO Works webhook processed"`
- `"Failed to create task in SEO Works"`

## Maintenance

### Regular Tasks

1. **Monitor Queue Health**
   - Check for stuck orders daily
   - Review failed orders weekly
   - Clear old completed orders monthly

2. **Update API Integration**
   - Test webhook endpoint monthly
   - Verify API compatibility quarterly
   - Review security measures annually

3. **Performance Optimization**
   - Monitor API response times
   - Optimize database queries
   - Review retry logic effectiveness

## Future Enhancements

1. **Bulk Operations**
   - Batch multiple orders in single API call
   - Bulk status updates
   - Mass order cancellation

2. **Advanced Features**
   - Priority queue lanes
   - Estimated completion predictions
   - Auto-escalation for delayed orders

3. **Enhanced Monitoring**
   - Real-time queue dashboard
   - Webhook delivery metrics
   - API performance analytics

---

For additional support or to report issues with the SEO Works integration, please contact the development team.