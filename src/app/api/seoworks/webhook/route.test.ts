import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/seoworks/webhook/route'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Mock the prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sEOWorksTask: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}))

describe('SEO Works Webhook API', () => {
  const mockSecret = 'test-webhook-secret'
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.SEOWORKS_WEBHOOK_SECRET = mockSecret
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('POST /api/seoworks/webhook', () => {
    const createSignature = (payload: any) => {
      return crypto
        .createHmac('sha256', mockSecret)
        .update(JSON.stringify(payload))
        .digest('hex')
    }

    const createRequest = (payload: any, signature?: string) => {
      const body = JSON.stringify(payload)
      return new NextRequest('http://localhost:3001/api/seoworks/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-seoworks-signature': signature || createSignature(payload),
        },
        body,
      })
    }

    it('should handle task.created event successfully', async () => {
      const payload = {
        eventType: 'task.created',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'seoworks-123',
          taskType: 'blog',
          status: 'pending',
          assignedTo: 'team@seoworks.com',
        },
      }

      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.sEOWorksTask.create as jest.Mock).mockResolvedValue({
        id: 'task-1',
        externalId: 'seoworks-123',
        status: 'pending',
      })
      ;(prisma.order.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = createRequest(payload)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Task created successfully')
      expect(prisma.sEOWorksTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          externalId: 'seoworks-123',
          taskType: 'blog',
          status: 'pending',
        }),
      })
    })

    it('should handle task.updated event for existing task', async () => {
      const payload = {
        eventType: 'task.updated',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'seoworks-123',
          taskType: 'blog',
          status: 'in_progress',
          assignedTo: 'team@seoworks.com',
          actualHours: 2.5,
        },
      }

      const mockTask = {
        id: 'task-1',
        externalId: 'seoworks-123',
        status: 'pending',
        order: {
          id: 'order-1',
          status: 'pending',
          deliverables: {},
        },
      }

      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prisma.sEOWorksTask.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'in_progress',
      })
      ;(prisma.order.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = createRequest(payload)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Task updated successfully')
      expect(prisma.sEOWorksTask.update).toHaveBeenCalled()
      expect(prisma.order.update).toHaveBeenCalled()
    })

    it('should handle task.completed event with deliverables', async () => {
      const completionDate = new Date().toISOString()
      const payload = {
        eventType: 'task.completed',
        timestamp: completionDate,
        data: {
          externalId: 'seoworks-123',
          taskType: 'blog',
          status: 'completed',
          completionDate,
          deliverables: [
            {
              type: 'document',
              url: 'https://example.com/blog.pdf',
              title: 'Blog Post',
              description: 'Completed blog post',
            },
          ],
          completionNotes: 'Task completed successfully',
          actualHours: 4.5,
          qualityScore: 5,
        },
      }

      const mockTask = {
        id: 'task-1',
        externalId: 'seoworks-123',
        status: 'in_progress',
        order: {
          id: 'order-1',
          status: 'in_progress',
          deliverables: {},
        },
      }

      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prisma.sEOWorksTask.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'completed',
        completionDate: new Date(completionDate),
      })
      ;(prisma.order.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = createRequest(payload)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
          deliverables: expect.objectContaining({
            seoworks: expect.objectContaining({
              deliverables: expect.arrayContaining([
                expect.objectContaining({
                  type: 'document',
                  url: 'https://example.com/blog.pdf',
                }),
              ]),
              actualHours: 4.5,
              qualityScore: 5,
            }),
          }),
        }),
      })
    })

    it('should reject request with invalid signature', async () => {
      const payload = {
        eventType: 'task.updated',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'seoworks-123',
          taskType: 'blog',
          status: 'in_progress',
        },
      }

      const request = createRequest(payload, 'invalid-signature')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.details).toContain('Invalid webhook signature')
    })

    it('should reject request with invalid payload schema', async () => {
      const payload = {
        eventType: 'invalid-event',
        timestamp: new Date().toISOString(),
        data: {
          // Missing required fields
          taskType: 'blog',
        },
      }

      const request = createRequest(payload)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
      expect(data.details).toBeDefined()
    })

    it('should work in mock mode when no API key is configured', async () => {
      delete process.env.SEOWORKS_API_KEY
      process.env.SEOWORKS_MOCK_MODE = 'true'

      const payload = {
        eventType: 'task.created',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'mock-123',
          taskType: 'blog',
          status: 'pending',
        },
      }

      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.sEOWorksTask.create as jest.Mock).mockResolvedValue({
        id: 'task-1',
        externalId: 'mock-123',
        status: 'pending',
      })
      ;(prisma.order.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3001/api/seoworks/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            isMockMode: true,
          }),
        }),
      })
    })

    it('should handle errors gracefully', async () => {
      const payload = {
        eventType: 'task.updated',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'seoworks-123',
          taskType: 'blog',
          status: 'in_progress',
        },
      }

      ;(prisma.sEOWorksTask.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = createRequest(payload)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.details).toContain('Database connection failed')
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'WEBHOOK_ERROR',
        }),
      })
    })
  })

  describe('GET /api/seoworks/webhook', () => {
    it('should return webhook info in production mode', async () => {
      process.env.SEOWORKS_API_KEY = 'test-key'

      const request = new NextRequest('http://localhost:3001/api/seoworks/webhook', {
        method: 'GET',
        headers: {
          'x-api-key': 'test-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.mode).toBe('production')
      expect(data.authentication.mode).toBe('production')
    })

    it('should return webhook info in mock mode', async () => {
      delete process.env.SEOWORKS_API_KEY

      const request = new NextRequest('http://localhost:3001/api/seoworks/webhook', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.mode).toBe('mock')
      expect(data.authentication.mode).toBe('mock')
      expect(data.testingInstructions).toContain('/api/seoworks/test')
    })

    it('should require API key in production mode', async () => {
      process.env.SEOWORKS_API_KEY = 'test-key'

      const request = new NextRequest('http://localhost:3001/api/seoworks/webhook', {
        method: 'GET',
        headers: {
          'x-api-key': 'wrong-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})