# 🚀 Rylie SEO Hub - AI-Powered SEO Assistant

> **White-label SEO assistant for automotive dealerships**

A production-ready SaaS platform that allows agencies to provide AI-powered SEO assistance to their automotive dealership clients under their own brand.

## ✨ Features

### 🎨 **White-Label Theming**
- Custom company branding
- Color scheme customization
- Logo upload support
- Real-time theme preview
- 5 preset themes included

### 🤖 **AI-Powered Chat**
- Multiple AI models (GPT-4, Claude, Gemini)
- Automotive SEO expertise
- Conversation persistence
- Streaming responses
- Model selection per conversation

### 📧 **Professional Email System**
- Welcome emails for new users
- SEO report delivery
- Custom domain support (mail.onerylie.com)
- Automated notifications

### 📱 **Mobile-First Design**
- Responsive layout
- Touch-optimized interface
- Mobile menu navigation
- Cross-device compatibility

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (SQLite for development)
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: OpenRouter API (multiple models)
- **Email**: Mailgun
- **Styling**: Tailwind CSS, Radix UI
- **Deployment**: Render.com

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- PostgreSQL (for production)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/copp1723/rylie-seo-hub.git
   cd rylie-seo-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Set up database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3001` to see the application.

## 🌐 Production Deployment

### Render.com Deployment

1. **Create Render account** and connect GitHub
2. **Create Web Service** with these settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node.js

3. **Add PostgreSQL database** in Render dashboard

4. **Configure environment variables** (see `.env.example`)

5. **Deploy** - Render will automatically build and deploy

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# NextAuth.js
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenRouter AI
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Mailgun Email
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain

# Production
NODE_ENV=production
```

## 🎯 Business Model

### Target Market
- **SEO Agencies** serving automotive dealerships
- **Digital Marketing Companies** 
- **Automotive Industry Consultants**

### Pricing Strategy
- **Starter**: $99/month (5 dealerships)
- **Professional**: $299/month (20 dealerships)
- **Enterprise**: $599/month (unlimited)

### Revenue Potential
- 100 agencies × $299/month = **$29,900/month**
- High retention due to white-label value
- Scalable with minimal overhead

## 🔧 Development

### Database Operations
```bash
# Push schema changes
npm run db:push

# Open database studio
npm run db:studio

# Generate Prisma client
npm run db:generate
```

### Code Structure
```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── chat/           # Chat interface
│   └── theme/          # Theme customization
├── components/         # React components
│   ├── auth/          # Authentication
│   ├── chat/          # Chat interface
│   ├── theme/         # Theming
│   └── ui/            # Reusable UI
└── lib/               # Utilities
    ├── auth.ts        # NextAuth config
    ├── ai.ts          # AI integration
    ├── email.ts       # Email service
    └── prisma.ts      # Database client
```

## 📊 Features Roadmap

### ✅ **MVP Complete**
- White-label theming
- AI chat functionality
- User authentication
- Email integration
- Mobile responsiveness

### 🔄 **In Progress**
- SuperMemory integration
- Advanced analytics
- Custom AI prompts

### 📋 **Planned**
- Admin dashboard
- Usage analytics
- Multi-language support
- Advanced reporting
- API access for agencies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.onerylie.com](https://docs.onerylie.com)
- **Email**: support@onerylie.com
- **Issues**: [GitHub Issues](https://github.com/copp1723/rylie-seo-hub/issues)

---

**Built with ❤️ for the automotive SEO industry**

