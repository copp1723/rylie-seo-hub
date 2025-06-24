import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

async function runMigrations() {
  console.log('🔄 Running Phase 1 migrations...')
  
  try {
    // Generate Prisma client
    console.log('📦 Generating Prisma client...')
    await execAsync('npx prisma generate')
    
    // Push schema changes to database
    console.log('🗃️ Pushing schema changes to database...')
    await execAsync('npx prisma db push')
    
    // Update existing data
    console.log('🔧 Updating existing data...')
    
    // Update role values to uppercase
    await prisma.user.updateMany({
      where: { role: 'user' },
      data: { role: 'USER' }
    })
    
    await prisma.user.updateMany({
      where: { role: 'admin' },
      data: { role: 'ADMIN' }
    })
    
    await prisma.user.updateMany({
      where: { role: 'viewer' },
      data: { role: 'VIEWER' }
    })
    
    // Update message roles to uppercase
    await prisma.message.updateMany({
      where: { role: 'user' },
      data: { role: 'USER' }
    })
    
    await prisma.message.updateMany({
      where: { role: 'assistant' },
      data: { role: 'ASSISTANT' }
    })
    
    await prisma.message.updateMany({
      where: { role: 'system' },
      data: { role: 'SYSTEM' }
    })
    
    // Update orders to have userId if missing
    const orders = await prisma.order.findMany({
      where: { userId: null },
      include: { user: true }
    })
    
    for (const order of orders) {
      if (order.user) {
        await prisma.order.update({
          where: { id: order.id },
          data: { userId: order.user.id }
        })
      }
    }
    
    // Ensure all orders have agencyId
    const ordersWithoutAgency = await prisma.order.findMany({
      where: { agencyId: null },
      include: { user: { include: { agency: true } } }
    })
    
    for (const order of ordersWithoutAgency) {
      if (order.user?.agencyId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { agencyId: order.user.agencyId }
        })
      }
    }
    
    console.log('✅ Migrations completed successfully!')
    
    // Verify the changes
    console.log('\n📊 Verification:')
    const userCount = await prisma.user.count()
    const orderCount = await prisma.order.count()
    const conversationCount = await prisma.conversation.count()
    
    console.log(`- Users: ${userCount}`)
    console.log(`- Orders: ${orderCount}`)
    console.log(`- Conversations: ${conversationCount}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migrations
runMigrations().catch(console.error)