import { createTenantPrisma } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export function getTenantDB(context: { tenant: { agencyId: string | null } }) {
  // If no agencyId, return regular prisma (for super admins)
  if (!context.tenant.agencyId) {
    return {
      ...prisma,
      findConversations: async (where: any, include?: any) => {
        return prisma.conversation.findMany({
          where,
          include,
        })
      }
    }
  }
  
  const db = createTenantPrisma(context.tenant.agencyId)
  
  // Add helper methods that match the expected interface
  return {
    ...db,
    findConversations: async (where: any, include?: any) => {
      return db.conversation.findMany({
        where,
        include,
      })
    }
  }
}