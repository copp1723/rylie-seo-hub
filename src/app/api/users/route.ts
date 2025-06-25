import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isSuperAdmin: true, agencyId: true },
    })

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can view all users' }, { status: 403 })
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isSuperAdmin: true,
        role: true,
        createdAt: true,
        agency: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// Update user (e.g., to make them super admin)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is super admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isSuperAdmin: true },
    })

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can update users' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, isSuperAdmin, role } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(isSuperAdmin !== undefined && { isSuperAdmin }),
        ...(role && { role }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        role: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: userId,
        userEmail: session.user.email,
        details: {
          changes: { isSuperAdmin, role },
          updatedUser: updatedUser.email,
        },
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// Delete user
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is super admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isSuperAdmin: true, id: true },
    })

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can delete users' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Don't allow deleting yourself
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Get user info before deletion
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_DELETED',
        entityType: 'user',
        entityId: userId,
        userEmail: session.user.email,
        details: {
          deletedUserEmail: userToDelete.email,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
