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

**Built with ❤️ by SEO Werks**

