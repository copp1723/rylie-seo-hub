#!/bin/bash

# Pre-deployment checks script
# Run this before deploying to catch common issues

set -e

echo "🔍 Running pre-deployment checks..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any checks fail
FAILED=0

# Function to check a condition
check() {
    local description=$1
    local command=$2
    
    echo -n "Checking $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check file exists
check_file() {
    local description=$1
    local file=$2
    
    echo -n "Checking $description... "
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} (missing: $file)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check string in file
check_string_in_file() {
    local description=$1
    local file=$2
    local string=$3
    
    echo -n "Checking $description... "
    
    if grep -q "$string" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} (not found in $file)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "1️⃣  Checking environment setup..."
check_file "package.json exists" "package.json"
check_file ".env.example exists" ".env.example"
check_file "next.config.js exists" "next.config.js"

echo ""
echo "2️⃣  Checking critical features..."
check_string_in_file "requests terminology hardcoded" "src/lib/feature-flags.ts" "USE_REQUESTS_TERMINOLOGY: true"
check_file "chat page exists" "src/app/chat/page.tsx"
check_file "GA4 settings page exists" "src/app/settings/ga4/page.tsx"

echo ""
echo "3️⃣  Checking dependencies..."
check "Node.js installed" "node --version"
check "npm installed" "npm --version"
check "dependencies installed" "[ -d 'node_modules' ]"

echo ""
echo "4️⃣  Checking build..."
echo -n "Running TypeScript check... "
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} (TypeScript errors found)"
fi

echo -n "Running linter... "
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} (Linting warnings found)"
fi

echo ""
echo "5️⃣  Checking database..."
check_file "Prisma schema exists" "prisma/schema.prisma"

echo ""
echo "6️⃣  Checking API routes..."
check_file "auth API exists" "src/app/api/auth/[...nextauth]/route.ts"
check_file "orders API exists" "src/app/api/orders/route.ts"

echo ""
echo "7️⃣  Security checks..."
echo -n "Checking for hardcoded secrets... "
if grep -r "sk-\|key-\|secret-" src/ --exclude-dir=node_modules 2>/dev/null | grep -v "NEXTAUTH_SECRET\|SECRET_KEY\|test-secret" > /dev/null; then
    echo -e "${RED}✗${NC} (potential secrets found)"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓${NC}"
fi

echo -n "Checking for console.log statements... "
LOG_COUNT=$(grep -r "console\.log" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ "$LOG_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}⚠${NC} ($LOG_COUNT console.log statements found)"
else
    echo -e "${GREEN}✓${NC} ($LOG_COUNT console.log statements)"
fi

echo ""
echo "8️⃣  Git checks..."
check "on main branch" "[ '$(git branch --show-current)' = 'main' ]"
echo -n "Checking for uncommitted changes... "
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠${NC} (uncommitted changes found)"
else
    echo -e "${GREEN}✓${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo "Ready for deployment 🚀"
    exit 0
else
    echo -e "${RED}❌ $FAILED critical checks failed!${NC}"
    echo "Please fix the issues before deploying."
    exit 1
fi
