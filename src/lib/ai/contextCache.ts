import { LRUCache } from 'lru-cache'
import { TaskContext, getTaskContext } from './taskContextService'

// Create cache instance
const contextCache = new LRUCache<string, TaskContext>({
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  updateAgeOnGet: true,
  updateAgeOnHas: true,
})

// Get context with caching
export async function getCachedTaskContext(agencyId: string): Promise<TaskContext> {
  const cached = contextCache.get(agencyId)
  if (cached) {
    console.log(`Using cached context for agency ${agencyId}`)
    return cached
  }

  console.log(`Loading fresh context for agency ${agencyId}`)
  const context = await getTaskContext(agencyId)
  contextCache.set(agencyId, context)
  return context
}

// Clear cache for an agency when tasks are updated
export function invalidateTaskContext(agencyId: string) {
  console.log(`Invalidating context cache for agency ${agencyId}`)
  contextCache.delete(agencyId)
}

// Clear all cache
export function clearAllContextCache() {
  console.log('Clearing all context cache')
  contextCache.clear()
}

// Get cache stats
export function getContextCacheStats() {
  return {
    size: contextCache.size,
    calculatedSize: contextCache.calculatedSize,
  }
}