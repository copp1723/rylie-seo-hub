# Rylie SEO Hub - Development Handoff Document

## Project Status Summary

### ✅ Completed Features

1. **Request Management System**
   - Monthly SEO focus request form (`/src/components/requests/RequestForm.tsx`)
   - Dashboard with subtle request section (`/src/app/dashboard/page.tsx`)
   - Chat interface with natural language request handling (`/src/components/chat/ChatInterfaceWithRequests.tsx`)
   - Dual submission methods: form-based and conversational

2. **Enhanced Chat System**
   - Comprehensive SEO knowledge base (`/src/lib/seo-knowledge.ts`)
   - Enhanced system prompt with FAQ integration
   - Specific package details (Silver, Gold, Platinum)
   - Updated suggestion cards reflecting real client questions

3. **Navigation & UI Updates**
   - Dashboard as primary landing page after login
   - Updated sidebar navigation
   - Label component added (`/src/components/ui/label.tsx`)

## 🔴 Remaining Work: Dealership Onboarding Integration

### Overview
The dealership onboarding functionality is already built but needs to be integrated into the current Rylie SEO Hub. This will allow new dealerships to fill out a comprehensive onboarding form and have their data automatically submitted to SEOWerks.

### Reference Implementation
The complete onboarding implementation exists in:
```
/Users/copp1723/Desktop/[expired] repos/seorylie/web-console/src/services/seowerks-integration.ts
```

### Key Components from Existing Implementation

#### 1. Data Structure (from seowerks-integration.ts)
```typescript
export interface SEOWerksSubmissionData {
  // Required fields matching SEOWerks form
  dealerName: string;
  package: 'PLATINUM' | 'GOLD' | 'SILVER';
  mainBrand: string;
  otherBrand?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dealerContactName: string;
  dealerContactTitle: string;
  dealerContactEmail: string;
  dealerContactPhone: string;
  dealerWebsiteUrl: string;
  billingContactEmail: string;
  siteAccessNotes: string;
  targetVehicleModels: string[];  // minimum 3
  targetCities: string[];          // minimum 3
  targetDealers: string[];         // minimum 3
}
```

#### 2. Form Submission Logic
The existing implementation includes:
- Data transformation function (`transformToSEOWerksFormat`)
- Validation function (`validateSEOWerksData`)
- Submission function (`submitToSEOWerks`) that posts to https://start.seowerks.ai/

### Implementation Steps

#### Step 1: Update Prisma Schema
Add the DealershipOnboarding model to `/prisma/schema.prisma`:

```prisma
model DealershipOnboarding {
  id                    String   @id @default(cuid())
  
  // Agency relationship
  agencyId              String
  agency                Agency   @relation(fields: [agencyId], references: [id])
  
  // Dealership Information
  dealerName            String
  package               String   // SILVER, GOLD, PLATINUM
  mainBrand             String
  otherBrand            String?
  
  // Location
  address               String
  city                  String
  state                 String
  zipCode               String
  
  // Contact Information
  dealerContactName     String
  dealerContactTitle    String
  dealerContactEmail    String
  dealerContactPhone    String
  dealerWebsiteUrl      String
  billingContactEmail   String
  
  // Access & Notes
  siteAccessNotes       String   @db.Text
  
  // Target Information (stored as JSON arrays)
  targetVehicleModels   Json     // Array of strings
  targetCities          Json     // Array of strings
  targetDealers         Json     // Array of strings
  
  // Status
  submittedToSeoworks   Boolean  @default(false)
  seoworksSubmissionDate DateTime?
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("dealership_onboardings")
}
```

#### Step 2: Create Onboarding Form Component
Create `/src/components/onboarding/DealershipOnboardingForm.tsx`:

```typescript
// Copy the form structure from the existing implementation
// Include all fields from SEOWerksSubmissionData
// Add validation for minimum 3 items in array fields
// Include progress indicator for multi-step form
```

#### Step 3: Create Onboarding API Route
Create `/src/app/api/onboarding/route.ts`:

```typescript
// Import the existing submitToSEOWerks function logic
// Save to database first
// Then submit to SEOWerks
// Handle success/error states
```

#### Step 4: Create Onboarding Page
Create `/src/app/onboarding/page.tsx`:

```typescript
// Protected route - only for new agencies or admins
// Multi-step form wizard
// Preview before submission
// Success confirmation with next steps
```

#### Step 5: Update Dashboard
Add onboarding status/link to dashboard for agencies without completed onboarding.

### Integration Points

1. **Authentication**: Ensure only authorized users can access onboarding
2. **Package Selection**: This determines service level and task prioritization
3. **Task Assignment**: The existing `seoworks-integration.ts` already handles task routing based on package
4. **Data Flow**: 
   - User fills form → Save to database → Submit to SEOWerks → Update submission status

### API Endpoints Needed

1. `POST /api/onboarding` - Submit new onboarding
2. `GET /api/onboarding/status` - Check onboarding status
3. `PUT /api/onboarding/:id` - Update onboarding (if needed)

### Environment Variables Required

```env
SEOWORKS_API_URL=https://start.seowerks.ai/
SEOWORKS_API_KEY=your-api-key-here
```

### Testing Checklist

- [ ] Form validates all required fields
- [ ] Minimum 3 items validation for array fields
- [ ] Data saves to database correctly
- [ ] Submission to SEOWerks works
- [ ] Error handling for failed submissions
- [ ] Success flow redirects appropriately
- [ ] Existing agencies can't re-onboard
- [ ] Admin can view all onboardings

### Files to Reference

1. **Complete SEOWerks Integration Logic**:
   ```
   /Users/copp1723/Desktop/[expired] repos/seorylie/web-console/src/services/seowerks-integration.ts
   ```

2. **Current Task Integration** (already in project):
   ```
   /Users/copp1723/Desktop/rylie-seo-hub-main/src/lib/seoworks-integration.ts
   ```

3. **Orders API** (for reference):
   ```
   /Users/copp1723/Desktop/rylie-seo-hub-main/src/app/api/orders/route.ts
   ```

### Important Notes

1. The onboarding form at https://start.seowerks.ai/ expects specific field names (see form data mapping in the existing implementation)
2. Arrays must have at least 3 items for target vehicles, cities, and dealers
3. Package selection (SILVER/GOLD/PLATINUM) affects task prioritization
4. All onboarding data should be stored locally before submission to SEOWerks

### Next Developer Action Items

1. Copy the `seowerks-integration.ts` file from the expired repo
2. Update Prisma schema and run migrations
3. Create the onboarding form component
4. Create API routes for onboarding
5. Test the complete flow end-to-end
6. Add onboarding status to agency dashboard

### Success Criteria

- New dealerships can complete onboarding through Rylie SEO Hub
- Data is validated before submission
- Information is successfully sent to SEOWerks
- Onboarding status is tracked in the database
- Users receive confirmation of successful onboarding

---

## Project Structure Reference

```
/src
  /app
    /dashboard (✅ completed)
    /chat (✅ completed)
    /onboarding (❌ needs creation)
      page.tsx
    /api
      /orders (✅ completed)
      /chat (✅ completed)
      /onboarding (❌ needs creation)
        route.ts
  /components
    /requests (✅ completed)
      RequestForm.tsx
    /chat (✅ completed)
      ChatInterfaceWithRequests.tsx
    /onboarding (❌ needs creation)
      DealershipOnboardingForm.tsx
  /lib
    seo-knowledge.ts (✅ completed)
    seoworks-integration.ts (⚠️ needs onboarding functions added)
```

## Contact for Questions

For questions about the existing onboarding implementation, refer to:
- The complete implementation in the expired repos folder
- The SEOWerks API documentation at `/docs/SEOWORKS_API.md`

The dealership onboarding is the final piece needed to complete the full integration between Rylie SEO Hub and SEOWerks services.
