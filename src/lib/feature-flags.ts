// Feature flags for gradual rollout of features
export const FEATURE_FLAGS = {
  USE_REQUESTS_TERMINOLOGY: process.env.NEXT_PUBLIC_USE_REQUESTS_TERMINOLOGY === 'true'
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