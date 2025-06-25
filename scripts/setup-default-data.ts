#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Setting up default data...')

  try {
    // Create default agency
    const agency = await prisma.agency.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        id: 'default-agency',
        name: 'Default Agency',
        slug: 'default',
        status: 'active',
        plan: 'enterprise', // Give full access for testing
        maxUsers: 1000,
        maxConversations: 10000,
        maxOrders: 10000,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af'
      }
    })
    console.log('✓ Default agency created/updated:', agency.name)

    // Create test user
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {
        agencyId: agency.id,
        role: 'ADMIN',
        isSuperAdmin: true
      },
      create: {
        id: 'test-user-id',
        email: 'user@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isSuperAdmin: true,
        agencyId: agency.id
      }
    })
    console.log('✓ Test user created/updated:', user.email)

    // Create a welcome conversation
    const conversation = await prisma.conversation.upsert({
      where: { 
        id: 'welcome-conversation'
      },
      update: {},
      create: {
        id: 'welcome-conversation',
        title: 'Welcome to Rylie SEO Hub',
        model: 'gpt-4-turbo',
        userId: user.id,
        agencyId: agency.id,
        messageCount: 2
      }
    })
    console.log('✓ Welcome conversation created')

    // Add welcome messages
    await prisma.message.createMany({
      data: [
        {
          content: 'Hello! Welcome to Rylie SEO Hub. How can I help you with your SEO needs today?',
          role: 'ASSISTANT',
          model: 'gpt-4-turbo',
          conversationId: conversation.id,
          userId: user.id,
          agencyId: agency.id
        },
        {
          content: 'I need help optimizing my dealership website for local search.',
          role: 'USER',
          conversationId: conversation.id,
          userId: user.id,
          agencyId: agency.id
        }
      ],
      skipDuplicates: true
    })
    console.log('✓ Welcome messages added')

    // Create sample orders
    const sampleOrders = [
      {
        taskType: 'blog',
        title: 'Write Blog: Best SUVs for Families in 2025',
        description: 'Create an engaging blog post about the top family-friendly SUVs available at our dealership.',
        priority: 'high',
        status: 'pending'
      },
      {
        taskType: 'seo_audit',
        title: 'SEO Audit for Main Website',
        description: 'Complete SEO audit of dealership website with recommendations for improvement.',
        priority: 'medium',
        status: 'in_progress'
      },
      {
        taskType: 'gbp',
        title: 'Update Google Business Profile',
        description: 'Update business hours and add new vehicle photos to Google Business Profile.',
        priority: 'low',
        status: 'completed',
        completedAt: new Date()
      }
    ]

    for (const orderData of sampleOrders) {
      await prisma.order.create({
        data: {
          ...orderData,
          userId: user.id,
          userEmail: user.email,
          agencyId: agency.id,
          estimatedHours: Math.floor(Math.random() * 8) + 1
        }
      })
    }
    console.log('✓ Sample orders created')

    // Create theme
    await prisma.theme.upsert({
      where: { agencyId: agency.id },
      update: {},
      create: {
        agencyId: agency.id,
        companyName: 'Rylie SEO Hub',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        isActive: true
      }
    })
    console.log('✓ Default theme created')

    console.log('\n✅ Default data setup complete!')
    console.log('\nYou can now access the application with:')
    console.log('- Email: user@example.com')
    console.log('- Agency: Default Agency')
    console.log('- Role: Super Admin')

  } catch (error) {
    console.error('Error setting up default data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
