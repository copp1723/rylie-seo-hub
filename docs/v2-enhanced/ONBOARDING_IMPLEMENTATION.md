# Dealership Onboarding Implementation

## Overview

This implementation adds a complete dealership onboarding system that integrates with SEOWerks platform. The system allows dealerships to submit their information through a comprehensive form, which then gets processed and sent to SEOWerks for service activation.

## Features Implemented

### 1. Onboarding Form (`/onboarding`)
- **Comprehensive Form**: Collects all required information matching SEOWerks requirements
- **Real-time Validation**: Ensures minimum requirements are met (3+ items for target arrays)
- **Package Selection**: Silver, Gold, Platinum packages with different service levels
- **Responsive Design**: Works on all device sizes
- **Error Handling**: Clear feedback for validation and submission errors

### 2. API Integration (`/api/onboarding`)
- **POST Endpoint**: Handles form submissions
- **GET Endpoint**: Retrieves onboarding history
- **Authentication**: Secure, session-based access control
- **Database Storage**: All submissions saved with status tracking
- **SEOWerks Submission**: Automatic forwarding to SEOWerks platform

### 3. Database Integration
- **New Model**: `DealershipOnboarding` with comprehensive schema
- **Multi-tenant Support**: Agency-scoped data isolation
- **Status Tracking**: pending, submitted, failed, processing statuses
- **Audit Trail**: Complete submission and response logging
- **Migration Support**: Safe database schema updates

### 4. Dashboard Integration
- **New Quick Action**: Direct access to onboarding from dashboard
- **Status Overview**: Integration with existing analytics
- **Navigation**: Seamless flow between features

### 5. Status Tracking (`/onboarding/status`)
- **Submission History**: View all onboarding attempts
- **Status Badges**: Visual status indicators
- **Response Details**: SEOWerks integration feedback
- **Retry Capability**: Re-submit failed attempts

## Technical Implementation

### Database Schema
```sql
-- New table for onboarding data
CREATE TABLE "dealership_onboardings" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "package" TEXT NOT NULL, -- SILVER, GOLD, PLATINUM
    "mainBrand" TEXT NOT NULL,
    "otherBrand" TEXT,
    -- ... (all form fields)
    "targetVehicleModels" TEXT[],
    "targetCities" TEXT[],
    "targetDealers" TEXT[],
    "submittedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "seoworksResponse" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dealership_onboardings_pkey" PRIMARY KEY ("id")
);
```

### API Endpoints

#### POST /api/onboarding
Handles form submissions with the following flow:
1. Authenticate user and validate session
2. Transform form data to SEOWerks format
3. Validate all required fields and minimums
4. Save to database with 'pending' status
5. Submit to SEOWerks platform
6. Update database with submission result
7. Log audit trail

#### GET /api/onboarding
Retrieves onboarding history for the authenticated user's agency.

### SEOWerks Integration

The system integrates with SEOWerks by:
1. **Form Data Transformation**: Converting form fields to SEOWerks API format
2. **Direct Submission**: POST to `https://start.seowerks.ai/` with FormData
3. **Field Mapping**: Exact mapping of all form fields to SEOWerks expectations
4. **Error Handling**: Robust error handling and retry logic

### Form Field Mapping
```typescript
// Frontend form → SEOWerks API
businessName → dealer_name
package → package
mainBrand → main_brand
otherBrand → other_brand
// ... (complete mapping in code)
targetVehicleModels[0] → target_vehicle_models[0]
targetCities[0] → target_cities[0]
targetDealers[0] → target_dealers[0]
```

## Deployment

### 1. Database Migration
```bash
# Generate Prisma client and deploy migrations
npm run db:setup

# Or manually:
npx prisma generate
npx prisma db push
```

### 2. Environment Variables
Ensure these are configured in Render:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Authentication secret
- `NEXTAUTH_URL`: Application URL

### 3. Build and Deploy
```bash
# Deploy with onboarding features
npm run onboarding:deploy

# Or standard deployment
npm run build
npm start
```

## Usage

### For Dealerships
1. **Access**: Navigate to `/onboarding` from dashboard
2. **Complete Form**: Fill all required fields (minimum 3 target items each)
3. **Submit**: Form validates and submits to both database and SEOWerks
4. **Track Status**: View submission status at `/onboarding/status`

### For Administrators
1. **Monitor**: Check onboarding submissions in database
2. **Debug**: Review SEOWerks responses in onboarding records
3. **Support**: Help users with failed submissions via status page

## Integration with Existing System

### Task Assignment
The onboarding data is used by the existing task assignment system:
- Package type determines task priority and turnaround
- Dealership information populates task metadata
- Target arrays inform content strategy

### Multi-tenant Support
- All onboarding data is scoped to the user's agency
- Permissions enforced through session-based authentication
- Data isolation maintained across all operations

## Error Handling

### Form Validation
- Client-side validation for immediate feedback
- Server-side validation before submission
- Clear error messages for missing or invalid data

### API Errors
- Graceful handling of SEOWerks API failures
- Retry logic for temporary failures
- Detailed error logging for debugging

### Database Errors
- Transaction safety for data consistency
- Audit logging for all operations
- Rollback support for failed submissions

## Next Steps

1. **Testing**: Test onboarding flow end-to-end
2. **Monitoring**: Set up alerts for failed submissions
3. **Enhancement**: Add email notifications for status changes
4. **Analytics**: Track onboarding conversion rates
5. **Documentation**: User guides for dealership staff

## Files Created/Modified

### New Files
- `src/components/onboarding/DealershipOnboardingForm.tsx`
- `src/components/onboarding/OnboardingStatus.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/status/page.tsx`
- `src/app/api/onboarding/route.ts`
- `src/lib/seoworks-onboarding.ts`
- `prisma/migrations/*/migration.sql`
- `scripts/migrate-database.sh`

### Modified Files
- `prisma/schema.prisma` (added DealershipOnboarding model)
- `src/app/dashboard/page.tsx` (added onboarding quick action)
- `package.json` (added deployment scripts)

## Support

For issues or questions:
1. Check logs in `/onboarding/status` for submission details
2. Review database records for troubleshooting
3. Verify SEOWerks API connectivity
4. Contact development team for technical support
