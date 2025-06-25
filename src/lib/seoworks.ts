import { logger } from '@/lib/observability'

export interface SEOWorksConfig {
  apiUrl: string
  apiKey: string
  mockMode?: boolean
}

export interface SEOWorksTask {
  id: string
  taskType: 'blog' | 'page' | 'gbp' | 'maintenance' | 'seo' | 'seo_audit'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  estimatedHours: number
  dealershipId: string
  dealershipName: string
  package: string
  metadata?: Record<string, any>
}

export interface SEOWorksTaskResponse {
  success: boolean
  taskId?: string
  assignedTo?: string
  error?: string
}

export interface SEOWorksTaskStatus {
  success: boolean
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  progress?: number
  estimatedCompletion?: string
  assignedTo?: string
  actualHours?: number
  error?: string
}

export class SEOWorksClient {
  private config: SEOWorksConfig

  constructor(config?: Partial<SEOWorksConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.SEOWORKS_API_URL || 'https://api.seoworks.com/v1',
      apiKey: config?.apiKey || process.env.SEOWORKS_API_KEY || '',
      mockMode: config?.mockMode || !process.env.SEOWORKS_API_KEY || process.env.SEOWORKS_MOCK_MODE === 'true',
    }
  }

  /**
   * Submit a new task to SEO Works
   */
  async createTask(task: SEOWorksTask): Promise<SEOWorksTaskResponse> {
    try {
      if (this.config.mockMode) {
        // Mock mode implementation
        logger.info('SEO Works mock mode: Creating task', { task })
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        return {
          success: true,
          taskId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          assignedTo: 'mock-team@seoworks.com',
        }
      }

      // Production API call
      const response = await fetch(`${this.config.apiUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Version': '1.0',
        },
        body: JSON.stringify(task),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SEO Works API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      
      logger.info('SEO Works task created', { 
        taskId: data.taskId, 
        assignedTo: data.assignedTo 
      })

      return {
        success: true,
        taskId: data.taskId,
        assignedTo: data.assignedTo,
      }
    } catch (error) {
      logger.error('SEO Works API error', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get the status of a task
   */
  async getTaskStatus(taskId: string): Promise<SEOWorksTaskStatus> {
    try {
      if (this.config.mockMode) {
        // Mock mode implementation
        logger.info('SEO Works mock mode: Getting task status', { taskId })
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Return mock status based on task age
        const mockStatuses = ['pending', 'in_progress', 'completed'] as const
        const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]
        
        return {
          success: true,
          status: randomStatus,
          progress: randomStatus === 'completed' ? 100 : randomStatus === 'in_progress' ? 65 : 0,
          estimatedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          assignedTo: 'mock-team@seoworks.com',
          actualHours: randomStatus === 'completed' ? 4.5 : undefined,
        }
      }

      // Production API call
      const response = await fetch(`${this.config.apiUrl}/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Version': '1.0',
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SEO Works API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        status: data.status,
        progress: data.progress,
        estimatedCompletion: data.estimatedCompletion,
        assignedTo: data.assignedTo,
        actualHours: data.actualHours,
      }
    } catch (error) {
      logger.error('SEO Works API error', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update a task's status
   */
  async updateTaskStatus(
    taskId: string, 
    status: 'in_progress' | 'completed' | 'cancelled',
    notes?: string
  ): Promise<SEOWorksTaskResponse> {
    try {
      if (this.config.mockMode) {
        // Mock mode implementation
        logger.info('SEO Works mock mode: Updating task status', { taskId, status, notes })
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 400))
        
        return {
          success: true,
          taskId,
          assignedTo: 'mock-team@seoworks.com',
        }
      }

      // Production API call
      const response = await fetch(`${this.config.apiUrl}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Version': '1.0',
        },
        body: JSON.stringify({ status, notes }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SEO Works API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      
      logger.info('SEO Works task updated', { taskId, status })

      return {
        success: true,
        taskId: data.taskId,
        assignedTo: data.assignedTo,
      }
    } catch (error) {
      logger.error('SEO Works API error', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<SEOWorksTaskResponse> {
    return this.updateTaskStatus(taskId, 'cancelled', reason)
  }

  /**
   * Check if the client is in mock mode
   */
  isMockMode(): boolean {
    return this.config.mockMode || false
  }

  /**
   * Validate webhook signature
   */
  static validateWebhookSignature(
    payload: string, 
    signature: string, 
    secret: string
  ): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }
}

// Export a default instance
export const seoWorksClient = new SEOWorksClient()