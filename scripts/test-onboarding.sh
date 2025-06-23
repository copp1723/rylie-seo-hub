#!/bin/bash

# Test Script for Dealership Onboarding Feature
# This script tests the API endpoints to ensure they're working correctly

echo "🧪 Testing Dealership Onboarding Implementation"
echo "==============================================="

# Set the base URL (modify for your environment)
BASE_URL="http://localhost:3001"
if [ ! -z "$1" ]; then
    BASE_URL="$1"
fi

echo "🌐 Testing against: $BASE_URL"
echo ""

# Test 1: Check if onboarding page loads
echo "1️⃣ Testing onboarding page accessibility..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/onboarding")
if [ $response -eq 200 ]; then
    echo "✅ Onboarding page loads successfully (HTTP $response)"
else
    echo "❌ Onboarding page failed to load (HTTP $response)"
fi

# Test 2: Check if status page loads
echo "2️⃣ Testing onboarding status page..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/onboarding/status")
if [ $response -eq 200 ]; then
    echo "✅ Onboarding status page loads successfully (HTTP $response)"
else
    echo "❌ Onboarding status page failed to load (HTTP $response)"
fi

# Test 3: Check API endpoint (should require auth)
echo "3️⃣ Testing onboarding API endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/onboarding")
if [ $response -eq 401 ]; then
    echo "✅ API properly requires authentication (HTTP $response)"
elif [ $response -eq 200 ]; then
    echo "⚠️  API accessible without auth - check authentication"
else
    echo "❌ API endpoint error (HTTP $response)"
fi

# Test 4: Check if dashboard includes onboarding
echo "4️⃣ Testing dashboard integration..."
response=$(curl -s "$BASE_URL/dashboard" | grep -i "onboarding")
if [ $? -eq 0 ]; then
    echo "✅ Dashboard includes onboarding references"
else
    echo "❌ Dashboard missing onboarding integration"
fi

echo ""
echo "🔍 Additional Manual Tests Required:"
echo "   1. Log in and test form submission"
echo "   2. Verify data saves to database"
echo "   3. Check SEOWerks integration"
echo "   4. Test validation messages"
echo "   5. Verify responsive design"

echo ""
echo "📋 Quick Checklist:"
echo "   □ Database migrations applied"
echo "   □ Prisma client generated"
echo "   □ Environment variables set"
echo "   □ All pages load without errors"
echo "   □ Form validation works"
echo "   □ API endpoints secured"
echo "   □ Dashboard navigation updated"

echo ""
echo "🚀 If all tests pass, the onboarding feature is ready for use!"
