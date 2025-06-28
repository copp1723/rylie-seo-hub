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

export interface SEOWerksSubmissionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Validates SEOWerks submission data
 */
export function validateSEOWerksData(data: SEOWerksSubmissionData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required string fields
  const requiredFields = [
    'dealerName', 'package', 'mainBrand', 'address', 'city', 'state', 'zipCode',
    'dealerContactName', 'dealerContactTitle', 'dealerContactEmail', 
    'dealerContactPhone', 'dealerWebsiteUrl', 'billingContactEmail', 'siteAccessNotes'
  ];

  for (const field of requiredFields) {
    if (!data[field as keyof SEOWerksSubmissionData] || 
        (typeof data[field as keyof SEOWerksSubmissionData] === 'string' && 
         (data[field as keyof SEOWerksSubmissionData] as string).trim() === '')) {
      errors.push(`${field} is required`);
    }
  }

  // Array fields must have at least 3 items
  const arrayFields = ['targetVehicleModels', 'targetCities', 'targetDealers'];
  for (const field of arrayFields) {
    const value = data[field as keyof SEOWerksSubmissionData] as string[];
    if (!Array.isArray(value) || value.length < 3) {
      errors.push(`${field} must have at least 3 items`);
    }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.dealerContactEmail)) {
    errors.push('dealerContactEmail must be a valid email');
  }
  if (!emailRegex.test(data.billingContactEmail)) {
    errors.push('billingContactEmail must be a valid email');
  }

  // Package validation
  if (!['PLATINUM', 'GOLD', 'SILVER'].includes(data.package)) {
    errors.push('package must be PLATINUM, GOLD, or SILVER');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Transforms form data to SEOWerks format and submits
 */
export async function submitToSEOWerks(data: SEOWerksSubmissionData): Promise<SEOWerksSubmissionResult> {
  try {
    // Validate data first
    const validation = validateSEOWerksData(data);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Validation failed',
        error: validation.errors.join(', ')
      };
    }

    // Create FormData for submission
    const formData = new FormData();
    
    // Map all fields to SEOWerks expected format
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
    
    // Handle arrays
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
      message: 'Failed to submit to SEOWerks',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Transform form data to SEOWerks format (for testing/preview)
 */
export function transformToSEOWerksFormat(data: SEOWerksSubmissionData): Record<string, any> {
  const transformed: Record<string, any> = {
    dealer_name: data.dealerName,
    package: data.package,
    main_brand: data.mainBrand,
    address: data.address,
    city: data.city,
    state: data.state,
    zip_code: data.zipCode,
    dealer_contact_name: data.dealerContactName,
    dealer_contact_title: data.dealerContactTitle,
    dealer_contact_email: data.dealerContactEmail,
    dealer_contact_phone: data.dealerContactPhone,
    dealer_website_url: data.dealerWebsiteUrl,
    billing_contact_email: data.billingContactEmail,
    site_access_notes: data.siteAccessNotes,
  };

  if (data.otherBrand) {
    transformed.other_brand = data.otherBrand;
  }

  // Add arrays
  data.targetVehicleModels.forEach((model, index) => {
    transformed[`target_vehicle_models[${index}]`] = model;
  });
  
  data.targetCities.forEach((city, index) => {
    transformed[`target_cities[${index}]`] = city;
  });
  
  data.targetDealers.forEach((dealer, index) => {
    transformed[`target_dealers[${index}]`] = dealer;
  });

  return transformed;
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
