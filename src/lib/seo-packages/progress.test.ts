import { calculatePackageProgress } from './progress';
import { prisma } from '@/lib/prisma';
import { PackageType } from './definitions';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn()
    }
  }
}));

describe('calculatePackageProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate progress correctly for SILVER package', async () => {
    const mockOrders = [
      { taskType: 'page', completedAt: new Date() },
      { taskType: 'page', completedAt: new Date() },
      { taskType: 'blog', completedAt: new Date() },
      { taskType: 'blog', completedAt: new Date() },
      { taskType: 'blog', completedAt: new Date() },
      { taskType: 'gbp', completedAt: new Date() },
      { taskType: 'gbp', completedAt: new Date() },
      { taskType: 'seo_audit', completedAt: new Date() },
      { taskType: 'maintenance', completedAt: new Date() }
    ];

    (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

    const result = await calculatePackageProgress('agency-123', 'SILVER');

    expect(result).toEqual({
      package: 'SILVER',
      totalCompleted: 9,
      totalTasks: 33,
      overallPercentage: expect.any(Number),
      categoryProgress: expect.arrayContaining([
        { category: 'pages', completed: 2, total: 5, percentage: 40, remaining: 3 },
        { category: 'blogs', completed: 3, total: 8, percentage: 37.5, remaining: 5 },
        { category: 'gbpPosts', completed: 2, total: 15, percentage: expect.any(Number), remaining: 13 },
        { category: 'seoAudits', completed: 1, total: 1, percentage: 100, remaining: 0 },
        { category: 'maintenance', completed: 1, total: 4, percentage: 25, remaining: 3 }
      ]),
      activeTasks: 24
    });
  });

  it('should handle over-limit scenarios correctly', async () => {
    const mockOrders = [
      ...Array(10).fill({ taskType: 'page', completedAt: new Date() }), // Over limit
      ...Array(20).fill({ taskType: 'blog', completedAt: new Date() })  // Over limit
    ];

    (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

    const result = await calculatePackageProgress('agency-123', 'SILVER');

    const pageProgress = result.categoryProgress.find(p => p.category === 'pages');
    const blogProgress = result.categoryProgress.find(p => p.category === 'blogs');

    expect(pageProgress.percentage).toBe(100); // Capped at 100%
    expect(blogProgress.percentage).toBe(100); // Capped at 100%
    expect(pageProgress.remaining).toBe(0); // No negative remaining
  });

  it('should handle empty task lists', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

    const result = await calculatePackageProgress('agency-123', 'GOLD');

    expect(result.totalCompleted).toBe(0);
    expect(result.overallPercentage).toBe(0);
    expect(result.categoryProgress.every(p => p.completed === 0)).toBe(true);
  });

  it('should map task types correctly', async () => {
    const mockOrders = [
      { taskType: 'seo', completedAt: new Date() },
      { taskType: 'seo_audit', completedAt: new Date() }
    ];

    (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

    const result = await calculatePackageProgress('agency-123', 'PLATINUM');

    const seoProgress = result.categoryProgress.find(p => p.category === 'seoAudits');
    expect(seoProgress.completed).toBe(2); // Both 'seo' and 'seo_audit' map to 'seoAudits'
  });
});

describe('Performance', () => {
  it('should handle large datasets efficiently', async () => {
    // Create 10,000 mock orders
    const largeDataset = Array(10000).fill(null).map((_, i) => ({
      taskType: ['page', 'blog', 'gbp', 'maintenance'][i % 4],
      completedAt: new Date()
    }));

    (prisma.order.findMany as jest.Mock).mockResolvedValue(largeDataset);

    const startTime = Date.now();
    await calculatePackageProgress('agency-123', 'PLATINUM');
    const endTime = Date.now();

    // Should complete within 100ms even with large dataset
    expect(endTime - startTime).toBeLessThan(100);
  });
});