import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { themeUpdateSchema, validateRequest } from '@/lib/validation'
import { rateLimits } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimits.api(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }
    const userId = session.user.id

    // Get user with agency theme
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agency: {
          select: {
            name: true,
            primaryColor: true,
            secondaryColor: true,
            logo: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      )
    }

    // Use agency theme if user belongs to an agency, otherwise use defaults
    const theme = user.agency
      ? {
          companyName: user.agency.name,
          primaryColor: user.agency.primaryColor,
          secondaryColor: user.agency.secondaryColor,
          logo: user.agency.logo,
        }
      : {
          companyName: 'Rylie SEO Hub',
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af',
          logo: null,
        }

    return NextResponse.json({
      success: true,
      theme,
    })
  } catch (error) {
    console.error('Get Theme Error:', error)
    return NextResponse.json({ error: 'Failed to get theme' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimits.api(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }
    const userId = session.user.id

    // Validate request body
    const body = await request.json()
    const validation = validateRequest(themeUpdateSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          details: validation.details.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }

    const { companyName, primaryColor, secondaryColor, logo } = validation.data

    // Get user and their agency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agency: true },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      )
    }

    if (!user.agencyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User must belong to an agency to update theme',
        },
        { status: 400 }
      )
    }

    // Update agency theme
    const updatedAgency = await prisma.agency.update({
      where: { id: user.agencyId },
      data: {
        name: companyName || undefined,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined,
        logo: logo || undefined,
      },
      select: {
        name: true,
        primaryColor: true,
        secondaryColor: true,
        logo: true,
      },
    })

    return NextResponse.json({
      success: true,
      theme: {
        companyName: updatedAgency.name,
        primaryColor: updatedAgency.primaryColor,
        secondaryColor: updatedAgency.secondaryColor,
        logo: updatedAgency.logo,
      },
    })
  } catch (error) {
    console.error('Update Theme Error:', error)
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 })
  }
}
