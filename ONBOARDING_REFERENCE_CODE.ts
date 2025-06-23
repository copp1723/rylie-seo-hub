/**
 * REFERENCE IMPLEMENTATION - SEOWerks Onboarding Integration
 * 
 * This file contains the complete onboarding implementation from:
 * /Users/copp1723/Desktop/[expired] repos/seorylie/web-console/src/services/seowerks-integration.ts
 * 
 * Copy this logic into the new Rylie SEO Hub implementation
 */

export interface SEOWerksSubmissionData {
  // Required fields matching SEOWerks form
  dealerName: string;
  package: 'PLATINUM' | 'GOLD' | 'SILVER';
  mainBrand: string;
  otherBrand?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dealerContactName: string;
  dealerContactTitle: string;
  dealerContactEmail: string;
  dealerContactPhone: string;
  dealerWebsiteUrl: string;
  billingContactEmail: string;
  siteAccessNotes: string;
  targetVehicleModels: string[];
  targetCities: string[];
  targetDealers: string[];
}

/**
 * Transform onboarding data to SEOWerks format
 */
export function transformToSEOWerksFormat(onboardingData: any): SEOWerksSubmissionData {
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
  };
}

/**
 * Submit data to SEOWerks platform
 */
export async function submitToSEOWerks(data: SEOWerksSubmissionData): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    // Create form data to match SEOWerks form submission
    const formData = new FormData();
    
    // Map all fields to form data
    formData.append('dealer_name', data.dealerName);
    formData.append('package', data.package);
    formData.append('main_brand', data.mainBrand);
    if (data.otherBrand) {
      formData.append('other_brand', data.otherBrand);
    }
    formData.append('address', data.address);
    formData.append('city', data.city);
    formData.append('state', data.state);
    formData.append('zip_code', data.zipCode);
    formData.append('dealer_contact_name', data.dealerContactName);
    formData.append('dealer_contact_title', data.dealerContactTitle);
    formData.append('dealer_contact_email', data.dealerContactEmail);
    formData.append('dealer_contact_phone', data.dealerContactPhone);
    formData.append('dealer_website_url', data.dealerWebsiteUrl);
    formData.append('billing_contact_email', data.billingContactEmail);
    formData.append('site_access_notes', data.siteAccessNotes);
    
    // Add target arrays
    data.targetVehicleModels.forEach((model, index) => {
      formData.append(`target_vehicle_models[${index}]`, model);
    });
    
    data.targetCities.forEach((city, index) => {
      formData.append(`target_cities[${index}]`, city);
    });
    
    data.targetDealers.forEach((dealer, index) => {
      formData.append(`target_dealers[${index}]`, dealer);
    });

    // Submit to SEOWerks
    const response = await fetch('https://start.seowerks.ai/', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Origin': window.location.origin,
      },
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Successfully submitted to SEOWerks platform',
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('SEOWerks submission error:', error);
    return {
      success: false,
      message: 'Failed to submit to SEOWerks platform',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate required fields for SEOWerks submission
 */
export function validateSEOWerksData(data: Partial<SEOWerksSubmissionData>): {
  isValid: boolean;
  missingFields: string[];
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
  ];

  const missingFields: string[] = [];

  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field]?.trim())) {
      missingFields.push(field);
    }
  });

  // Validate arrays have at least 3 items
  if (!data.targetVehicleModels || data.targetVehicleModels.filter(Boolean).length < 3) {
    missingFields.push('targetVehicleModels (minimum 3)');
  }

  if (!data.targetCities || data.targetCities.filter(Boolean).length < 3) {
    missingFields.push('targetCities (minimum 3)');
  }

  if (!data.targetDealers || data.targetDealers.filter(Boolean).length < 3) {
    missingFields.push('targetDealers (minimum 3)');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Example form field mapping for reference:
 * 
 * Form Field Name -> FormData Key
 * --------------------------------
 * Business Name -> dealer_name
 * Package (SILVER/GOLD/PLATINUM) -> package
 * Main Brand -> main_brand
 * Other Brand -> other_brand
 * Address -> address
 * City -> city
 * State -> state
 * Zip Code -> zip_code
 * Contact Name -> dealer_contact_name
 * Contact Title -> dealer_contact_title
 * Contact Email -> dealer_contact_email
 * Contact Phone -> dealer_contact_phone
 * Website URL -> dealer_website_url
 * Billing Email -> billing_contact_email
 * Site Access Notes -> site_access_notes
 * Target Vehicles Array -> target_vehicle_models[0], target_vehicle_models[1], etc.
 * Target Cities Array -> target_cities[0], target_cities[1], etc.
 * Target Dealers Array -> target_dealers[0], target_dealers[1], etc.
 */
