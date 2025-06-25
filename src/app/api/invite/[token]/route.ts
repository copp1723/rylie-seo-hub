import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Invalid invitation link' }, { status: 400 })
    }

    // Find invite by token
    const invite = await prisma.userInvite.findUnique({
      where: { token },
      include: {
        agency: {
          select: {
            name: true,
          },
        },
        invitedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if expired
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: 'This invitation has expired',
          invite: {
            status: 'expired',
            email: invite.email,
          },
        },
        { status: 410 }
      )
    }

    // Return invite details
    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        isSuperAdmin: invite.isSuperAdmin,
        status: invite.status,
        invitedBy: invite.invitedByUser,
        agency: invite.agency,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json({ error: 'Failed to load invitation' }, { status: 500 })
  }
}
