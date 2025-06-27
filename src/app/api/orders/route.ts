import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with agency info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { agency: true }
    })

    if (!user?.agencyId) {
      return NextResponse.json({ error: 'User not associated with an agency' }, { status: 400 })
    }

    // Fetch orders for the user's agency
    const orders = await prisma.order.findMany({
      where: {
        agencyId: user.agencyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}