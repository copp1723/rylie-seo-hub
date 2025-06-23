import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { emailService } from '@/lib/email'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'super_admin']).default('user'),
  isSuperAdmin: z.boolean().default(false),
  agencyId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isSuperAdmin: true, agencyId: true, role: true }
    })

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can send invites' }, { status: 403 })
    }

    // Validate request body
    const body = await req.json()
    const validationResult = inviteSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { email, role, isSuperAdmin, agencyId } = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // If user exists and we're making them super admin, just update their status
      if (isSuperAdmin && !existingUser.isSuperAdmin) {
        await prisma.user.update({
          where: { email },
          data: { isSuperAdmin: true }
        })

        return NextResponse.json({
          message: 'User already exists - updated to super admin',
          user: { email, isSuperAdmin: true }
        })
      }

      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Check for existing pending invite
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      }
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invite already exists for this email' },
        { status: 400 }
      )
    }

    // Create invite
    const invite = await prisma.userInvite.create({
      data: {
        email,
        role: isSuperAdmin ? 'super_admin' : role,
        isSuperAdmin,
        agencyId: isSuperAdmin ? null : (agencyId || currentUser.agencyId),
        invitedBy: session.user.email,
      },
      include: {
        agency: true
      }
    })

    // Send email invitation
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invite.token}`
    
    // Try to send the invite email, but don't fail if email service is not configured
    try {
      await emailService.sendInviteEmail(
        email,
        session.user.name || 'Admin',
        session.user.email,
        role,
        isSuperAdmin,
        inviteUrl
      )
    } catch (emailError) {
      console.warn('Failed to send invite email:', emailError)
      // Continue without email - the invite is still created in the database
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        isSuperAdmin: invite.isSuperAdmin,
        inviteUrl,
        expiresAt: invite.expiresAt
      },
      message: `Invite sent to ${email}. They can sign in with Google using the invite link.`
    })

  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

// GET endpoint to list invites
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isSuperAdmin: true, agencyId: true }
    })

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can view invites' }, { status: 403 })
    }

    // Get all invites
    const invites = await prisma.userInvite.findMany({
      where: {
        OR: [
          { agencyId: currentUser.agencyId },
          { isSuperAdmin: true }
        ]
      },
      include: {
        agency: true,
        invitedByUser: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      invites: invites.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        isSuperAdmin: invite.isSuperAdmin,
        status: invite.status,
        invitedBy: invite.invitedByUser,
        agency: invite.agency,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt
      }))
    })

  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}