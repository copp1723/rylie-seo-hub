import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Task type to category mapping function
export function mapTaskTypeToCategory(taskType: string): string {
  const categoryMap: Record<string, string> = {
    'blog': 'Content Creation',
    'page': 'Content Creation',
    'gbp': 'Local SEO',
    'maintenance': 'Technical SEO',
    'seo': 'Optimization',
    'seo_audit': 'Analysis & Reporting'
  };
  
  return categoryMap[taskType.toLowerCase()] || 'Other';
}

// Deliverable schema
export const deliverableSchema = z.object({
  type: z.string(),
  url: z.string().url().optional(),
  title: z.string(),
  description: z.string().optional()
});

// Enhanced webhook payload schema with new fields
export const webhookPayloadSchema = z.object({
  eventType: z.enum(['task.created', 'task.updated', 'task.completed', 'task.cancelled']),
  timestamp: z.string().datetime(),
  data: z.object({
    externalId: z.string(),
    taskType: z.enum(['blog', 'page', 'gbp', 'maintenance', 'seo', 'seo_audit']),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    
    // Optional fields
    assignedTo: z.string().email().optional(),
    completionDate: z.string().datetime().optional(),
    completionNotes: z.string().optional(),
    deliverables: z.array(deliverableSchema).optional(),
    actualHours: z.number().positive().optional(),
    qualityScore: z.number().int().min(1).max(5).optional(),
    
    // New enhanced fields - these would come from SEOWorks
    pageTitle: z.string().optional(),
    contentUrl: z.string().url().optional(),
    postTitle: z.string().optional(), // For backward compatibility
    postUrl: z.string().url().optional(), // For backward compatibility
  })
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// Extract enhanced data from webhook payload
export function extractEnhancedData(payload: WebhookPayload) {
  const { data } = payload;
  
  // Determine pageTitle - prioritize new field, fallback to postTitle or deliverable title
  let pageTitle = data.pageTitle || data.postTitle;
  if (!pageTitle && data.deliverables && data.deliverables.length > 0) {
    pageTitle = data.deliverables[0].title;
  }
  
  // Determine contentUrl - prioritize new field, fallback to postUrl or deliverable url
  let contentUrl = data.contentUrl || data.postUrl;
  if (!contentUrl && data.deliverables && data.deliverables.length > 0) {
    contentUrl = data.deliverables[0].url;
  }
  
  // Map task type to category
  const taskCategory = mapTaskTypeToCategory(data.taskType);
  
  return {
    pageTitle,
    contentUrl,
    taskCategory
  };
}

// Validate webhook API key with timing-safe comparison
export function validateApiKey(providedKey: string | undefined, expectedKey: string): boolean {
  if (!providedKey || !expectedKey) {
    return false;
  }
  
  // Ensure both strings are the same length for timing-safe comparison
  const a = Buffer.from(providedKey);
  const b = Buffer.from(expectedKey);
  
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(a, b);
}

// Format webhook response
export function formatWebhookResponse(success: boolean, message: string, data?: unknown) {
  if (success) {
    return {
      success: true,
      message,
      ...(data && { task: data })
    };
  }
  
  return {
    error: message,
    details: data || 'An error occurred processing the webhook'
  };
}

// Check if task exists by external ID
export async function findTaskByExternalId(prisma: PrismaClient, externalId: string) {
  return await prisma.seoWorksTask.findUnique({
    where: { externalId },
    include: {
      order: true,
      agency: true
    }
  });
}

// Find matching order for task
export async function findMatchingOrder(prisma: PrismaClient, taskData: { orderId?: string; externalId: string }) {
  // Try to find by seoworksTaskId first
  if (taskData.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: taskData.orderId }
    });
    if (order) return order;
  }
  
  // Try to find by external ID
  const order = await prisma.order.findFirst({
    where: { seoworksTaskId: taskData.externalId }
  });
  
  return order;
}

