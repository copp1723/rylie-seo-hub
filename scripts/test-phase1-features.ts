import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const API_BASE = 'http://localhost:3001/api'

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testPhase1Features() {
  console.log('🧪 Testing Phase 1 Core Features...\n')
  
  const tests = {
    passed: 0,
    failed: 0,
    errors: [] as string[]
  }
  
  // Test 1: Chat API - Create conversation
  console.log('1️⃣ Testing Chat API - Create conversation...')
  try {
    const chatResponse = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What are the best SEO practices for automotive dealerships?',
        model: 'openai/gpt-3.5-turbo'
      })
    })
    
    if (chatResponse.ok) {
      const data = await chatResponse.json()
      console.log('✅ Chat API working - Conversation ID:', data.conversation?.id)
      tests.passed++
    } else {
      const error = await chatResponse.text()
      console.log('❌ Chat API failed:', error)
      tests.failed++
      tests.errors.push(`Chat API: ${error}`)
    }
  } catch (error) {
    console.log('❌ Chat API error:', error)
    tests.failed++
    tests.errors.push(`Chat API: ${error}`)
  }
  
  // Test 2: Streaming Chat API
  console.log('\n2️⃣ Testing Streaming Chat API...')
  try {
    const streamResponse = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tell me about local SEO',
        model: 'openai/gpt-3.5-turbo'
      })
    })
    
    if (streamResponse.ok) {
      console.log('✅ Streaming Chat API endpoint accessible')
      tests.passed++
    } else {
      const error = await streamResponse.text()
      console.log('❌ Streaming Chat API failed:', error)
      tests.failed++
      tests.errors.push(`Streaming Chat: ${error}`)
    }
  } catch (error) {
    console.log('❌ Streaming Chat API error:', error)
    tests.failed++
    tests.errors.push(`Streaming Chat: ${error}`)
  }
  
  // Test 3: Orders API - Create order
  console.log('\n3️⃣ Testing Orders API - Create order...')
  let orderId: string | null = null
  try {
    const orderResponse = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskType: 'blog',
        title: 'Best Electric Vehicles for 2025',
        description: 'Create a comprehensive blog post about the top electric vehicles available in 2025',
        estimatedHours: 3,
        keywords: ['electric vehicles', '2025 EVs', 'best electric cars'],
        priority: 'high'
      })
    })
    
    if (orderResponse.ok) {
      const data = await orderResponse.json()
      orderId = data.data?.id
      console.log('✅ Order created successfully - ID:', orderId)
      tests.passed++
    } else {
      const error = await orderResponse.text()
      console.log('❌ Order creation failed:', error)
      tests.failed++
      tests.errors.push(`Order Creation: ${error}`)
    }
  } catch (error) {
    console.log('❌ Order creation error:', error)
    tests.failed++
    tests.errors.push(`Order Creation: ${error}`)
  }
  
  // Test 4: Orders API - List orders
  console.log('\n4️⃣ Testing Orders API - List orders...')
  try {
    const listResponse = await fetch(`${API_BASE}/orders?status=all&limit=10`)
    
    if (listResponse.ok) {
      const data = await listResponse.json()
      console.log(`✅ Orders listed successfully - Count: ${data.data?.orders?.length || 0}`)
      tests.passed++
    } else {
      const error = await listResponse.text()
      console.log('❌ Order listing failed:', error)
      tests.failed++
      tests.errors.push(`Order Listing: ${error}`)
    }
  } catch (error) {
    console.log('❌ Order listing error:', error)
    tests.failed++
    tests.errors.push(`Order Listing: ${error}`)
  }
  
  // Test 5: Orders API - Update order status
  if (orderId) {
    console.log('\n5️⃣ Testing Orders API - Update order status...')
    try {
      const updateResponse = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          assignedTo: 'John Doe'
        })
      })
      
      if (updateResponse.ok) {
        console.log('✅ Order status updated successfully')
        tests.passed++
      } else {
        const error = await updateResponse.text()
        console.log('❌ Order update failed:', error)
        tests.failed++
        tests.errors.push(`Order Update: ${error}`)
      }
    } catch (error) {
      console.log('❌ Order update error:', error)
      tests.failed++
      tests.errors.push(`Order Update: ${error}`)
    }
  }
  
  // Test 6: Order Messages API
  if (orderId) {
    console.log('\n6️⃣ Testing Order Messages API...')
    try {
      const messageResponse = await fetch(`${API_BASE}/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Started working on this blog post. Research phase in progress.',
          type: 'status_update'
        })
      })
      
      if (messageResponse.ok) {
        console.log('✅ Order message created successfully')
        tests.passed++
      } else {
        const error = await messageResponse.text()
        console.log('❌ Order message creation failed:', error)
        tests.failed++
        tests.errors.push(`Order Message: ${error}`)
      }
    } catch (error) {
      console.log('❌ Order message error:', error)
      tests.failed++
      tests.errors.push(`Order Message: ${error}`)
    }
  }
  
  // Test 7: Conversations API
  console.log('\n7️⃣ Testing Conversations API...')
  try {
    const convResponse = await fetch(`${API_BASE}/conversations`)
    
    if (convResponse.ok) {
      const data = await convResponse.json()
      console.log(`✅ Conversations listed successfully - Count: ${data.conversations?.length || 0}`)
      tests.passed++
    } else {
      const error = await convResponse.text()
      console.log('❌ Conversations listing failed:', error)
      tests.failed++
      tests.errors.push(`Conversations: ${error}`)
    }
  } catch (error) {
    console.log('❌ Conversations error:', error)
    tests.failed++
    tests.errors.push(`Conversations: ${error}`)
  }
  
  // Test 8: Analytics Dashboard API
  console.log('\n8️⃣ Testing Analytics Dashboard API...')
  try {
    const analyticsResponse = await fetch(`${API_BASE}/analytics/dashboard`)
    
    if (analyticsResponse.ok) {
      const data = await analyticsResponse.json()
      console.log('✅ Analytics dashboard data retrieved successfully')
      if (data.orders) {
        console.log(`   - Total Orders: ${data.orders.total}`)
        console.log(`   - Pending: ${data.orders.byStatus.pending || 0}`)
        console.log(`   - In Progress: ${data.orders.byStatus.in_progress || 0}`)
        console.log(`   - Completed: ${data.orders.byStatus.completed || 0}`)
      }
      tests.passed++
    } else {
      const error = await analyticsResponse.text()
      console.log('❌ Analytics dashboard failed:', error)
      tests.failed++
      tests.errors.push(`Analytics: ${error}`)
    }
  } catch (error) {
    console.log('❌ Analytics error:', error)
    tests.failed++
    tests.errors.push(`Analytics: ${error}`)
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${tests.passed}`)
  console.log(`❌ Failed: ${tests.failed}`)
  console.log(`📈 Success Rate: ${Math.round((tests.passed / (tests.passed + tests.failed)) * 100)}%`)
  
  if (tests.errors.length > 0) {
    console.log('\n❗ Errors:')
    tests.errors.forEach(error => console.log(`   - ${error}`))
  }
  
  if (tests.failed > 0) {
    console.log('\n⚠️  Some tests failed. Please check:')
    console.log('1. Is the server running? (npm run dev)')
    console.log('2. Is the database set up? (npm run db:setup)')
    console.log('3. Are environment variables configured?')
    console.log('4. Check AUTH_DISABLED=true in .env')
  } else {
    console.log('\n🎉 All tests passed! Phase 1 features are working correctly.')
  }
}

// Run the tests
console.log('Starting Phase 1 feature tests...')
console.log('Make sure the server is running on http://localhost:3001\n')

testPhase1Features().catch(console.error)