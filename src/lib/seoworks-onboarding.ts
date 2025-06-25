/**
 * SEOWerks Onboarding Integration
 *
 * This module handles the transformation and submission of dealership onboarding data
 * to the SEOWerks platform at https://start.seowerks.ai/
 */

export interface SEOWerksSubmissionData {
  // Required fields matching SEOWerks form
  dealerName: string
  package: 'PLATINUM' | 'GOLD' | 'SILVER'
  mainBrand: string
  otherBrand?: string
  address: string
  city: string
  state: string
  zipCode: string
  dealerContactName: string
  dealerContactTitle: string
  dealerContactEmail: string
  dealerContactPhone: string
  dealerWebsiteUrl: string
  billingContactEmail: string
  siteAccessNotes: string
  targetVehicleModels: string[]
  targetCities: string[]
  targetDealers: string[]
}

export interface OnboardingFormData {
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

/**
 * Transform onboarding data to SEOWerks format
 */
export function transformToSEOWerksFormat(
  onboardingData: OnboardingFormData
): SEOWerksSubmissionData {
  return {
    dealerName: onboardingData.businessName,
    package: onboardingData.package,
    mainBrand: onboardingData.mainBrand,
    otherBrand: onboardingData.otherBrand,
    address: onboardingData.address,
    city: onboardingData.city,
    state: onboardingData.state,
    zipCode: onboardingData.zipCode,
    dealerContactName: onboardingData.contactName,
    dealerContactTitle: onboardingData.contactTitle,
    dealerContactEmail: onboardingData.email,
    dealerContactPhone: onboardingData.phone,
    dealerWebsiteUrl: onboardingData.websiteUrl,
    billingContactEmail: onboardingData.billingEmail,
    siteAccessNotes: onboardingData.siteAccessNotes,
    targetVehicleModels: onboardingData.targetVehicleModels.filter(Boolean),
    targetCities: onboardingData.targetCities.filter(Boolean),
    targetDealers: onboardingData.targetDealers.filter(Boolean),
  }
}

/**
 * Submit data to SEOWerks platform
 */
export async function submitToSEOWerks(data: SEOWerksSubmissionData): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    // Create form data to match SEOWerks form submission
    const formData = new FormData()

    // Map all fields to form data with exact field names used by SEOWerks
    formData.append('dealer_name', data.dealerName)
    formData.append('package', data.package)
    formData.append('main_brand', data.mainBrand)
    if (data.otherBrand) {
      formData.append('other_brand', data.otherBrand)
    }
    formData.append('address', data.address)
    formData.append('city', data.city)
    formData.append('state', data.state)
    formData.append('zip_code', data.zipCode)
    formData.append('dealer_contact_name', data.dealerContactName)
    formData.append('dealer_contact_title', data.dealerContactTitle)
    formData.append('dealer_contact_email', data.dealerContactEmail)
    formData.append('dealer_contact_phone', data.dealerContactPhone)
    formData.append('dealer_website_url', data.dealerWebsiteUrl)
    formData.append('billing_contact_email', data.billingContactEmail)
    formData.append('site_access_notes', data.siteAccessNotes)

    // Add target arrays with indexed field names
    data.targetVehicleModels.forEach((model, index) => {
      formData.append(`target_vehicle_models[${index}]`, model)
    })

    data.targetCities.forEach((city, index) => {
      formData.append(`target_cities[${index}]`, city)
    })

    data.targetDealers.forEach((dealer, index) => {
      formData.append(`target_dealers[${index}]`, dealer)
    })

    // Log the submission for debugging
    console.log('Submitting to SEOWerks:', {
      dealerName: data.dealerName,
      package: data.package,
      targetArraysLength: {
        vehicles: data.targetVehicleModels.length,
        cities: data.targetCities.length,
        dealers: data.targetDealers.length,
      },
    })

    // Submit to SEOWerks
    const response = await fetch('https://start.seowerks.ai/', {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Rylie-SEO-Hub/1.0',
      },
    })

    console.log('SEOWerks response status:', response.status)

    if (response.ok) {
      return {
        success: true,
        message: 'Successfully submitted to SEOWerks platform',
      }
    } else {
      const responseText = await response.text()
      console.error('SEOWerks submission failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
      })

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('SEOWerks submission error:', error)
    return {
      success: false,
      message: 'Failed to submit to SEOWerks platform',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate required fields for SEOWerks submission
 */
export function validateSEOWerksData(data: Partial<SEOWerksSubmissionData>): {
  isValid: boolean
  missingFields: string[]
} {
  const requiredFields: (keyof SEOWerksSubmissionData)[] = [
    'dealerName',
    'package',
    'mainBrand',
    'address',
    'city',
    'state',
    'zipCode',
    'dealerContactName',
    'dealerContactTitle',
    'dealerContactEmail',
    'dealerContactPhone',
    'dealerWebsiteUrl',
    'billingContactEmail',
  ]

  const missingFields: string[] = []

  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field]?.trim())) {
      missingFields.push(field)
    }
  })

  // Validate arrays have at least 3 items
  if (!data.targetVehicleModels || data.targetVehicleModels.filter(Boolean).length < 3) {
    missingFields.push('targetVehicleModels (minimum 3)')
  }

  if (!data.targetCities || data.targetCities.filter(Boolean).length < 3) {
    missingFields.push('targetCities (minimum 3)')
  }

  if (!data.targetDealers || data.targetDealers.filter(Boolean).length < 3) {
    missingFields.push('targetDealers (minimum 3)')
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Get package details for display purposes
 */
export function getPackageDetails(packageType: 'SILVER' | 'GOLD' | 'PLATINUM') {
  const packages = {
    SILVER: {
      name: 'Silver',
      priority: 'Standard',
      features: ['Basic SEO', 'Monthly Reports', 'Email Support'],
    },
    GOLD: {
      name: 'Gold',
      priority: 'High',
      features: ['Advanced SEO', 'Bi-weekly Reports', 'Phone Support', 'Social Media Management'],
    },
    PLATINUM: {
      name: 'Platinum',
      priority: 'Premium',
      features: [
        'Full SEO Suite',
        'Weekly Reports',
        '24/7 Support',
        'Social Media Management',
        'Custom Development',
      ],
    },
  }

  return packages[packageType]
}
