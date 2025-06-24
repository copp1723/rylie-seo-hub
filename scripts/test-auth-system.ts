#!/usr/bin/env node

/**
 * Test script for the new auth system
 * Run with: npx tsx scripts/test-auth-system.ts
 */

import { getRequestUser, getTenantContext, checkPlanLimits } from '../src/lib/auth/user-resolver'

async function testAuthSystem() {
  console.log('🧪 Testing Auth System\n')
  
  // Test 1: Default user when AUTH_DISABLED=true
  console.log('Test 1: Getting default user (AUTH_DISABLED=true)')
  try {
    const user = await getRequestUser()
    console.log('✓ User:', user)
    
    if (user) {
      // Test 2: Get tenant context
      console.log('\nTest 2: Getting tenant context')
      const tenant = await getTenantContext(user)
      console.log('✓ Tenant:', tenant)
      
      // Test 3: Check plan limits
      console.log('\nTest 3: Checking plan limits')
      const conversationLimit = await checkPlanLimits(tenant, 'conversations')
      console.log('✓ Conversation limits:', conversationLimit)
      
      const orderLimit = await checkPlanLimits(tenant, 'orders')
      console.log('✓ Order limits:', orderLimit)
    }
  } catch (error) {
    console.error('✗ Error:', error)
  }
  
  // Test 4: Test the API endpoint
  console.log('\nTest 4: Testing API endpoint')
  try {
    const baseUrl = process.env.APP_URL || 'http://localhost:3001'
    const response = await fetch(`${baseUrl}/api/orders`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✓ API Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('✗ API Response:', response.status, response.statusText)
      const error = await response.json()
      console.log('  Error:', error)
    }
  } catch (error) {
    console.log('✗ Could not connect to API. Make sure the server is running.')
  }
}

// Run the test
testAuthSystem().catch(console.error)