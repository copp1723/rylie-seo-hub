export const SEO_PACKAGES = {
  SILVER: {
    name: 'Silver',
    limits: {
      pages: 5,
      blogs: 8,
      gbpPosts: 15,
      seoAudits: 1,
      maintenance: 4
    },
    totalTasks: 33,
    monthlyValue: 2500
  },
  GOLD: {
    name: 'Gold',
    limits: {
      pages: 9,
      blogs: 12,
      gbpPosts: 20,
      seoAudits: 2,
      maintenance: 6
    },
    totalTasks: 49,
    monthlyValue: 4000
  },
  PLATINUM: {
    name: 'Platinum',
    limits: {
      pages: 12,
      blogs: 16,
      gbpPosts: 33,
      seoAudits: 4,
      maintenance: 12
    },
    totalTasks: 77,
    monthlyValue: 6500
  }
} as const;

export type PackageType = keyof typeof SEO_PACKAGES;
export type TaskCategory = keyof typeof SEO_PACKAGES.SILVER.limits;