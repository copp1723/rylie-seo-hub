import { invalidateTaskContext } from './contextCache'

// Hook to invalidate cache when orders are updated
export function invalidateOnOrderUpdate(agencyId: string) {
  // Invalidate the context cache for this agency
  invalidateTaskContext(agencyId)
  
  console.log(`Context cache invalidated for agency ${agencyId} due to order update`)
}

// Hook to invalidate cache when dealership info is updated
export function invalidateOnDealershipUpdate(agencyId: string) {
  // Invalidate the context cache for this agency
  invalidateTaskContext(agencyId)
  
  console.log(`Context cache invalidated for agency ${agencyId} due to dealership update`)
}