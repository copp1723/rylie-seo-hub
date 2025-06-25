import { createTenantPrisma } from '@/lib/tenant'

export function getTenantDB(context: { tenant: { agencyId: string } }) {
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