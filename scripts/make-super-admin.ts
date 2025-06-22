import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function makeSuperAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isSuperAdmin: true },
    })
    
    console.log(`✅ Successfully made ${email} a super admin!`)
    console.log('User details:', {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      role: user.role,
      agencyId: user.agencyId,
    })
  } catch (error) {
    console.error('❌ Error making user super admin:', error)
    console.log('Make sure the user has logged in at least once first.')
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('Please provide an email address')
  console.log('Usage: npx tsx scripts/make-super-admin.ts your-email@example.com')
  process.exit(1)
}

makeSuperAdmin(email)