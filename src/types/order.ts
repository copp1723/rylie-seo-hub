import { Order } from '@prisma/client';

export interface EnhancedOrder extends Order {
  pageTitle: string | null;
  contentUrl: string | null;
  taskCategory: string | null;
  packageType: string | null;
}

// Helper to check if order has enhanced data
export function hasEnhancedData(order: Order): boolean {
  return !!(order.pageTitle && order.contentUrl);
}

// Valid task categories
export const TASK_CATEGORIES = {
  PAGES: 'pages',
  BLOGS: 'blogs',
  GBP_POSTS: 'gbpPosts',
} as const;

export type TaskCategory = typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES];

// Valid package types
export const PACKAGE_TYPES = {
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
} as const;

export type PackageType = typeof PACKAGE_TYPES[keyof typeof PACKAGE_TYPES];