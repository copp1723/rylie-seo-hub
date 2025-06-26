import { z } from 'zod'

// Chat API validation schemas
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
  conversationId: z.string().optional(),
  model: z.string().min(1, 'Model is required'),
})

export const streamChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1, 'Message content cannot be empty'),
      })
    )
    .min(1, 'At least one message is required'),
  conversationId: z.string().optional(),
  model: z.string().min(1, 'Model is required'),
})

// Conversation API validation schemas
export const createConversationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  model: z.string().min(1, 'Model is required'),
})

export const updateConversationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  model: z.string().min(1, 'Model is required').optional(),
})

// Theme API validation schemas
export const themeUpdateSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name too long')
    .optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format')
    .optional(),
  logo: z.string().url('Invalid logo URL').optional(),
})

// User API validation schemas
export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name too long')
    .optional(),
})

// Common validation helpers
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

// Validation error response type
export interface ValidationError {
  success: false
  error: string
  details?: z.ZodError
}

// Success response type
export interface SuccessResponse<T = Record<string, unknown>> {
  success: true
  data: T
}

// Validation middleware helper
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.ZodError } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error,
      }
    }
    return {
      success: false,
      error: 'Unknown validation error',
      details: error as z.ZodError,
    }
  }
}

// Rate limiting schema
export const rateLimitSchema = z.object({
  windowMs: z.number().min(1000).default(60000), // 1 minute default
  maxRequests: z.number().min(1).default(10), // 10 requests per window default
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
export type StreamChatRequest = z.infer<typeof streamChatRequestSchema>
export type CreateConversationRequest = z.infer<typeof createConversationSchema>
export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>
export type ThemeUpdateRequest = z.infer<typeof themeUpdateSchema>
export type UserUpdateRequest = z.infer<typeof userUpdateSchema>
export type IdParam = z.infer<typeof idParamSchema>

// Report Scheduling API validation schemas
export const reportBrandingOptionsSchema = z.object({
  agencyName: z.string().optional(),
  agencyLogoUrl: z.string().url().optional(),
  reportTitle: z.string().optional(),
});

export const reportScheduleSchema = z.object({
  cronPattern: z.string().min(1, 'Cron pattern is required'), // Basic validation, cron validity check will be server-side
  ga4PropertyId: z.string().min(1, 'GA4 Property ID is required'),
  reportType: z.enum(['WeeklySummary', 'MonthlyReport', 'QuarterlyBusinessReview']),
  emailRecipients: z.array(z.string().email()).min(1, 'At least one email recipient is required'),
  brandingOptions: reportBrandingOptionsSchema.optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateReportScheduleSchema = reportScheduleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type ReportScheduleRequest = z.infer<typeof reportScheduleSchema>;
export type UpdateReportScheduleRequest = z.infer<typeof updateReportScheduleSchema>;
export type ReportBrandingOptions = z.infer<typeof reportBrandingOptionsSchema>;
