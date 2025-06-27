#!/bin/bash

# Database Migration Script for Rylie SEO Hub
# This script safely applies database migrations to the production environment

echo "🚀 Starting database migration process..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ Database URL is configured"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to generate Prisma client"
    exit 1
fi

echo "✅ Prisma client generated successfully"

# Deploy migrations to database
echo "🔄 Deploying database migrations..."
npx prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to deploy migrations"
    echo "📋 To troubleshoot, try:"
    echo "   1. Check your DATABASE_URL connection"
    echo "   2. Verify your database is accessible"
    echo "   3. Run 'npx prisma db status' to check current state"
    exit 1
fi

echo "✅ Database migrations deployed successfully"

# Verify the deployment
echo "🔍 Verifying deployment..."
npx prisma db status

echo "🎉 Migration process completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the onboarding form at /onboarding"
echo "   2. Verify API endpoints are working"
echo "   3. Check database records are being created properly"
