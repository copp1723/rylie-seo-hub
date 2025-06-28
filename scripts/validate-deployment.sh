#!/bin/bash

# Deployment validation script
# Runs after deployment to verify everything is working

set -e

# Get the deployment URL from command line or use default
DEPLOYMENT_URL=${1:-"https://rylie-seo-hub.onrender.com"}

echo "🔍 Validating deployment at: $DEPLOYMENT_URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# Function to check HTTP endpoint
check_endpoint() {
    local description=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} ($status)"
        return 0
    else
        echo -e "${RED}✗${NC} (got $status, expected $expected_status)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check page content
check_content() {
    local description=$1
    local url=$2
    local search_text=$3
    
    echo -n "Checking $description... "
    
    if curl -s "$url" | grep -q "$search_text" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} (content not found)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "1️⃣  Checking core pages..."
check_endpoint "Homepage" "$DEPLOYMENT_URL" 200
check_endpoint "Auth page" "$DEPLOYMENT_URL/auth/signin" 200
check_endpoint "Dashboard (redirects)" "$DEPLOYMENT_URL/dashboard" 302
check_endpoint "Requests page (redirects)" "$DEPLOYMENT_URL/requests" 302
check_endpoint "Chat page (redirects)" "$DEPLOYMENT_URL/chat" 302

echo ""
echo "2️⃣  Checking API health..."
check_endpoint "API health check" "$DEPLOYMENT_URL/api/health" 200
check_endpoint "Auth API" "$DEPLOYMENT_URL/api/auth/providers" 200

echo ""
echo "3️⃣  Checking content..."
check_content "Requests terminology" "$DEPLOYMENT_URL" "Requests"
check_content "SEO Hub branding" "$DEPLOYMENT_URL" "SEO Hub"

echo ""
echo "4️⃣  Checking static assets..."
check_endpoint "Favicon" "$DEPLOYMENT_URL/favicon.ico" 200
check_endpoint "Next.js build" "$DEPLOYMENT_URL/_next/static/css/" 404

echo ""
echo "5️⃣  Performance check..."
echo -n "Checking response time... "
response_time=$(curl -s -o /dev/null -w "%{time_total}" "$DEPLOYMENT_URL")
response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "0")

if (( $(echo "$response_time < 2" | bc -l) )); then
    echo -e "${GREEN}✓${NC} (${response_ms%.*}ms)"
else
    echo -e "${YELLOW}⚠${NC} (${response_ms%.*}ms - slow)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All deployment checks passed!${NC}"
    echo "Deployment is healthy 🎉"
    exit 0
else
    echo -e "${RED}❌ $FAILED deployment checks failed!${NC}"
    echo "Please investigate the issues."
    exit 1
fi
