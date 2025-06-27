// Quick script to check and fix user accounts
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.log('Usage: node scripts/fix-user.js <email>')
    process.exit(1)
  }

  console.log(`Checking user with email: ${email}`)
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: true
    }
  })
  
  if (!user) {
    console.log('User not found')
    return
  }
  
  console.log('User found:', {
    id: user.id,
    email: user.email,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin,
    agencyId: user.agencyId,
    accountsCount: user.accounts.length
  })
  
  if (user.accounts.length === 0) {
    console.log('No OAuth accounts linked. User needs to be deleted to re-authenticate.')
    
    const response = process.argv[3]
    if (response === '--delete') {
      // Delete the user
      await prisma.user.delete({
        where: { id: user.id }
      })
      console.log('User deleted. They can now sign in fresh.')
    } else {
      console.log('To delete this user, run: node scripts/fix-user.js ' + email + ' --delete')
    }
  } else {
    console.log('OAuth accounts:', user.accounts.map(a => ({
      provider: a.provider,
      providerAccountId: a.providerAccountId
    })))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())