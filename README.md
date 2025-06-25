# Rylie SEO Hub

> AI-Powered SEO Assistant for Automotive Dealerships

A professional, white-label SaaS platform that provides automotive dealerships with intelligent SEO strategies, real-time optimization, and data-driven insights powered by advanced AI models.

## 🚀 Features

### Core Functionality
- **AI-Powered SEO Analysis** - Advanced algorithms analyze content and provide actionable recommendations
- **Multi-Model Chat Interface** - Access to multiple AI models (GPT-4, Claude, Gemini) for diverse insights
- **Real-Time Analytics** - Monitor SEO performance with live analytics and competitive intelligence
- **White-Label Theming** - Fully customizable platform that matches your agency's brand

### Enterprise Features
- **Multi-Tenant Architecture** - Complete data isolation for multiple agencies
- **Role-Based Access Control** - Admin, user, and viewer permissions within agencies
- **Feature Flag System** - Progressive rollouts and A/B testing capabilities
- **Usage Tracking & Billing** - Per-agency metrics for accurate billing and analytics
- **Enterprise Observability** - Sentry error tracking and PostHog analytics integration

### Technical Highlights
- **Modern Tech Stack** - Next.js 15, TypeScript, Prisma, PostgreSQL
- **Professional UI** - Responsive design with Tailwind CSS and Radix UI components
- **Production Ready** - Comprehensive error handling, logging, and monitoring
- **Scalable Architecture** - Designed to handle 50+ agencies with thousands of users

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (production), SQLite (development)
- **Authentication**: NextAuth.js with Google OAuth
- **AI Integration**: OpenRouter API (GPT-4, Claude, Gemini)
- **Observability**: Sentry (error tracking), PostHog (analytics)
- **Email**: Nodemailer with Mailgun
- **File Upload**: Cloudinary integration

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- PostgreSQL 14+ (for production)
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/copp1723/rylie-seo-hub.git
cd rylie-seo-hub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/rylie_seo_hub"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-nextauth-secret-key-here"
NEXTAUTH_URL="http://localhost:3001"

# Google OAuth (required for authentication)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenRouter AI (required for chat functionality)
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"

# Optional: Email Service (Mailgun)
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="your-mailgun-domain"

# Optional: Observability
SENTRY_DSN="your-sentry-dsn"
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# App Configuration
APP_NAME="Rylie SEO Hub"
APP_URL="http://localhost:3001"
NODE_ENV="development"
```

### 4. Database Setup

#### For Development (SQLite)
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

#### For Production (PostgreSQL)
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb rylie_seo_hub

# Run migrations
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3001`

## 🔧 Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### OpenRouter API Setup

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Generate an API key
3. Add the key to your environment variables

### Database Configuration

#### Development
The app uses SQLite by default for development. No additional setup required.

#### Production
For production, use PostgreSQL:

```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── chat/              # Chat interface
│   ├── theme/             # Theme customization
│   └── admin/             # Admin dashboard
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── chat/              # Chat interface components
│   ├── theme/             # Theme components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── auth.ts            # Authentication configuration
│   ├── prisma.ts          # Database client
│   ├── ai.ts              # AI service integration
│   ├── errors.ts          # Error handling utilities
│   ├── utils.ts           # Common utilities
│   └── observability.ts   # Monitoring and analytics
└── prisma/                # Database schema and migrations
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables for Production

Ensure all required environment variables are set:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret for NextAuth.js
- `NEXTAUTH_URL` - Your production domain
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `OPENROUTER_API_KEY` - OpenRouter API key

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Code Quality

The project includes:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Husky** for pre-commit hooks (optional)

Format code before committing:
```bash
npm run format
npm run lint:fix
```

## 🏗️ Architecture

### Multi-Tenant Design
- **Agency-based isolation** - Each agency has complete data separation
- **Role-based access** - Admin, user, viewer roles within agencies
- **Usage tracking** - Per-agency metrics for billing and analytics
- **Feature flags** - Agency-specific feature rollouts

### Security Features
- **Authentication** via NextAuth.js with Google OAuth
- **Authorization** with role-based access control
- **Data isolation** prevents cross-tenant data access
- **Rate limiting** on API endpoints
- **Input validation** with Zod schemas

### Observability
- **Error tracking** with Sentry
- **User analytics** with PostHog
- **Structured logging** for debugging
- **Performance monitoring** for optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub
- **Email**: Contact the development team

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release with core SEO assistant functionality
- Multi-tenant architecture with agency isolation
- Feature flag system for progressive rollouts
- Professional UI with white-label theming
- Enterprise observability with Sentry and PostHog
- Multi-model AI chat interface

---

## GA4 Integration and Automated Reporting

This system integrates with Google Analytics 4 (GA4) to provide automated SEO performance reports. Agencies can connect their Google Analytics accounts, and the system will generate and deliver reports on a schedule.

### Features

-   **OAuth 2.0 for GA4**: Securely connect Google Analytics accounts using OAuth 2.0. Access and refresh tokens are encrypted and stored.
-   **Property Discovery**: Users can see a list of their accessible GA4 properties to choose from, powered by the Google Analytics Admin API.
-   **Automated Data Fetching**: Retrieves data from the Google Analytics Data API v1, including metrics like organic traffic, sessions, engagement rate, conversions, top pages, and (GA4-available) keywords.
-   **Report Generation**: Generates reports in both HTML and PDF formats.
-   **Customizable Templates**: Supports different report templates (Weekly Summary, Monthly Report, Quarterly Business Review).
-   **White-Labeling**: Allows for basic agency branding on reports (agency name, logo).
-   **Scheduled Reporting**: Uses a cron-like system (`node-cron`) to automatically generate and email reports based on user-defined schedules.
-   **Email Delivery**: Sends reports as PDF attachments via email using Nodemailer (requires email service configuration).
-   **Audit Logging**: All significant GA4 access events, report generation, and scheduling activities are logged through the audit service.

### Technical Overview

-   **GA4 Authentication**: Handled by `src/app/api/ga4/auth/route.ts`. Manages the Google OAuth flow and token storage/refresh.
-   **GA4 Data Service**: Implemented in `src/lib/services/ga4-service.ts`. Responsible for all communication with the Google Analytics Data API and Admin API.
-   **Report Generation Service**: Implemented in `src/lib/services/report-generator.ts`. Uses Handlebars for HTML templating and Puppeteer for PDF generation.
-   **Scheduled Jobs**: Logic resides in `src/app/api/reports/schedule/route.ts`. Manages cron jobs for report generation and delivery.

### Setup and Configuration

1.  **Google Cloud Project**:
    *   Ensure you have a Google Cloud Project with the **Google Analytics API**, **Google Analytics Data API**, and **Google Analytics Admin API** enabled.
    *   Create OAuth 2.0 credentials (Client ID and Client Secret). These are separate from the main application's Google OAuth for user login if that's also used. The `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env.local` should be for *user login*. You will need *new* OAuth credentials specifically for this GA4 server-to-server integration, or adapt the existing ones if the consent screen and scopes can be shared. For clarity, let's assume dedicated variables for GA4 service access:
    *   Configure the Authorized redirect URI in your Google Cloud OAuth consent screen settings for these GA4-specific credentials to point to `YOUR_APP_URL/api/ga4/auth?action=callback`.

2.  **Environment Variables**:
    Ensure the following environment variables are set in your `.env.local` (or equivalent production environment configuration):
    ```bash
    # Google OAuth for GA4 Service (Potentially different from user login OAuth creds)
    # If using the same OAuth client as user login, ensure all required scopes are added.
    # For dedicated GA4 service credentials:
    GA4_SERVICE_GOOGLE_CLIENT_ID="your_ga4_google_client_id"
    GA4_SERVICE_GOOGLE_CLIENT_SECRET="your_ga4_google_client_secret"
    # This should be the absolute URL to your deployed application's GA4 callback handler
    GA4_SERVICE_GOOGLE_REDIRECT_URI="http://localhost:3001/api/ga4/auth?action=callback" # Or your production URL

    # Report Generation & Delivery
    # APP_URL is likely already defined for NextAuth, ensure it's correct.
    # EMAIL_FROM_ADDRESS for report emails (can be same as general app email if desired)
    REPORTS_EMAIL_FROM_ADDRESS="Rylie SEO Hub Reports <noreply@example.com>"
    # Nodemailer transport options (e.g., SMTP, Mailgun) should be configured.
    # The existing MAILGUN_API_KEY and MAILGUN_DOMAIN can be used if Mailgun is the chosen provider.
    # If using a different service for report emails, add its specific env vars.

    # GA4 OAuth Success/Error Redirect URLs (frontend routes to redirect to after GA4 OAuth)
    GA4_SUCCESS_REDIRECT_URL="/settings/ga4?status=success" # Example frontend success page
    GA4_ERROR_REDIRECT_URL="/settings/ga4?status=error"   # Example frontend error page

    # Puppeteer (optional, for specific environments if Chromium is not found automatically)
    # PUPPETEER_EXECUTABLE_PATH="/path/to/your/chromium"

    # Encryption Key for GA4 OAuth tokens (MUST be a strong, randomly generated key)
    # Generate a secure random 32-byte (256-bit) key, often hex or base64 encoded.
    GA4_TOKEN_ENCRYPTION_KEY="your_strong_random_32_byte_encryption_key_for_ga4_tokens"
    ```
    *Note: If you intend to use the same Google OAuth client ID and secret that's already configured for user authentication (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), ensure that its consent screen includes all necessary scopes for both user login and the GA4 services (`analytics.readonly`, `analytics.manage.users.readonly`). The `GA4_SERVICE_GOOGLE_REDIRECT_URI` would then use the main `APP_URL`.*

3.  **Database**:
    *   The system requires database tables for storing encrypted GA4 OAuth tokens (associated with users/agencies) and report schedules. Ensure your Prisma schema (`prisma/schema.prisma`) is updated to include models for these, and run migrations:
        ```bash
        npx prisma migrate dev --name add_ga4_integration_tables
        ```
    *   Conceptual models:
        ```prisma
        // In prisma/schema.prisma
        model UserGA4Token {
          id                  String    @id @default(cuid())
          userId              String    // Or relation to User model
          encryptedAccessToken String
          encryptedRefreshToken String?
          expiryDate          DateTime?
          scope               String?
          tokenType           String?
          createdAt           DateTime  @default(now())
          updatedAt           DateTime  @updatedAt
          // user                User      @relation(fields: [userId], references: [id]) // If User model exists
        }

        model ReportSchedule {
          id                String    @id @default(cuid())
          cronPattern       String
          ga4PropertyId     String
          userId            String    // User whose tokens are used
          // agencyId          String?   // Optional: If reports are agency-specific
          reportType        String    // e.g., 'WeeklySummary', 'MonthlyReport'
          emailRecipients   String[]
          brandingOptionsJson String?   // JSON string for ReportBrandingOptions
          isActive          Boolean   @default(true)
          lastRun           DateTime?
          createdAt         DateTime  @default(now())
          updatedAt         DateTime  @updatedAt
        }
        ```

4.  **Email Service**:
    *   The report scheduler uses `nodemailer`. Ensure it's configured in `src/app/api/reports/schedule/route.ts` to use your preferred email transport (e.g., Mailgun, using existing `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` if applicable, or another service like AWS SES, SendGrid).

5.  **Cron Job Runner (Production)**:
    *   The `node-cron` setup in `src/app/api/reports/schedule/route.ts` is suitable for single-process, long-running Node.js servers (e.g., when running `npm start` with a custom server, or a non-serverless Docker deployment).
    *   **For Vercel deployments (default for Next.js):** Internal `node-cron` schedulers will **not** work reliably for background jobs. You **must** use Vercel Cron Jobs (configured in `vercel.json` or the Vercel dashboard) or an external scheduler service (e.g., AWS EventBridge Scheduler, Google Cloud Scheduler, EasyCron) to trigger an API endpoint (e.g., `POST /api/reports/trigger-scheduled-jobs`). This endpoint would then be responsible for fetching due schedules from the database and processing them (e.g., by calling a function similar to `processSchedule` for each due job, possibly asynchronously or via a queue).

### API Endpoints (New or Enhanced)

*   **GA4 Authentication**:
    *   `GET /api/ga4/auth?action=authorize&userId=<USER_ID>`: Initiates the Google OAuth flow for GA4 access. Redirects to Google's consent screen. `userId` is crucial for associating tokens with the correct user account.
    *   `GET /api/ga4/auth?action=callback`: Handles the OAuth callback from Google. Exchanges the authorization code for tokens, encrypts and stores them (associated with `userId` from the state parameter), and redirects to `GA4_SUCCESS_REDIRECT_URL` or `GA4_ERROR_REDIRECT_URL` configured in your environment.
*   **GA4 Property Listing (New Endpoint Needed)**:
    *   A new endpoint, e.g., `GET /api/ga4/properties`, should be created. This endpoint would:
        1.  Verify user authentication (e.g., check NextAuth session).
        2.  Instantiate `GA4Service` for the authenticated user (which requires access to their GA4 tokens).
        3.  Call `ga4Service.getFormattedPropertiesList()`.
        4.  Return the list of properties to the frontend.
*   **Report Scheduling (Conceptual - requires full UI and API for management)**:
    *   `GET /api/reports/schedule`: (Currently for development/debugging) Lists schedules from the in-memory store and can initialize `node-cron` jobs if run in a long-lived process.
    *   `POST /api/reports/schedule`: (Conceptual) Would be used by a frontend UI to create or update report schedules in the database. The cron job runner would then pick these up.
    *   **(Production) `POST /api/reports/trigger-scheduled-jobs`**: (New endpoint needed for serverless cron) An endpoint that external schedulers (like Vercel Cron Jobs) would call. This endpoint would query the database for schedules due to run and execute them.

### Using the System (User Flow)

1.  **Connect GA4 Account**: In the application's settings or a dedicated GA4 connection area, the user clicks a "Connect Google Analytics" button. This button should link to `/api/ga4/auth?action=authorize&userId=<LOGGED_IN_USER_ID>`.
2.  **Google Authentication & Consent**: The user is redirected to Google, signs in, and grants permission for the application to access their Google Analytics data.
3.  **Property Selection**: After successful OAuth, the user is redirected back to the application (to `GA4_SUCCESS_REDIRECT_URL`). The application should then call the new `GET /api/ga4/properties` endpoint to fetch and display a list of the user's GA4 properties. The user selects the property they wish to use for reporting.
4.  **Configure Schedule**: The user interface allows creating a report schedule, selecting the report type (Weekly, Monthly, Quarterly), frequency (which translates to a cron pattern), and email recipients. This configuration is saved to the database via the (to be fully implemented) schedule management API.
5.  **Automated Reporting**: The backend cron job system (or externally triggered job runner) periodically checks for due schedules, fetches data using the stored user tokens, generates reports, and emails them to the specified recipients.

### Important Notes & Actions Required

*   **Token Encryption**: The placeholder encryption functions (`encrypt_placeholder`, `decrypt_placeholder`) in `src/app/api/ga4/auth/route.ts` **MUST be replaced with a robust, cryptographically secure implementation** using the `GA4_TOKEN_ENCRYPTION_KEY`. Use standard libraries like Node.js `crypto`.
*   **Database Implementation**: The conceptual Prisma models for `UserGA4Token` and `ReportSchedule` need to be added to `prisma/schema.prisma`, and migrations must be run. The token storage (`storeTokensFinal`, `getTokensFinal`, `getEncryptedTokensForRefresh`) and schedule management logic must be updated to use Prisma for database operations instead of placeholders.
*   **`getAccessTokenForUser` in `GA4Service`**: This placeholder function within `GA4Service` is critical and **must be fully implemented**. It needs to securely fetch the appropriate user's encrypted GA4 tokens from the database (using `userId`), decrypt the access token, and if it's expired or missing, use the decrypted refresh token to obtain a new access token via `refreshAccessTokenFinal`. The new/refreshed tokens should then be updated in the database.
*   **Production Scheduler**: Adapt the scheduling mechanism for your production environment (e.g., Vercel Cron Jobs).
*   **UI Development**: Frontend components will be needed for users to initiate GA4 OAuth, select properties, and manage report schedules.
*   **Detailed User Guide**: The existing `docs/user-guides/GA4_INTEGRATION_GUIDE.md` should be thoroughly reviewed and updated to reflect this new implementation, including screenshots and step-by-step instructions for users.

This GA4 integration significantly enhances the Rylie SEO Hub by providing valuable, automated insights directly from clients' Google Analytics data.

---

**Built with ❤️ by SEO Werks**

