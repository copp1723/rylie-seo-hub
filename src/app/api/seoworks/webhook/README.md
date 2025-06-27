# SEOWorks Webhook Implementation

This webhook handler captures enhanced data from SEOWorks task updates, including the new fields added in TICKET-003.

## Enhanced Fields

The webhook now captures and stores three new fields:

1. **pageTitle** - The title of the page or content created
2. **contentUrl** - The URL where the content can be accessed
3. **taskCategory** - Auto-mapped category based on task type

## Task Category Mapping

Task types are automatically mapped to categories:

- `blog` → "Content Creation"
- `page` → "Content Creation"
- `gbp` → "Local SEO"
- `maintenance` → "Technical SEO"
- `seo` → "Optimization"
- `seo_audit` → "Analysis & Reporting"

## Backward Compatibility

The webhook maintains backward compatibility by:

1. Supporting both new field names (`pageTitle`, `contentUrl`) and legacy names (`postTitle`, `postUrl`)
2. Extracting data from deliverables if primary fields are missing
3. Gracefully handling missing fields without breaking existing functionality

## Validation

The webhook uses Zod schema validation to ensure data integrity while allowing optional enhanced fields.

## Logging

Enhanced logging includes:
- Incoming payload details
- Enhanced data extraction results
- Audit trail entries for all order updates
- Performance metrics (response time)

## Testing

Use the test endpoint to simulate webhook calls:

```bash
# Test with enhanced fields
curl -X POST http://localhost:3001/api/seoworks/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "test-123",
    "taskType": "blog",
    "pageTitle": "SEO Best Practices 2024",
    "contentUrl": "https://example.com/blog/seo-2024"
  }'
```

## Security

- API key validation using timing-safe comparison
- Environment variable: `SEOWORKS_WEBHOOK_SECRET`
- Failed authentication attempts are logged