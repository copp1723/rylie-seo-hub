#!/bin/bash
# Setup environment variables for Google OAuth

echo "======================================"
echo "Google OAuth Environment Setup"
echo "======================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "Required environment variables for Google OAuth:"
echo ""
echo "1. GOOGLE_CLIENT_ID"
echo "   - Go to: https://console.cloud.google.com/"
echo "   - Create a new project or select existing"
echo "   - Enable Google+ API"
echo "   - Create OAuth 2.0 credentials"
echo ""
echo "2. GOOGLE_CLIENT_SECRET"
echo "   - Found in the same OAuth 2.0 credentials"
echo ""
echo "3. NEXTAUTH_URL"
echo "   - Development: http://localhost:3001"
echo "   - Production: https://yourdomain.com"
echo ""
echo "4. NEXTAUTH_SECRET"
echo "   - Generate with: openssl rand -base64 32"
echo ""
echo "5. Authorized redirect URIs in Google Console:"
echo "   - http://localhost:3001/api/auth/callback/google (development)"
echo "   - https://yourdomain.com/api/auth/callback/google (production)"
echo ""

# Check current values
echo "Current configuration:"
echo "====================="

if grep -q "GOOGLE_CLIENT_ID=" .env.local 2>/dev/null; then
    if grep -q "GOOGLE_CLIENT_ID=\"your-google-client-id\"" .env.local; then
        echo "❌ GOOGLE_CLIENT_ID: Not configured (using placeholder)"
    else
        echo "✅ GOOGLE_CLIENT_ID: Configured"
    fi
else
    echo "❌ GOOGLE_CLIENT_ID: Not found in .env.local"
fi

if grep -q "GOOGLE_CLIENT_SECRET=" .env.local 2>/dev/null; then
    if grep -q "GOOGLE_CLIENT_SECRET=\"your-google-client-secret\"" .env.local; then
        echo "❌ GOOGLE_CLIENT_SECRET: Not configured (using placeholder)"
    else
        echo "✅ GOOGLE_CLIENT_SECRET: Configured"
    fi
else
    echo "❌ GOOGLE_CLIENT_SECRET: Not found in .env.local"
fi

if grep -q "NEXTAUTH_SECRET=" .env.local 2>/dev/null; then
    if grep -q "NEXTAUTH_SECRET=\"your-super-secret-nextauth-secret-key-here\"" .env.local; then
        echo "❌ NEXTAUTH_SECRET: Not configured (using placeholder)"
        echo ""
        echo "   Generate a secret with:"
        echo "   openssl rand -base64 32"
    else
        echo "✅ NEXTAUTH_SECRET: Configured"
    fi
else
    echo "❌ NEXTAUTH_SECRET: Not found in .env.local"
fi

if grep -q "NEXTAUTH_URL=" .env.local 2>/dev/null; then
    echo "✅ NEXTAUTH_URL: $(grep "NEXTAUTH_URL=" .env.local | cut -d'=' -f2 | tr -d '"')"
else
    echo "❌ NEXTAUTH_URL: Not found in .env.local"
fi

echo ""
echo "======================================"
echo "Next Steps:"
echo "1. Update .env.local with your Google OAuth credentials"
echo "2. Set up authorized redirect URIs in Google Console"
echo "3. Generate and set NEXTAUTH_SECRET"
echo "4. Run: npm run dev"
echo "======================================"
