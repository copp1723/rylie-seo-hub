import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeAgenciesForExistingUsers() {
  console.log('🚀 Starting agency initialization for existing users...')
  
  try {
    // Find all users without an agency
    const usersWithoutAgency = await prisma.user.findMany({
      where: {
        agencyId: null
      }
    })

    console.log(`Found ${usersWithoutAgency.length} users without agencies`)

    for (const user of usersWithoutAgency) {
      console.log(`Creating agency for user: ${user.email}`)
      
      // Create agency for the user
      const agency = await prisma.agency.create({
        data: {
          name: `${user.email.split('@')[0]}'s Agency`,
          slug: `agency-${user.id.slice(-8)}`,
          plan: 'starter',
          status: 'active',
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af'
        }
      })

      // Update user with agency relationship
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          agencyId: agency.id,
          role: 'admin' // First user becomes admin
        }
      })

      // Update existing conversations to belong to the agency
      await prisma.conversation.updateMany({
        where: { userId: user.id },
        data: { agencyId: agency.id }
      })

      // Update existing messages to belong to the agency
      await prisma.message.updateMany({
        where: { userId: user.id },
        data: { agencyId: agency.id }
      })

      // Update existing themes to belong to the agency
      await prisma.theme.updateMany({
        where: { 
          // Find themes that might belong to this user
          // Since we don't have a direct relationship, we'll create a new one
        },
        data: { agencyId: agency.id }
      })

      console.log(`✅ Created agency "${agency.name}" for ${user.email}`)
    }

    console.log('🎉 Agency initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during agency initialization:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  initializeAgenciesForExistingUsers()
    .then(() => {
      console.log('Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

export { initializeAgenciesForExistingUsers }

