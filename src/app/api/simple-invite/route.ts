import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find the current user by email to get correct ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found in database' }, { status: 404 })
    }

    if (!currentUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Not a super admin' }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Create a simple invite without foreign key complications
    const invite = await prisma.userInvite.create({
      data: {
        email,
        role: 'user',
        isSuperAdmin: false,
        invitedBy: currentUser.id,
        // Generate a simple token
        token: `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    const inviteUrl = `https://rylie-seo-hub.onrender.com/invite/${invite.token}`

    return NextResponse.json({
      success: true,
      message: `Invite created for ${email}`,
      inviteUrl,
      note: 'Share this URL with the user. They can sign in with Google.',
    })
  } catch (error) {
    console.error('Simple invite error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create invite',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
