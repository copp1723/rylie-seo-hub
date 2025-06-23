import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateSEOWerksData, transformToSEOWerksFormat, submitToSEOWerks } from '@/lib/seoworks-onboarding'

interface OnboardingFormData {
  businessName: string
  package: 'SILVER' | 'GOLD' | 'PLATINUM'
  mainBrand: string
  otherBrand?: string
  address: string
  city: string
  state: string
  zipCode: string
  contactName: string
  contactTitle: string
  email: string
  phone: string
  websiteUrl: string
  billingEmail: string
  siteAccessNotes: string
  targetVehicleModels: string[]
  targetCities: string[]
  targetDealers: string[]
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user and agency
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agency: true }
    })

    if (!user || !user.agency) {
      return NextResponse.json(
        { error: 'User or agency not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const formData: OnboardingFormData = await req.json()

    // Validate the data
    const seoworksData = transformToSEOWerksFormat(formData)
    const validation = validateSEOWerksData(seoworksData)

    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          missingFields: validation.missingFields 
        },
        { status: 400 }
      )
    }

    // Save to database first
    const onboarding = await prisma.dealershipOnboarding.create({
      data: {
        agencyId: user.agencyId!,
        businessName: formData.businessName,
        package: formData.package,
        mainBrand: formData.mainBrand,
        otherBrand: formData.otherBrand,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        contactName: formData.contactName,
        contactTitle: formData.contactTitle,
        email: formData.email,
        phone: formData.phone,
        websiteUrl: formData.websiteUrl,
        billingEmail: formData.billingEmail,
        siteAccessNotes: formData.siteAccessNotes,
        targetVehicleModels: formData.targetVehicleModels,
        targetCities: formData.targetCities,
        targetDealers: formData.targetDealers,
        submittedBy: user.email,
        status: 'pending' // Will be updated after SEOWerks submission
      }
    })

    // Submit to SEOWerks
    const seoworksResult = await submitToSEOWerks(seoworksData)

    // Update onboarding record with submission status
    await prisma.dealershipOnboarding.update({
      where: { id: onboarding.id },
      data: {
        status: seoworksResult.success ? 'submitted' : 'failed',
        seoworksResponse: seoworksResult,
        submittedAt: seoworksResult.success ? new Date() : null
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'ONBOARDING_SUBMITTED',
        entityType: 'dealership_onboarding',
        entityId: onboarding.id,
        userEmail: user.email,
        details: JSON.stringify({
          success: seoworksResult.success,
          businessName: formData.businessName,
          package: formData.package,
          seoworksResponse: seoworksResult
        })
      }
    })

    if (seoworksResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Onboarding submitted successfully',
        onboardingId: onboarding.id
      })
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to submit to SEOWerks',
          details: seoworksResult.error 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Onboarding submission error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user and agency
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agency: true }
    })

    if (!user || !user.agency) {
      return NextResponse.json(
        { error: 'User or agency not found' },
        { status: 404 }
      )
    }

    // Get onboarding records for this agency
    const onboardings = await prisma.dealershipOnboarding.findMany({
      where: { agencyId: user.agencyId! },
      orderBy: { createdAt: 'desc' },
      take: 10 // Limit to recent 10 records
    })

    return NextResponse.json({ onboardings })

  } catch (error) {
    console.error('Error fetching onboarding records:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}