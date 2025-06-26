# Onboarding JSON Format Specification

## Overview

When a dealership completes the onboarding form and hits submit, the following JSON object will be sent to your webhook endpoint.

## JSON Structure

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
  "siteAccessNotes": "WordPress admin access will be provided via email. Contact IT department for server access.",
  "targetVehicleModels": "Toyota Camry;Toyota RAV4;Toyota Highlander;Lexus RX350",
  "targetCities": "Austin;Round Rock;Cedar Park;Georgetown;Pflugerville",
  "targetDealers": "Competitor Auto Group;City Motors;Premier Toyota of Downtown"
}
```

## Field Descriptions

### Required Fields

- `timestamp`: ISO 8601 datetime when the form was submitted
- `businessName`: The dealership's business name
- `package`: One of: `"SILVER"`, `"GOLD"`, `"PLATINUM"`
- `mainBrand`: Primary vehicle brand (e.g., Toyota, Ford, BMW)
- `address`: Street address
- `city`: City name
- `state`: State code (2 letters)
- `zipCode`: ZIP code
- `contactName`: Primary contact person's full name
- `contactTitle`: Contact person's job title
- `email`: Contact person's email address
- `phone`: Contact person's phone number
- `websiteUrl`: Dealership's website URL
- `billingEmail`: Email address for billing communications

### Optional Fields

- `otherBrand`: Additional brand if dealership sells multiple brands
- `siteAccessNotes`: Special instructions for accessing the website

### Semicolon-Delimited Fields (minimum 3 items each)

- `targetVehicleModels`: Semicolon-delimited string of vehicle models to target for SEO
- `targetCities`: Semicolon-delimited string of cities to target for local SEO
- `targetDealers`: Semicolon-delimited string of competitor dealerships to monitor

**Format**: `"Item1;Item2;Item3;Item4"`

## Webhook Configuration

### Endpoint
```
POST [your-webhook-url]
```

### Headers
```
Content-Type: application/json
x-api-key: [your-api-key]
```

### Response

Expected success response:
```json
{
  "success": true,
  "message": "Onboarding received",
  "referenceId": "optional-reference-id"
}
```

Error response:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Example cURL

```bash
curl -X POST https://your-webhook-endpoint.com/onboarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "timestamp": "2024-03-15T10:30:00Z",
    "businessName": "Example Dealership",
    "package": "GOLD",
    "mainBrand": "Toyota",
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
    "siteAccessNotes": "WordPress admin",
    "targetVehicleModels": "Camry;RAV4;Highlander",
    "targetCities": "Austin;Round Rock;Cedar Park",
    "targetDealers": "Competitor Auto;City Motors;Premier Toyota"
  }'
```
