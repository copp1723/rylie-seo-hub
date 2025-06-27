// Feature flags for gradual rollout of features

// Use a runtime check instead of build-time env var
export const FEATURE_FLAGS = {
  // Always use requests terminology in production
  USE_REQUESTS_TERMINOLOGY: true
};

// Helper function for terminology switching
export function getTerminology() {
  return {
    order: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY ? 'request' : 'order',
    orders: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY ? 'requests' : 'orders',
    Order: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY ? 'Request' : 'Order',
    Orders: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY ? 'Requests' : 'Orders',
    // Additional forms
    ordering: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY ? 'requesting' : 'ordering',
    ordered: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY ? 'requested' : 'ordered',
    Ordered: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY ? 'Requested' : 'Ordered',
  };
}