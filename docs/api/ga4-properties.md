# GA4 Properties Endpoint Documentation

## Overview
The GA4 Properties endpoint fetches a list of Google Analytics 4 properties accessible to the authenticated user using their stored OAuth tokens and the Google Analytics Admin API.

## Endpoint Details

**URL:** `/api/ga4/properties`  
**Method:** `GET`  
**Authentication:** Required (uses NextAuth session)

## Response Format

### Success Response (200 OK)
```json
{
  "properties": [
    {
      "accountName": "My Company",
      "accountId": "123456789",
      "propertyName": "Company Website",
      "propertyId": "987654321",
      "measurementId": "G-XXXXXXXXXX"
    }
  ],
  "count": 1
}
```

### Error Responses

#### No GA4 Token (401 Unauthorized)
```json
{
  "error": "No GA4 access token found. Please connect your GA4 account first.",
  "code": "NO_GA4_TOKEN"
}
```

#### Insufficient Permissions (403 Forbidden)
```json
{
  "error": "Insufficient permissions. Please reconnect your GA4 account with analytics permissions.",
  "code": "INSUFFICIENT_SCOPE"
}
```

#### Expired Authentication (401 Unauthorized)
```json
{
  "error": "Authentication expired. Please reconnect your GA4 account.",
  "code": "AUTH_EXPIRED"
}
```

#### Rate Limit Exceeded (429 Too Many Requests)
```json
{
  "error": "API rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT"
}
```

#### Generic Error (500 Internal Server Error)
```json
{
  "error": "Failed to fetch GA4 properties. Please try again.",
  "code": "FETCH_FAILED"
}
```

## Implementation Details

### Files Structure
- **Route Handler:** `/src/app/api/ga4/properties/route.ts`
- **GA4 Service:** `/src/lib/ga4/service.ts`
- **Token Management:** `/src/lib/ga4/tokens.ts`
- **Audit Logging:** `/src/lib/audit.ts`

### Key Features
1. **OAuth Token Management**: Uses encrypted user-specific OAuth tokens
2. **Automatic Token Refresh**: Handles token expiration automatically
3. **Comprehensive Error Handling**: Specific error codes for different scenarios
4. **Audit Logging**: All operations are logged for security and debugging
5. **Google Analytics Admin API**: Uses the official GA4 Admin API v1alpha
6. **Measurement ID Retrieval**: Fetches web data streams to get measurement IDs

### Security Considerations
- User authentication required via NextAuth
- OAuth tokens are encrypted in the database
- All operations are logged in the audit trail
- Token decryption errors are handled gracefully
- Rate limiting is respected

### Usage Example

```typescript
// Frontend usage with fetch
const response = await fetch('/api/ga4/properties', {
  method: 'GET',
  credentials: 'include', // Include session cookies
})

if (response.ok) {
  const { properties } = await response.json()
  console.log('Available properties:', properties)
} else {
  const error = await response.json()
  console.error('Error:', error.message)
}
```

### Testing
A test script is available at `/scripts/test-ga4-properties.ts`:

```bash
npm run tsx scripts/test-ga4-properties.ts
```

Note: You must be authenticated with valid GA4 tokens to test the endpoint successfully.