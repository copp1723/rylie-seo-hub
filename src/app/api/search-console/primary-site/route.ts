import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { siteUrl } = await req.json()
    
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL required' },
        { status: 400 }
      )
    }

    // Update the primary site for the user
    await prisma.userSearchConsoleToken.update({
      where: { userId: session.user.id },
      data: { primarySite: siteUrl },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update primary site:', error)
    return NextResponse.json(
      { error: 'Failed to update primary site' },
      { status: 500 }
    )
  }
}