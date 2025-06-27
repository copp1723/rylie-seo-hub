#!/bin/bash

# Test script for enhanced webhook data capture

API_URL="${API_URL:-http://localhost:3001}"
API_KEY="${SEOWORKS_API_KEY:-test-api-key}"

echo "Testing SEOWorks Enhanced Webhook Data Capture"
echo "============================================="
echo "API URL: $API_URL"
echo ""

# Test 1: New format with deliverables array
echo "Test 1: New format with deliverables array"
echo "-----------------------------------------"
curl -X POST "$API_URL/api/seoworks/test-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "enhanced-test-'$(date +%s)'",
    "taskType": "blog",
    "completionNotes": "Blog post completed with full SEO optimization",
    "deliverables": [
      {
        "type": "blog_post",
        "url": "https://example.com/blog/seo-guide-2024",
        "title": "Complete SEO Guide for Automotive Dealerships 2024",
        "description": "Comprehensive guide covering local SEO, content optimization, and Google My Business"
      },
      {
        "type": "meta_description",
        "url": "https://example.com/blog/seo-guide-2024",
        "title": "Meta: SEO Guide for Car Dealerships | 2024 Best Practices",
        "description": "160 character meta description optimized for search"
      }
    ],
    "actualHours": 8.5,
    "qualityScore": 5
  }' | jq '.'

echo ""
echo ""

# Test 2: Different task type (GBP)
echo "Test 2: Google Business Profile task"
echo "------------------------------------"
curl -X POST "$API_URL/api/seoworks/test-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "gbp-test-'$(date +%s)'",
    "taskType": "gbp",
    "completionNotes": "Google Business Profile post published",
    "deliverables": [
      {
        "type": "gbp_post",
        "url": "https://posts.gle/example123",
        "title": "Special Holiday Offers at Our Dealership",
        "description": "GBP post highlighting seasonal promotions"
      }
    ],
    "actualHours": 1.5,
    "qualityScore": 4
  }' | jq '.'

echo ""
echo ""

# Test 3: Old format (backward compatibility)
echo "Test 3: Old format (backward compatibility)"
echo "------------------------------------------"
curl -X POST "$API_URL/api/seoworks/webhook" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "eventType": "task.completed",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "data": {
      "externalId": "legacy-test-'$(date +%s)'",
      "taskType": "page",
      "status": "completed",
      "postTitle": "About Us - Legacy Format",
      "postUrl": "https://example.com/about",
      "completionNotes": "Page optimized using legacy format"
    }
  }' | jq '.'

echo ""
echo ""

# Test 4: Check webhook info endpoint
echo "Test 4: Webhook info endpoint"
echo "-----------------------------"
curl -X GET "$API_URL/api/seoworks/webhook" \
  -H "x-api-key: $API_KEY" | jq '.'

echo ""
echo "Tests completed!"