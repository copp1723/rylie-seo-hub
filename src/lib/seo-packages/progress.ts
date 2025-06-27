import { prisma } from '@/lib/prisma';
import { SEO_PACKAGES, PackageType, TaskCategory } from './definitions';

export async function calculatePackageProgress(
  agencyId: string,
  packageType: PackageType
) {
  // Get all completed tasks for this agency
  const completedTasks = await prisma.order.findMany({
    where: {
      agencyId,
      status: 'completed',
      deletedAt: null
    },
    select: {
      taskType: true,
      completedAt: true
    }
  });

  // Group by task type and count
  const taskCounts = completedTasks.reduce((acc, task) => {
    const category = mapTaskTypeToCategory(task.taskType);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<TaskCategory, number>);

  // Calculate progress for each category
  const packageLimits = SEO_PACKAGES[packageType].limits;
  const progress = Object.entries(packageLimits).map(([category, limit]) => ({
    category,
    completed: taskCounts[category as TaskCategory] || 0,
    total: limit,
    percentage: Math.min(100, ((taskCounts[category as TaskCategory] || 0) / limit) * 100),
    remaining: Math.max(0, limit - (taskCounts[category as TaskCategory] || 0))
  }));

  return {
    package: packageType,
    totalCompleted: Object.values(taskCounts).reduce((sum, count) => sum + count, 0),
    totalTasks: SEO_PACKAGES[packageType].totalTasks,
    overallPercentage: (Object.values(taskCounts).reduce((sum, count) => sum + count, 0) / SEO_PACKAGES[packageType].totalTasks) * 100,
    categoryProgress: progress,
    activeTasks: SEO_PACKAGES[packageType].totalTasks - Object.values(taskCounts).reduce((sum, count) => sum + count, 0)
  };
}

function mapTaskTypeToCategory(taskType: string): TaskCategory {
  const mapping: Record<string, TaskCategory> = {
    'page': 'pages',
    'blog': 'blogs',
    'gbp': 'gbpPosts',
    'seo': 'seoAudits',
    'seo_audit': 'seoAudits',
    'maintenance': 'maintenance'
  };
  return mapping[taskType] || 'pages';
}