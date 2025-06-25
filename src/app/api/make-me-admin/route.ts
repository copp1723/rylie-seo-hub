import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Update the current user to be a super admin
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { isSuperAdmin: true },
    })

    return NextResponse.json({
      success: true,
      message: `${updatedUser.email} is now a SUPER_ADMIN!`,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error making user admin:', error)
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }
}
