import { assignTaskToSEOWorks, getTaskStatus, cancelSEOWorksTask } from '@/lib/seoworks-integration'
import { prisma } from '@/lib/prisma'
import { seoWorksClient } from '@/lib/seoworks'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dealershipOnboarding: {
      findFirst: jest.fn(),
    },
    sEOWorksTask: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/seoworks', () => ({
  seoWorksClient: {
    createTask: jest.fn(),
    getTaskStatus: jest.fn(),
    cancelTask: jest.fn(),
    isMockMode: jest.fn(() => false),
  },
  SEOWorksClient: jest.fn(),
}))

describe('SEO Works Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('assignTaskToSEOWorks', () => {
    const mockOrder = {
      id: 'order-123',
      title: 'Create Blog Post',
      description: 'Write a blog post about SEO',
      taskType: 'blog',
      estimatedHours: 4,
      agencyId: 'agency-123',
      userEmail: 'user@example.com',
      createdAt: new Date(),
      agency: {
        name: 'Test Agency',
        slug: 'test-agency',
      },
    }

    const mockOnboarding = {
      id: 'onboarding-123',
      agencyId: 'agency-123',
      package: 'GOLD',
      createdAt: new Date(),
    }

    it('should successfully assign a task to SEO Works', async () => {
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)
      ;(prisma.dealershipOnboarding.findFirst as jest.Mock).mockResolvedValue(mockOnboarding)
      ;(seoWorksClient.createTask as jest.Mock).mockResolvedValue({
        success: true,
        taskId: 'seoworks-456',
        assignedTo: 'team@seoworks.com',
      })
      ;(prisma.order.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await assignTaskToSEOWorks('order-123')

      expect(result.success).toBe(true)
      expect(result.seoworksTaskId).toBe('seoworks-456')

      expect(seoWorksClient.createTask).toHaveBeenCalledWith({
        id: 'order-123',
        taskType: 'blog',
        title: 'Create Blog Post',
        description: 'Write a blog post about SEO',
        priority: 'medium',
        estimatedHours: 4,
        dealershipId: 'agency-123',
        dealershipName: 'Test Agency',
        package: 'GOLD',
        metadata: expect.objectContaining({
          agencySlug: 'test-agency',
          userEmail: 'user@example.com',
          onboardingId: 'onboarding-123',
          turnaround: '3-5 days',
        }),
      })

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: 'in_progress',
          assignedTo: 'team@seoworks.com',
          seoworksTaskId: 'seoworks-456',
        },
      })
    })

    it('should handle PLATINUM package with high priority', async () => {
      const platinumOnboarding = { ...mockOnboarding, package: 'PLATINUM' }
      
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)
      ;(prisma.dealershipOnboarding.findFirst as jest.Mock).mockResolvedValue(platinumOnboarding)
      ;(seoWorksClient.createTask as jest.Mock).mockResolvedValue({
        success: true,
        taskId: 'seoworks-789',
        assignedTo: 'priority-team@seoworks.com',
      })
      ;(prisma.order.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await assignTaskToSEOWorks('order-123')

      expect(seoWorksClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
          metadata: expect.objectContaining({
            turnaround: '2-3 days',
          }),
        })
      )
    })

    it('should handle errors when order not found', async () => {
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await assignTaskToSEOWorks('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Order or agency not found')
      expect(seoWorksClient.createTask).not.toHaveBeenCalled()
    })

    it('should handle errors when onboarding not found', async () => {
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)
      ;(prisma.dealershipOnboarding.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await assignTaskToSEOWorks('order-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No onboarding found for agency')
      expect(seoWorksClient.createTask).not.toHaveBeenCalled()
    })

    it('should handle SEO Works API failures', async () => {
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)
      ;(prisma.dealershipOnboarding.findFirst as jest.Mock).mockResolvedValue(mockOnboarding)
      ;(seoWorksClient.createTask as jest.Mock).mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded',
      })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await assignTaskToSEOWorks('order-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('SEO WORKS assignment failed: API rate limit exceeded')
      expect(prisma.order.update).not.toHaveBeenCalled()
    })

    it('should work in mock mode', async () => {
      ;(seoWorksClient.isMockMode as jest.Mock).mockReturnValue(true)
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)
      ;(prisma.dealershipOnboarding.findFirst as jest.Mock).mockResolvedValue(mockOnboarding)
      ;(seoWorksClient.createTask as jest.Mock).mockResolvedValue({
        success: true,
        taskId: 'mock-123',
        assignedTo: 'mock-team@seoworks.com',
      })
      ;(prisma.order.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await assignTaskToSEOWorks('order-123')

      expect(result.success).toBe(true)
      expect(result.seoworksTaskId).toBe('mock-123')
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            isMockMode: true,
          }),
        }),
      })
    })
  })

  describe('getTaskStatus', () => {
    it('should get task status and update local records', async () => {
      const mockTask = {
        id: 'task-123',
        externalId: 'seoworks-456',
        status: 'pending',
        order: {
          id: 'order-123',
          status: 'pending',
          assignedTo: 'old-team@seoworks.com',
        },
      }

      ;(seoWorksClient.getTaskStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: 'in_progress',
        progress: 65,
        estimatedCompletion: '2024-12-01T00:00:00Z',
        assignedTo: 'new-team@seoworks.com',
      })
      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prisma.sEOWorksTask.update as jest.Mock).mockResolvedValue({})
      ;(prisma.order.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await getTaskStatus('seoworks-456')

      expect(result.success).toBe(true)
      expect(result.status).toBe('in_progress')
      expect(result.progress).toBe(65)

      expect(prisma.sEOWorksTask.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          status: 'in_progress',
          processedAt: expect.any(Date),
        },
      })

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: 'in_progress',
          assignedTo: 'new-team@seoworks.com',
        },
      })
    })

    it('should handle API errors gracefully', async () => {
      ;(seoWorksClient.getTaskStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Task not found',
      })

      const result = await getTaskStatus('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Task not found')
      expect(prisma.sEOWorksTask.findUnique).not.toHaveBeenCalled()
    })

    it('should not update if status unchanged', async () => {
      const mockTask = {
        id: 'task-123',
        externalId: 'seoworks-456',
        status: 'in_progress',
        order: null,
      }

      ;(seoWorksClient.getTaskStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: 'in_progress',
        progress: 65,
      })
      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockResolvedValue(mockTask)

      const result = await getTaskStatus('seoworks-456')

      expect(result.success).toBe(true)
      expect(prisma.sEOWorksTask.update).not.toHaveBeenCalled()
      expect(prisma.auditLog.create).not.toHaveBeenCalled()
    })
  })

  describe('cancelSEOWorksTask', () => {
    it('should cancel task successfully', async () => {
      const mockTask = {
        id: 'task-123',
        externalId: 'seoworks-456',
        status: 'in_progress',
        order: {
          id: 'order-123',
          status: 'in_progress',
        },
      }

      ;(seoWorksClient.cancelTask as jest.Mock).mockResolvedValue({
        success: true,
        taskId: 'seoworks-456',
      })
      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prisma.sEOWorksTask.update as jest.Mock).mockResolvedValue({})
      ;(prisma.order.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await cancelSEOWorksTask('seoworks-456', 'Client request')

      expect(result.success).toBe(true)

      expect(seoWorksClient.cancelTask).toHaveBeenCalledWith('seoworks-456', 'Client request')

      expect(prisma.sEOWorksTask.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          status: 'cancelled',
          completionNotes: 'Client request',
          processedAt: expect.any(Date),
        },
      })

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: 'cancelled',
          completionNotes: 'Client request',
        },
      })
    })

    it('should handle cancellation failures', async () => {
      ;(seoWorksClient.cancelTask as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Task already completed',
      })

      const result = await cancelSEOWorksTask('seoworks-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Task already completed')
      expect(prisma.sEOWorksTask.findUnique).not.toHaveBeenCalled()
    })
  })
})