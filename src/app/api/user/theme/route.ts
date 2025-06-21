import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Demo mode: Use mock user for development
    const isDemoMode = process.env.NODE_ENV === "development"
    let userId = null
    
    if (isDemoMode) {
      userId = "demo-user-1"
    } else {
      // In production, get from session
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        primaryColor: true,
        secondaryColor: true,
        logo: true,
      },
    })

    if (!user) {
      // Create demo user if doesn't exist
      user = await prisma.user.create({
        data: {
          id: userId,
          name: "Demo User",
          email: "demo@rylie-seo.com",
          companyName: "Rylie SEO Hub",
          primaryColor: "#3b82f6",
          secondaryColor: "#1e40af",
        },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          primaryColor: true,
          secondaryColor: true,
          logo: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      theme: {
        companyName: user.companyName || "Rylie SEO Hub",
        primaryColor: user.primaryColor || "#3b82f6",
        secondaryColor: user.secondaryColor || "#1e40af",
        logo: user.logo,
      },
    })

  } catch (error) {
    console.error('Get Theme Error:', error)
    return NextResponse.json(
      { error: 'Failed to get theme' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Demo mode: Use mock user for development
    const isDemoMode = process.env.NODE_ENV === "development"
    let userId = null
    
    if (isDemoMode) {
      userId = "demo-user-1"
    } else {
      // In production, get from session
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { companyName, primaryColor, secondaryColor, logo } = await request.json()

    // Update user theme
    const updatedUser = await prisma.user.upsert({
      where: { id: userId },
      update: {
        companyName: companyName || undefined,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined,
        logo: logo || undefined,
      },
      create: {
        id: userId,
        name: "Demo User",
        email: "demo@rylie-seo.com",
        companyName: companyName || "Rylie SEO Hub",
        primaryColor: primaryColor || "#3b82f6",
        secondaryColor: secondaryColor || "#1e40af",
        logo: logo,
      },
      select: {
        companyName: true,
        primaryColor: true,
        secondaryColor: true,
        logo: true,
      },
    })

    return NextResponse.json({
      success: true,
      theme: {
        companyName: updatedUser.companyName,
        primaryColor: updatedUser.primaryColor,
        secondaryColor: updatedUser.secondaryColor,
        logo: updatedUser.logo,
      },
    })

  } catch (error) {
    console.error('Update Theme Error:', error)
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    )
  }
}

