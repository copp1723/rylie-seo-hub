import { prisma } from '../src/lib/prisma';

async function migrateOrderCategories() {
  try {
    // Get all orders that don't have a taskCategory set
    const orders = await prisma.order.findMany({
      where: { taskCategory: null }
    });

    console.log(`Found ${orders.length} orders to migrate...`);

    // Helper function to map task types to categories
    function mapTaskTypeToCategory(taskType: string): string {
      const mapping: Record<string, string> = {
        'page': 'pages',
        'blog': 'blogs',
        'gbp': 'gbpPosts',
        'seo': 'seoAudits',
        'seo_audit': 'seoAudits',
        'maintenance': 'maintenance'
      };
      return mapping[taskType] || 'pages';
    }

    let migrated = 0;
    let errors = 0;

    // Migrate each order
    for (const order of orders) {
      try {
        const category = mapTaskTypeToCategory(order.taskType);
        
        await prisma.order.update({
          where: { id: order.id },
          data: { taskCategory: category }
        });
        
        migrated++;
        
        if (migrated % 10 === 0) {
          console.log(`Migrated ${migrated} orders...`);
        }
      } catch (error) {
        console.error(`Error migrating order ${order.id}:`, error);
        errors++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Successfully migrated: ${migrated} orders`);
    console.log(`Errors: ${errors}`);
    
    // Verify migration
    const unmigrated = await prisma.order.count({
      where: { taskCategory: null }
    });
    
    if (unmigrated > 0) {
      console.warn(`\nWarning: ${unmigrated} orders still have no taskCategory`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateOrderCategories();