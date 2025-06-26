#!/usr/bin/env tsx
/**
 * Test script for GA4 Properties endpoint
 * Usage: tsx scripts/test-ga4-properties.ts
 */

async function testGA4Properties() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
  
  console.log('🔍 Testing GA4 Properties endpoint...')
  console.log(`Base URL: ${baseUrl}`)
  
  try {
    // Note: This test assumes you have a valid session cookie
    // In a real test, you would need to authenticate first
    const response = await fetch(`${baseUrl}/api/ga4/properties`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add session cookie if available
        // 'Cookie': 'authjs.session-token=YOUR_SESSION_TOKEN'
      },
    })
    
    const data = await response.json()
    
    console.log('\n📊 Response Status:', response.status)
    console.log('📋 Response Data:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('\n✅ Success! Found', data.count, 'properties')
      if (data.properties && data.properties.length > 0) {
        console.log('\n📌 Properties:')
        data.properties.forEach((prop: any, index: number) => {
          console.log(`\n${index + 1}. ${prop.propertyName}`)
          console.log(`   Account: ${prop.accountName}`)
          console.log(`   Property ID: ${prop.propertyId}`)
          if (prop.measurementId) {
            console.log(`   Measurement ID: ${prop.measurementId}`)
          }
        })
      }
    } else {
      console.log('\n❌ Error:', data.error)
      console.log('Error Code:', data.code)
    }
  } catch (error) {
    console.error('\n🔥 Request failed:', error)
  }
}

// Run the test
testGA4Properties()
  .then(() => {
    console.log('\n✨ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })