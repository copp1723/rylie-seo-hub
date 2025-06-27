# Report Failure Recovery System Documentation

## Overview
The Report Failure Recovery System provides comprehensive error handling, alerting, and retry logic for scheduled GA4 reports. It ensures reliability and provides administrators with tools to manage failed reports effectively.

## Architecture

### Database Schema

#### ReportSchedule Table
- **Failure Tracking Fields:**
  - `consecutiveFailures`: Count of consecutive execution failures
  - `lastFailureAt`: Timestamp of the most recent failure
  - `lastSuccessAt`: Timestamp of the most recent success
  - `isPaused`: Boolean indicating if schedule is paused
  - `pausedReason`: Reason for pausing (manual or automatic)
  - `lastExecutionId`: Reference to the most recent execution

#### ReportExecutionHistory Table
- **Execution Tracking:**
  - `status`: pending, running, completed, failed, retrying
  - `attemptCount`: Number of retry attempts
  - `error`: Error message text
  - `errorCode`: Structured error code for categorization
  - `retryAfter`: Timestamp for next retry attempt
  - `metadata`: JSON field for additional context

## Error Classification

### Error Codes
```typescript
enum ExecutionErrorCode {
  OAUTH_EXPIRED = 'OAUTH_EXPIRED',          // User needs to re-authenticate
  OAUTH_INVALID = 'OAUTH_INVALID',          // Invalid OAuth tokens
  API_RATE_LIMIT = 'API_RATE_LIMIT',        // GA4 API rate limit hit
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED', // GA4 API quota exceeded
  PROPERTY_ACCESS_DENIED = 'PROPERTY_ACCESS_DENIED', // No access to GA4 property
  GENERATION_FAILED = 'GENERATION_FAILED',   // PDF generation error
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',   // Email delivery failure
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'           // Unclassified errors
}
```

### Critical vs. Transient Errors
- **Critical Errors** (require user intervention):
  - `OAUTH_EXPIRED`
  - `OAUTH_INVALID`
  - `PROPERTY_ACCESS_DENIED`

- **Transient Errors** (can be retried):
  - `API_RATE_LIMIT`
  - `EMAIL_SEND_FAILED`
  - `GENERATION_FAILED`
  - `UNKNOWN_ERROR`

## Retry Logic

### Automatic Retry
- **Max Attempts**: 3
- **Backoff Strategy**: Exponential backoff starting at 5 minutes
  - Attempt 1: 5 minutes
  - Attempt 2: 10 minutes
  - Attempt 3: 20 minutes

### Retry Conditions
- Only transient errors are automatically retried
- Critical errors require manual intervention
- Retries are skipped if schedule is paused

### Retry Process
1. Failed execution is marked with `retryAfter` timestamp
2. Background scheduler checks for ready retries every 5 minutes
3. New execution record is created for each retry attempt
4. Original failure context is preserved in metadata

## Failure Escalation

### Automatic Schedule Pausing
- Schedules are automatically paused after 5 consecutive failures
- Prevents resource waste and alert fatigue
- Requires manual intervention to resume

### Alert System
Alerts are sent to agency administrators when:
- Critical errors occur (OAuth, access denied)
- Schedule is automatically paused
- Manual intervention is required

### Alert Content
- Error type and message
- Affected schedule details
- Action required
- Direct links to admin interface

## Admin Interface

### Failed Reports Dashboard
Located at `/admin/reports/failed`

Features:
- List of all failed executions
- Filterable by agency, status, error type
- Expandable rows showing error details
- One-click retry functionality
- Pause/resume schedule controls

### Manual Actions

#### Retry Failed Report
```bash
POST /api/reports/retry/{executionId}
```
- Creates new execution with incremented attempt count
- Preserves failure context
- Automatically resumes paused schedules

#### Pause Schedule
```bash
POST /api/reports/schedules/{id}/pause
```
- Immediately stops scheduled execution
- Accepts optional reason for audit trail
- Prevents automatic retries

#### Resume Schedule
```bash
DELETE /api/reports/schedules/{id}/pause
```
- Reactivates paused schedule
- Resets consecutive failure count
- Resumes normal execution pattern

## API Endpoints

### Get Failed Reports
```typescript
GET /api/reports/failed?status=failed&limit=20&offset=0

Response:
{
  executions: [{
    id: string,
    scheduleId: string,
    status: string,
    attemptCount: number,
    failedAt: string,
    error: string,
    errorCode: string,
    canRetry: boolean,
    schedule: {
      reportType: string,
      ga4PropertyId: string,
      isPaused: boolean,
      user: { email: string },
      agency: { name: string }
    }
  }],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

### Retry Execution
```typescript
POST /api/reports/retry/{executionId}

Response:
{
  success: boolean,
  executionId: string,
  message: string,
  error?: string,
  errorCode?: string
}
```

### Pause/Resume Schedule
```typescript
// Pause
POST /api/reports/schedules/{id}/pause
Body: { reason?: string }

// Resume
DELETE /api/reports/schedules/{id}/pause

Response:
{
  success: boolean,
  schedule: ReportSchedule
}
```

## Background Services

### ReportScheduler Service
- Manages cron-based report execution
- Handles retry checking every 5 minutes
- Cleans up old execution history (>90 days)
- Graceful shutdown on SIGTERM/SIGINT

### ReportExecutor Service
- Executes individual report generation
- Handles error classification
- Manages retry logic
- Sends failure alerts

## Monitoring & Observability

### Audit Logging
All actions are logged with audit events:
- `GA4_REPORT_GENERATED`: Successful generation
- `GA4_REPORT_FAILED`: Execution failure
- `GA4_REPORT_RETRY`: Manual retry initiated
- `GA4_REPORT_SCHEDULE_PAUSED`: Schedule paused
- `GA4_REPORT_SCHEDULE_RESUMED`: Schedule resumed

### Metrics to Monitor
- Failure rate by error type
- Average retry attempts
- Time to resolution
- Paused schedule count
- Alert response time

## Best Practices

### For Administrators
1. **Regular Monitoring**: Check failed reports dashboard weekly
2. **Quick Response**: Address OAuth errors immediately
3. **Pattern Recognition**: Look for recurring failures
4. **Preventive Maintenance**: Update credentials before expiry

### For Developers
1. **Error Classification**: Add specific error codes for new failure types
2. **Retry Logic**: Consider failure type when setting retry parameters
3. **Alert Fatigue**: Balance between notification frequency and urgency
4. **Resource Management**: Monitor API quotas and rate limits

## Troubleshooting Guide

### Common Issues

#### OAuth Token Expired
**Symptoms**: OAUTH_EXPIRED errors across multiple schedules
**Solution**: User needs to reconnect GA4 account via settings

#### API Rate Limits
**Symptoms**: Clustered failures during peak hours
**Solution**: Spread report schedules across different times

#### Property Access Lost
**Symptoms**: PROPERTY_ACCESS_DENIED for specific property
**Solution**: Verify GA4 property permissions haven't changed

#### Email Delivery Failures
**Symptoms**: Reports generate but emails fail
**Solution**: Check email service configuration and recipient validity

### Debug Checklist
1. Check execution history for error patterns
2. Verify user has valid GA4 tokens
3. Confirm GA4 property access
4. Test email service connectivity
5. Review recent system changes

## Migration Notes

When updating the system:
1. Run database migrations to add new columns
2. Update existing schedules with default values
3. Deploy background services with new retry logic
4. Test with intentional failures before production

## Security Considerations

- OAuth tokens are encrypted at rest
- Failed report details are agency-scoped
- Admin actions require appropriate permissions
- Audit trail maintains compliance requirements

## Future Enhancements

1. **Webhook Notifications**: Real-time failure alerts
2. **Self-Healing**: Automatic credential refresh
3. **Smart Scheduling**: ML-based optimal execution times
4. **Bulk Operations**: Retry/pause multiple schedules
5. **Custom Retry Policies**: Per-schedule retry configuration