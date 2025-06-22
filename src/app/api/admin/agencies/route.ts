import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createAgencySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['starter', 'growth', 'enterprise']).default('starter'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    })
    
    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }
    
    const body = await request.json()
    const validatedData = createAgencySchema.parse(body)
    
    // Check if slug already exists
    const existingAgency = await prisma.agency.findUnique({
      where: { slug: validatedData.slug },
    })
    
    if (existingAgency) {
      return NextResponse.json({ error: 'Agency slug already exists' }, { status: 400 })
    }
    
    // Create the agency
    const agency = await prisma.agency.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        plan: validatedData.plan,
        status: 'active',
      },
      include: {
        _count: {
          select: {
            users: true,
            conversations: true,
          },
        },
      },
    })
    
    return NextResponse.json(agency)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Failed to create agency:', error)
    return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 })
  }
}