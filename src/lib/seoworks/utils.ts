/**
 * SEOWorks utility functions
 */

/**
 * Map task type to a normalized category
 */
export function mapTaskTypeToCategory(taskType: string): string {
  const categoryMap: Record<string, string> = {
    'blog': 'Content Creation',
    'page': 'Content Creation',
    'gbp': 'Local SEO',
    'maintenance': 'Technical SEO',
    'seo': 'SEO Optimization',
    'seo_audit': 'SEO Audit',
  }
  
  return categoryMap[taskType] || 'Other'
}

/**
 * Extract deliverable data with backward compatibility
 */
export function extractDeliverableData(payload: any) {
  // New format with deliverables array
  if (payload.deliverables && Array.isArray(payload.deliverables)) {
    return {
      pageTitle: payload.deliverables[0]?.title || null,
      contentUrl: payload.deliverables[0]?.url || null,
      allDeliverables: payload.deliverables
    }
  }
  
  // Old format compatibility
  if (payload.postTitle || payload.postUrl) {
    return {
      pageTitle: payload.postTitle || null,
      contentUrl: payload.postUrl || null,
      allDeliverables: [{
        type: 'content',
        title: payload.postTitle,
        url: payload.postUrl
      }]
    }
  }
  
  return {
    pageTitle: null,
    contentUrl: null,
    allDeliverables: []
  }
}
