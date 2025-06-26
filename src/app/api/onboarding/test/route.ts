import { NextRequest, NextResponse } from 'next/server'
import { transformToWebhookFormat } from '@/lib/seoworks-onboarding'

// Test endpoint to show the exact JSON format that will be sent to Jeff's webhook
export async function GET(req: NextRequest) {
  // Sample onboarding data
  const sampleData = {
    businessName: 'Example Dealership',
    package: 'GOLD' as const,
    mainBrand: 'Toyota',
    otherBrand: 'Lexus',
    address: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    contactName: 'John Smith',
    contactTitle: 'General Manager',
    email: 'john.smith@example.com',
    phone: '(512) 555-0123',
    websiteUrl: 'https://www.exampledealership.com',
    billingEmail: 'billing@exampledealership.com',
    siteAccessNotes: 'WordPress admin access will be provided via email',
    targetVehicleModels: ['Toyota Camry', 'Toyota RAV4', 'Toyota Highlander', 'Lexus RX350'],
    targetCities: ['Austin', 'Round Rock', 'Cedar Park', 'Georgetown', 'Pflugerville'],
    targetDealers: ['Competitor Auto Group', 'City Motors', 'Premier Toyota of Downtown'],
  }

  // Transform to webhook format
  const webhookData = transformToWebhookFormat(sampleData)

  return NextResponse.json({
    description: 'This is the exact JSON format that will be sent to your webhook endpoint',
    webhookUrl: process.env.SEOWORKS_WEBHOOK_URL || '[SEOWORKS_WEBHOOK_URL not configured]',
    authentication: {
      header: 'x-api-key',
      value: process.env.SEOWORKS_WEBHOOK_SECRET ? '[configured]' : '[SEOWORKS_WEBHOOK_SECRET not configured]',
    },
    samplePayload: webhookData,
    notes: {
      semicolonDelimitedFields: [
        'targetVehicleModels - Vehicle models separated by semicolons',
        'targetCities - Cities separated by semicolons',
        'targetDealers - Competitor dealerships separated by semicolons',
      ],
      minimumRequirements: 'Each semicolon-delimited field must have at least 3 items',
      emptyFields: 'Optional fields will be empty strings if not provided',
    },
  })
}

// Test endpoint to simulate sending the webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Use provided data or sample data
    const onboardingData = body || {
      businessName: 'Test Dealership',
      package: 'SILVER',
      mainBrand: 'Ford',
      otherBrand: '',
      address: '456 Test Street',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
      contactName: 'Jane Doe',
      contactTitle: 'Owner',
      email: 'jane@testdealer.com',
      phone: '(214) 555-0123',
      websiteUrl: 'https://www.testdealer.com',
      billingEmail: 'billing@testdealer.com',
      siteAccessNotes: '',
      targetVehicleModels: ['F-150', 'Explorer', 'Mustang'],
      targetCities: ['Dallas', 'Fort Worth', 'Arlington'],
      targetDealers: ['Rival Motors', 'City Ford', 'Metro Auto'],
    }

    // Transform to webhook format
    const webhookData = transformToWebhookFormat(onboardingData)

    // Check if webhook is configured
    const webhookUrl = process.env.SEOWORKS_WEBHOOK_URL
    const apiKey = process.env.SEOWORKS_WEBHOOK_SECRET

    if (!webhookUrl || !apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Webhook not configured',
        wouldSend: webhookData,
        missingConfig: {
          webhookUrl: !webhookUrl,
          apiKey: !apiKey,
        },
      })
    }

    // Send test webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify(webhookData),
    })

    const responseData = await response.text()
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseData)
    } catch {
      parsedResponse = responseData
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      sentPayload: webhookData,
      webhookResponse: parsedResponse,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
