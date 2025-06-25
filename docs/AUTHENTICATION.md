# Authentication System Documentation

## Overview

The Rylie SEO Hub uses NextAuth.js (Auth.js) with Google OAuth for authentication. This provides a secure, production-ready authentication system with support for multi-tenant architecture.

## Features

- **Google OAuth Integration**: Users sign in with their Google accounts
- **Multi-tenant Support**: User sessions include agency and role information
- **Role-based Access Control**: Support for different user roles (user, admin, super admin)
- **Secure Middleware**: Protected routes with automatic redirects
- **TypeScript Support**: Fully typed authentication system

## Configuration

### Environment Variables

Required environment variables in `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# NextAuth
NEXTAUTH_URL="http://localhost:3001"  # Change for production
NEXTAUTH_SECRET="your-random-secret"  # Generate with: openssl rand -base64 32
```

### Google Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3001` (development)
   - Authorized redirect URIs: 
     - `http://localhost:3001/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

## User Roles and Permissions

### Role Hierarchy

1. **Super Admin** (`isSuperAdmin: true`)
   - Full platform access
   - Can access all agencies
   - Can manage system settings
   - First user automatically becomes super admin

2. **Agency Admin** (`role: 'admin'`)
   - Full access within their agency
   - Can manage agency users
   - Can configure agency settings

3. **Agency User** (`role: 'user'`)
   - Standard access within their agency
   - Can use chat and view analytics
   - Cannot modify agency settings

4. **Agency Viewer** (`role: 'viewer'`)
   - Read-only access within their agency
   - Can view reports and analytics
   - Cannot create or modify content

## Protected Routes

### Middleware Configuration

The middleware (`middleware.ts`) protects routes based on authentication status:

- **Public Routes**: Home page, sign-in/out pages
- **Authenticated Routes**: Dashboard, chat, settings
- **Admin Routes**: `/admin/*` (super admin only)
- **Agency Routes**: Routes requiring agency selection

### Route Protection Examples

```typescript
// Require authentication
const session = await requireAuth()

// Require super admin
const session = await requireSuperAdmin()

// Require agency admin
const session = await requireAgencyAdmin(agencyId)

// Check agency access
const hasAccess = await hasAgencyAccess(userId, agencyId)
```

## Session Management

### Extended Session Type

```typescript
interface ExtendedSession extends Session {
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
    role?: string
    agencyId?: string | null
    isSuperAdmin?: boolean
  }
}
```

### Accessing Session Data

```typescript
// In Server Components
import { auth } from '@/lib/auth'

export default async function Page() {
  const session = await auth()
  if (!session) {
    // Not authenticated
  }
  
  // Access user data
  const { user } = session
  console.log(user.id, user.role, user.agencyId)
}

// In API Routes
export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Use session data
}
```

## Helper Functions

### `requireAuth()`
Ensures user is authenticated, throws error if not.

### `requireSuperAdmin()`
Ensures user is a super admin, throws error if not.

### `requireAgencyAdmin(agencyId?)`
Ensures user is an admin of specified agency or their own agency.

### `hasAgencyAccess(userId, agencyId)`
Checks if user has access to specified agency.

## User Onboarding Flow

1. **First Sign-in**: User signs in with Google
2. **User Creation**: Account created with default role
3. **Agency Selection**: If no agency, redirect to onboarding
4. **Role Assignment**: Agency admin assigns appropriate role

## Security Features

- **HTTPS Only**: Enforced in production via security headers
- **CSRF Protection**: Built into NextAuth
- **Secure Cookies**: HTTP-only, secure cookies for sessions
- **Token Rotation**: Automatic token refresh for OAuth

## Troubleshooting

### Common Issues

1. **"OAuthAccountNotLinked" Error**
   - User email already exists with different provider
   - Solution: Sign in with original provider

2. **Redirect Loop**
   - Check NEXTAUTH_URL matches actual URL
   - Verify middleware configuration

3. **Session Not Found**
   - Ensure cookies are enabled
   - Check NEXTAUTH_SECRET is set

### Debug Mode

Enable debug logging in development:

```typescript
// In auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  // ... rest of config
})
```

## Migration from Magic Links

If migrating from magic link authentication:

1. Update auth configuration to use Google provider
2. Update sign-in pages to show Google button
3. Migrate existing users (maintain same email)
4. Update environment variables

## Best Practices

1. **Always check authentication** in protected routes
2. **Use TypeScript** for type-safe session handling
3. **Handle errors gracefully** with user-friendly messages
4. **Log authentication events** for security auditing
5. **Keep secrets secure** and rotate regularly
