import { getTerminology } from '@/lib/feature-flags';

const terms = getTerminology();

export const UI_TEXT = {
  // Page titles
  PAGE_TITLE: terms.Orders,
  PAGE_DESCRIPTION: `Track your SEO service ${terms.orders} and deliverables`,
  
  // Empty states
  EMPTY_STATE: `No ${terms.orders} yet`,
  EMPTY_STATE_DESCRIPTION: `Create your first ${terms.order} to get started`,
  
  // Buttons
  SUBMIT_BUTTON: `Submit ${terms.Order}`,
  CREATE_BUTTON: `Create ${terms.Order}`,
  NEW_BUTTON: `New ${terms.Order}`,
  VIEW_ALL_BUTTON: `View All ${terms.Orders}`,
  
  // Status messages
  CREATING: `Creating ${terms.order}...`,
  CREATED: `${terms.Order} created successfully`,
  UPDATED: `${terms.Order} updated successfully`,
  DELETED: `${terms.Order} deleted successfully`,
  
  // Form labels
  FORM_TITLE: `New ${terms.Order} Form`,
  FORM_DESCRIPTION: `Fill out the form below to submit a new ${terms.order}`,
  
  // Table headers
  TABLE_HEADER: terms.Orders,
  TABLE_ID: `${terms.Order} ID`,
  TABLE_STATUS: `${terms.Order} Status`,
  
  // Navigation
  NAV_ITEM: terms.Orders,
  NAV_DASHBOARD: 'Dashboard',
  NAV_SETTINGS: 'Settings',
  
  // Confirmation dialogs
  DELETE_CONFIRM: `Are you sure you want to delete this ${terms.order}?`,
  CANCEL_CONFIRM: `Are you sure you want to cancel this ${terms.order}?`,
  
  // Error messages
  ERROR_LOADING: `Failed to load ${terms.orders}`,
  ERROR_CREATING: `Failed to create ${terms.order}`,
  ERROR_UPDATING: `Failed to update ${terms.order}`,
  ERROR_DELETING: `Failed to delete ${terms.order}`,
  
  // Success messages
  SUCCESS_CREATED: `${terms.Order} has been ${terms.ordered} successfully`,
  SUCCESS_UPDATED: `${terms.Order} has been updated successfully`,
  SUCCESS_DELETED: `${terms.Order} has been deleted successfully`,
  
  // Misc
  RECENT_ITEMS: `Recent ${terms.Orders}`,
  TOTAL_COUNT: `Total ${terms.Orders}`,
  PENDING_COUNT: `Pending ${terms.Orders}`,
  COMPLETED_COUNT: `Completed ${terms.Orders}`,
};