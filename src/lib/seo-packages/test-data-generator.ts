import { prisma } from '@/lib/prisma';
import { PackageType } from './definitions';

/**
 * Generate test data for package progress testing
 * This script creates various completed orders to test progress calculations
 */
export async function generateTestData(agencyId: string, packageType: PackageType) {
  const taskDistribution = {
    SILVER: {
      pages: 3,
      blogs: 5,
      gbpPosts: 8,
      seoAudits: 1,
      maintenance: 2
    },
    GOLD: {
      pages: 6,
      blogs: 8,
      gbpPosts: 12,
      seoAudits: 1,
      maintenance: 4
    },
    PLATINUM: {
      pages: 8,
      blogs: 12,
      gbpPosts: 20,
      seoAudits: 3,
      maintenance: 8
    }
  };

  const distribution = taskDistribution[packageType];
  const orders = [];

  // Generate pages
  for (let i = 0; i < distribution.pages; i++) {
    orders.push({
      agencyId,
      taskType: 'page',
      status: 'completed',
      title: `Landing Page ${i + 1}`,
      description: `SEO optimized landing page for service ${i + 1}`,
      completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    });
  }

  // Generate blogs
  for (let i = 0; i < distribution.blogs; i++) {
    orders.push({
      agencyId,
      taskType: 'blog',
      status: 'completed',
      title: `Blog Post ${i + 1}`,
      description: `SEO blog post about automotive topic ${i + 1}`,
      completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    });
  }

  // Generate GBP posts
  for (let i = 0; i < distribution.gbpPosts; i++) {
    orders.push({
      agencyId,
      taskType: 'gbp',
      status: 'completed',
      title: `GBP Post ${i + 1}`,
      description: `Google Business Profile post ${i + 1}`,
      completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    });
  }

  // Generate SEO audits
  for (let i = 0; i < distribution.seoAudits; i++) {
    orders.push({
      agencyId,
      taskType: 'seo_audit',
      status: 'completed',
      title: `SEO Audit Q${i + 1}`,
      description: `Quarterly SEO audit report`,
      completedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    });
  }

  // Generate maintenance tasks
  for (let i = 0; i < distribution.maintenance; i++) {
    orders.push({
      agencyId,
      taskType: 'maintenance',
      status: 'completed',
      title: `Maintenance Task ${i + 1}`,
      description: `Monthly maintenance and optimization`,
      completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    });
  }

  // Create all orders in database
  console.log(`Creating ${orders.length} test orders for ${packageType} package...`);
  
  for (const order of orders) {
    await prisma.order.create({ data: order });
  }

  console.log('Test data generated successfully!');
  return orders.length;
}

/**
 * Generate edge case test data
 */
export async function generateEdgeCaseData(agencyId: string) {
  const edgeCases = [
    // Over limit scenario
    ...Array(20).fill(null).map((_, i) => ({
      agencyId,
      taskType: 'page',
      status: 'completed',
      title: `Over-limit Page ${i + 1}`,
      description: 'Testing over-limit scenario',
      completedAt: new Date()
    })),
    
    // Mixed task types
    {
      agencyId,
      taskType: 'unknown_type',
      status: 'completed',
      title: 'Unknown Task Type',
      description: 'Testing unknown task type mapping',
      completedAt: new Date()
    },
    
    // Very old tasks
    {
      agencyId,
      taskType: 'blog',
      status: 'completed',
      title: 'Very Old Blog Post',
      description: 'Testing date handling',
      completedAt: new Date('2020-01-01')
    }
  ];

  console.log('Creating edge case test data...');
  
  for (const order of edgeCases) {
    await prisma.order.create({ data: order });
  }

  console.log('Edge case data generated successfully!');
}

/**
 * Clear all test data for an agency
 */
export async function clearTestData(agencyId: string) {
  console.log('Clearing test data...');
  
  const result = await prisma.order.deleteMany({
    where: {
      agencyId,
      OR: [
        { title: { contains: 'Test' } },
        { description: { contains: 'Testing' } }
      ]
    }
  });

  console.log(`Cleared ${result.count} test orders`);
  return result.count;
}