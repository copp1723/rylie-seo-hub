#!/bin/bash

# SEO Werks API Test Script
# This script tests all endpoints of the SEO Werks API

# Configuration
API_BASE_URL="http://localhost:3000/api/seoworks"
API_KEY="your-test-api-key-here"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $2${NC}"
        ((TESTS_FAILED++))
    fi
}

echo "SEO Werks API Test Suite"
echo "========================"
echo "Testing API at: $API_BASE_URL"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" "$API_BASE_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "healthy"; then
    print_test_result 0 "Health check passed"
else
    print_test_result 1 "Health check failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 2: Get Task Types
echo -e "${YELLOW}Test 2: Get Task Types${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" "$API_BASE_URL/tasks/types")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "blog"; then
    print_test_result 0 "Task types retrieved successfully"
    echo "Available task types:"
    echo "$BODY" | jq -r '.taskTypes[].id' 2>/dev/null | sed 's/^/  - /'
else
    print_test_result 1 "Failed to get task types (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Invalid API Key
echo -e "${YELLOW}Test 3: Invalid API Key${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: invalid-key" "$API_BASE_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    print_test_result 0 "Invalid API key correctly rejected"
else
    print_test_result 1 "Invalid API key not rejected (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Update Task Status (In Progress)
echo -e "${YELLOW}Test 4: Update Task Status - In Progress${NC}"
REQUEST_ID="test-$(date +%s)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"requestId\": \"$REQUEST_ID\",
        \"status\": \"in_progress\",
        \"completionNotes\": \"Started working on the task\"
    }" \
    "$API_BASE_URL/tasks/complete")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    if [ "$HTTP_CODE" = "404" ]; then
        echo "  Note: Order not found (expected in test environment)"
    fi
    print_test_result 0 "Task update endpoint accessible"
else
    print_test_result 1 "Failed to update task (HTTP $HTTP_CODE)"
fi
echo ""

# Test 5: Complete Task with Deliverables
echo -e "${YELLOW}Test 5: Complete Task with Deliverables${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "requestId": "test-complete-123",
        "status": "completed",
        "deliverables": [
            {
                "type": "blog_post",
                "title": "Test Blog Post",
                "fileUrl": "https://example.com/test.pdf",
                "metadata": {
                    "wordCount": 1500,
                    "seoScore": 92
                }
            }
        ],
        "actualHours": 5.5,
        "qualityScore": 5
    }' \
    "$API_BASE_URL/tasks/complete")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    print_test_result 0 "Task completion endpoint accessible"
else
    print_test_result 1 "Failed to complete task (HTTP $HTTP_CODE)"
fi
echo ""

# Test 6: Query Task Status
echo -e "${YELLOW}Test 6: Query Task Status${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "X-API-Key: $API_KEY" \
    "$API_BASE_URL/tasks/status?status=pending")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_test_result 0 "Task status query successful"
else
    print_test_result 1 "Failed to query task status (HTTP $HTTP_CODE)"
fi
echo ""

# Test 7: Invalid Status Value
echo -e "${YELLOW}Test 7: Invalid Status Value${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "requestId": "test-123",
        "status": "invalid_status"
    }' \
    "$API_BASE_URL/tasks/complete")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ] && echo "$BODY" | grep -q "Invalid status"; then
    print_test_result 0 "Invalid status correctly rejected"
else
    print_test_result 1 "Invalid status not rejected (HTTP $HTTP_CODE)"
fi
echo ""

# Summary
echo "========================"
echo "Test Summary:"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi