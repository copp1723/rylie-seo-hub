import { DefaultSession, User } from 'next-auth'
import { JWT as NextAuthJWT } from 'next-auth/jwt'
import { UserRole } from '@prisma/client' // Import the UserRole enum

declare module 'next-auth' {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's unique identifier. */
      id: string;
      /** The user's role. */
      role: UserRole;
      /** The user's agency ID, if applicable. */
      agencyId: string | null;
      /** Whether the user is a super admin. */
      isSuperAdmin: boolean;
    } & DefaultSession['user']; // Extends the default user properties like name, email, image
  }

  // We are not extending the base User model from NextAuth here for callbacks
  // as the `user` object passed to JWT callback comes from the provider or database directly.
  // If we needed to ensure the `user` object in callbacks also had these types, we could extend it:
  // interface User extends DefaultUser {
  //   role?: string; // Or UserRole
  //   agencyId?: string | null;
  //   isSuperAdmin?: boolean;
  // }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT extends NextAuthJWT {
    /** OpenID ID Token */
    idToken?: string;
    /** Custom properties added in the JWT callback */
    id?: string;
    role?: UserRole;
    agencyId?: string | null;
    isSuperAdmin?: boolean;
  }
}
