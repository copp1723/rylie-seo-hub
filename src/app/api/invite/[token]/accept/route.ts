import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to accept an invitation' },
        { status: 401 }
      )
    }

    // Find invite
    const invite = await prisma.userInvite.findUnique({
      where: { token },
      include: {
        agency: true
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      )
    }

    // Check if email matches
    if (invite.email !== session.user.email) {
      return NextResponse.json(
        { 
          error: 'This invitation is for a different email address',
          details: `Invitation is for ${invite.email}, but you are signed in as ${session.user.email}`
        },
        { status: 403 }
      )
    }

    // Start transaction to update user and invite
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists
      let user = await tx.user.findUnique({
        where: { email: session.user.email! }
      })

      if (user) {
        // Update existing user
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            isSuperAdmin: invite.isSuperAdmin || user.isSuperAdmin,
            role: invite.isSuperAdmin ? 'admin' : invite.role,
            agencyId: invite.agencyId || user.agencyId
          }
        })
      } else {
        // This shouldn't happen with NextAuth, but handle it
        user = await tx.user.create({
          data: {
            email: session.user.email!,
            name: session.user.name || null,
            image: session.user.image || null,
            isSuperAdmin: invite.isSuperAdmin,
            role: invite.role,
            agencyId: invite.agencyId
          }
        })
      }

      // Update invite status
      await tx.userInvite.update({
        where: { id: invite.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date()
        }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'INVITE_ACCEPTED',
          entityType: 'user_invite',
          entityId: invite.id,
          userEmail: session.user.email!,
          details: {
            inviteEmail: invite.email,
            role: invite.role,
            isSuperAdmin: invite.isSuperAdmin,
            invitedBy: invite.invitedBy
          }
        }
      })

      return user
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      user: {
        id: result.id,
        email: result.email,
        isSuperAdmin: result.isSuperAdmin,
        role: result.role
      }
    })

  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}