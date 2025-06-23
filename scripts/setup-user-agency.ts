#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'

async function setupUserAgency(email: string) {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { agency: true }
    })

    if (!user) {
      console.error(`❌ User with email ${email} not found`)
      process.exit(1)
    }

    if (user.agency) {
      console.log(`✅ User already has an agency: ${user.agency.name}`)
      process.exit(0)
    }

    // Create a default agency
    const agency = await prisma.agency.create({
      data: {
        name: 'Default Agency',
        slug: 'default-agency',
        plan: 'professional',
        status: 'active',
        maxUsers: 10,
        maxConversations: 1000,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af'
      }
    })

    // Associate user with agency
    await prisma.user.update({
      where: { id: user.id },
      data: {
        agencyId: agency.id,
        role: 'admin'
      }
    })

    console.log(`✅ Created agency "${agency.name}" and assigned user as admin`)
    console.log(`   Agency ID: ${agency.id}`)
    console.log(`   Plan: ${agency.plan}`)
    console.log(`   Status: ${agency.status}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.error('Usage: npm run setup-user-agency -- user@example.com')
  process.exit(1)
}

setupUserAgency(email)