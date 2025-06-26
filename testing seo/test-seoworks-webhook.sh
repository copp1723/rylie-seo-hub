#!/bin/bash

# SEO Works Webhook Testing Script for Rylie SEO Hub
# Usage: ./test-seoworks-webhook.sh <order-id>

if [ -z "$1" ]; then
    echo "Usage: $0 <order-id>"
    echo "Example: $0 12345"
    exit 1
fi

ORDER_ID=$1
API_URL="https://rylie-seo-hub.onrender.com/api/seoworks/webhook"
SIGNATURE="sha256=test-signature"

echo "Testing SEO Works Webhook Integration for Order ID: $ORDER_ID"
echo "=================================================="

# Test 1: Update order to in_progress
echo -e "\n1. Testing UPDATE to in_progress status..."
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-seoworks-signature: $SIGNATURE" \
  -d "{
    \"eventType\": \"task.updated\",
    \"taskId\": \"test-seoworks-123\",
    \"orderId\": \"$ORDER_ID\",
    \"status\": \"in_progress\",
    \"assignedTo\": \"test@seoworks.com\"
  }")

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | head -n -1)

echo "Response Code: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Update successful!"
else
    echo "❌ Update failed!"
fi

# Wait a bit before next test
echo -e "\nWaiting 2 seconds before completion test..."
sleep 2

# Test 2: Complete the order
echo -e "\n2. Testing COMPLETION status..."
COMPLETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-seoworks-signature: $SIGNATURE" \
  -d "{
    \"eventType\": \"task.completed\",
    \"taskId\": \"test-seoworks-123\",
    \"orderId\": \"$ORDER_ID\",
    \"status\": \"completed\",
    \"completedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"deliverables\": {
      \"post_title\": \"Essential Summer Car Maintenance Tips\",
      \"post_url\": \"https://example-dealer.com/blog/summer-maintenance\",
      \"word_count\": 523
    },
    \"completionNotes\": \"Blog post completed and published\"
  }")

HTTP_CODE=$(echo "$COMPLETE_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$COMPLETE_RESPONSE" | head -n -1)

echo "Response Code: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Completion successful!"
else
    echo "❌ Completion failed!"
fi

# Test 3: Invalid signature test
echo -e "\n3. Testing INVALID signature (should fail)..."
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-seoworks-signature: invalid-signature" \
  -d "{
    \"eventType\": \"task.updated\",
    \"taskId\": \"test-invalid\",
    \"orderId\": \"$ORDER_ID\",
    \"status\": \"pending\"
  }")

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$INVALID_RESPONSE" | head -n -1)

echo "Response Code: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✅ Invalid signature properly rejected!"
else
    echo "⚠️  Warning: Invalid signature not rejected (expected 401/403)"
fi

echo -e "\n=================================================="
echo "Webhook testing complete!"
echo "Please verify order status in the UI at: https://rylie-seo-hub.onrender.com/orders"