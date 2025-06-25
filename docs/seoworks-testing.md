# SEO Works Integration Testing Guide

## Quick Start

This guide helps you test the SEO Works webhook integration in the Rylie SEO Hub.

### 1. Enable Mock Mode

For local development without SEO Works API access:

```bash
# In your .env file, comment out or remove:
# SEOWORKS_API_KEY="..."

# Or explicitly enable mock mode:
SEOWORKS_MOCK_MODE="true"
```

### 2. Test Webhook Info

Check the webhook endpoint status:

```bash
curl http://localhost:3001/api/seoworks/webhook
```

Expected response:
```json
{
  "success": true,
  "endpoint": "/api/seoworks/webhook",
  "status": "ready",
  "mode": "mock",
  "authentication": {
    "mode": "mock",
    "info": "Mock mode enabled - using test authentication"
  }
}
```

### 3. Get Test Information

View available test scenarios and sample orders:

```bash
curl http://localhost:3001/api/seoworks/test
```

### 4. Simulate Webhook Events

#### Task Created
```bash
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id",
    "eventType": "task.created",
    "status": "pending"
  }'
```

#### Task In Progress
```bash
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id",
    "eventType": "task.updated",
    "status": "in_progress"
  }'
```

#### Task Completed
```bash
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id",
    "eventType": "task.completed",
    "status": "completed"
  }'
```

### 5. Verify Integration

After sending test webhooks:

1. Check the order status in the UI
2. View deliverables for completed tasks
3. Check audit logs for webhook events

## Production Testing

For production webhook testing with actual SEO Works:

1. Set up environment variables:
   ```bash
   SEOWORKS_API_KEY="your-production-key"
   SEOWORKS_WEBHOOK_SECRET="your-webhook-secret"
   ```

2. Configure SEO Works webhook URL:
   ```
   https://your-domain.com/api/seoworks/webhook
   ```

3. SEO Works will send webhooks with proper signatures

## Troubleshooting

### Webhook Not Processing

1. Check environment variables are set correctly
2. Verify webhook signature if in production mode
3. Check application logs for errors

### Order Not Updating

1. Ensure order exists with the provided ID
2. Check if SEO Works task is linked to order
3. Verify webhook payload matches expected schema

### Mock Mode Issues

1. Confirm `SEOWORKS_API_KEY` is not set
2. Check logs for "Mock mode" messages
3. Try explicitly setting `SEOWORKS_MOCK_MODE="true"`

## Test Scenarios

### Complete Order Lifecycle

```bash
# 1. Create an order through the UI or API
# Note the order ID

# 2. Simulate task creation
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_ID", "eventType": "task.created", "status": "pending"}'

# 3. Update to in progress
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_ID", "eventType": "task.updated", "status": "in_progress"}'

# 4. Complete with deliverables
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_ID", "eventType": "task.completed", "status": "completed"}'
```

### Test Cancellation

```bash
curl -X POST http://localhost:3001/api/seoworks/test \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "eventType": "task.cancelled",
    "status": "cancelled"
  }'
```

## Viewing Results

1. **UI**: Navigate to Orders page to see status updates
2. **Database**: Check `SEOWorksTask` and `Order` tables
3. **Audit Logs**: View webhook events in `AuditLog` table

## Running Automated Tests

```bash
# Run all SEO Works tests
npm test -- seoworks

# Run specific test file
npm test -- src/app/api/seoworks/webhook/route.test.ts

# Run with coverage
npm test -- --coverage seoworks
```