import { auth } from './auth'

export async function getServerSession() {
  return auth()
}

// Helper function for routes that require authentication
export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}