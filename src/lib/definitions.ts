export interface Package {
  id: string;
  name: string;
  description: string;
  totalTasks: number;
  price: number;
  features: string[];
}

export interface PackageTask {
  id: string;
  packageId: string;
  name: string;
  description: string;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export interface PackageProgress {
  packageId: string;
  packageName: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  remainingTasks: number;
  tasks: PackageTask[];
}

export const packages: Package[] = [
  {
    id: 'basic',
    name: 'Basic SEO Package',
    description: 'Essential SEO optimization for small businesses',
    totalTasks: 10,
    price: 499,
    features: [
      'Keyword research (up to 10 keywords)',
      'On-page optimization',
      'Meta tags optimization',
      'Basic site audit',
      'Google My Business setup'
    ]
  },
  {
    id: 'standard',
    name: 'Standard SEO Package',
    description: 'Comprehensive SEO solution for growing businesses',
    totalTasks: 20,
    price: 999,
    features: [
      'Keyword research (up to 25 keywords)',
      'Advanced on-page optimization',
      'Technical SEO audit',
      'Content optimization',
      'Local SEO optimization',
      'Monthly reporting',
      'Competitor analysis'
    ]
  },
  {
    id: 'premium',
    name: 'Premium SEO Package',
    description: 'Full-service SEO for maximum online visibility',
    totalTasks: 35,
    price: 1999,
    features: [
      'Unlimited keyword research',
      'Complete technical SEO overhaul',
      'Content strategy and creation',
      'Link building campaign',
      'E-commerce SEO (if applicable)',
      'Weekly reporting and calls',
      'Dedicated account manager',
      'Social media integration'
    ]
  }
];

export const packageTasks: Record<string, Omit<PackageTask, 'id' | 'isCompleted' | 'completedAt' | 'completedBy'>[]> = {
  basic: [
    { packageId: 'basic', name: 'Initial Website Audit', description: 'Comprehensive analysis of current website SEO status' },
    { packageId: 'basic', name: 'Keyword Research', description: 'Research and identify up to 10 target keywords' },
    { packageId: 'basic', name: 'Title Tag Optimization', description: 'Optimize title tags for all main pages' },
    { packageId: 'basic', name: 'Meta Description Optimization', description: 'Write compelling meta descriptions for all pages' },
    { packageId: 'basic', name: 'Header Tag Structure', description: 'Implement proper H1-H6 tag hierarchy' },
    { packageId: 'basic', name: 'Image Alt Text', description: 'Add descriptive alt text to all images' },
    { packageId: 'basic', name: 'XML Sitemap Creation', description: 'Generate and submit XML sitemap to search engines' },
    { packageId: 'basic', name: 'Robots.txt Configuration', description: 'Create and optimize robots.txt file' },
    { packageId: 'basic', name: 'Google My Business Setup', description: 'Create or optimize Google My Business listing' },
    { packageId: 'basic', name: 'Basic Analytics Setup', description: 'Install and configure Google Analytics and Search Console' }
  ],
  standard: [
    { packageId: 'standard', name: 'Comprehensive Site Audit', description: 'In-depth technical and content audit' },
    { packageId: 'standard', name: 'Extended Keyword Research', description: 'Research and analyze up to 25 keywords with search volume data' },
    { packageId: 'standard', name: 'Competitor Analysis', description: 'Analyze top 5 competitors\' SEO strategies' },
    { packageId: 'standard', name: 'Content Gap Analysis', description: 'Identify content opportunities based on competitor research' },
    { packageId: 'standard', name: 'On-Page Optimization', description: 'Optimize all website pages for target keywords' },
    { packageId: 'standard', name: 'Internal Linking Strategy', description: 'Develop and implement internal link structure' },
    { packageId: 'standard', name: 'Page Speed Optimization', description: 'Improve Core Web Vitals and loading times' },
    { packageId: 'standard', name: 'Mobile Optimization', description: 'Ensure full mobile responsiveness and usability' },
    { packageId: 'standard', name: 'Schema Markup Implementation', description: 'Add structured data for rich snippets' },
    { packageId: 'standard', name: 'Local SEO Optimization', description: 'Optimize for local search and map pack rankings' },
    { packageId: 'standard', name: 'Citation Building', description: 'Create consistent NAP listings across directories' },
    { packageId: 'standard', name: 'Content Optimization', description: 'Optimize existing content for better rankings' },
    { packageId: 'standard', name: 'URL Structure Optimization', description: 'Implement SEO-friendly URL structure' },
    { packageId: 'standard', name: '301 Redirect Mapping', description: 'Fix broken links and implement proper redirects' },
    { packageId: 'standard', name: 'SSL Certificate Setup', description: 'Ensure secure HTTPS implementation' },
    { packageId: 'standard', name: 'Google Analytics Configuration', description: 'Set up goals, conversions, and custom reports' },
    { packageId: 'standard', name: 'Search Console Optimization', description: 'Monitor and fix crawl errors, submit sitemaps' },
    { packageId: 'standard', name: 'Monthly Reporting Setup', description: 'Create automated monthly SEO performance reports' },
    { packageId: 'standard', name: 'Conversion Rate Optimization', description: 'Implement CRO best practices' },
    { packageId: 'standard', name: 'First Month Review', description: 'Comprehensive review and strategy adjustment' }
  ],
  premium: [
    { packageId: 'premium', name: 'Enterprise Site Audit', description: 'Complete technical, content, and UX audit' },
    { packageId: 'premium', name: 'Comprehensive Keyword Strategy', description: 'Unlimited keyword research with intent mapping' },
    { packageId: 'premium', name: 'Advanced Competitor Intelligence', description: 'Deep analysis of top 10 competitors' },
    { packageId: 'premium', name: 'Content Strategy Development', description: 'Create 12-month content calendar and strategy' },
    { packageId: 'premium', name: 'Topic Cluster Planning', description: 'Develop pillar pages and content clusters' },
    { packageId: 'premium', name: 'Technical SEO Overhaul', description: 'Complete technical optimization and fixes' },
    { packageId: 'premium', name: 'Site Architecture Redesign', description: 'Optimize site structure for crawlability' },
    { packageId: 'premium', name: 'Advanced Schema Implementation', description: 'Implement all relevant schema types' },
    { packageId: 'premium', name: 'International SEO Setup', description: 'Configure hreflang tags and geo-targeting' },
    { packageId: 'premium', name: 'E-commerce SEO Optimization', description: 'Product page and category optimization' },
    { packageId: 'premium', name: 'Voice Search Optimization', description: 'Optimize for voice search queries' },
    { packageId: 'premium', name: 'Featured Snippet Optimization', description: 'Target and optimize for featured snippets' },
    { packageId: 'premium', name: 'Link Building Campaign', description: 'Acquire 10+ high-quality backlinks monthly' },
    { packageId: 'premium', name: 'Digital PR Outreach', description: 'Secure mentions in industry publications' },
    { packageId: 'premium', name: 'Guest Posting Strategy', description: 'Publish on authoritative industry sites' },
    { packageId: 'premium', name: 'Broken Link Building', description: 'Identify and reclaim broken link opportunities' },
    { packageId: 'premium', name: 'Content Creation - Blog Posts', description: 'Create 4 SEO-optimized blog posts monthly' },
    { packageId: 'premium', name: 'Content Creation - Landing Pages', description: 'Develop high-converting landing pages' },
    { packageId: 'premium', name: 'Video SEO Optimization', description: 'Optimize video content for search' },
    { packageId: 'premium', name: 'Image SEO Campaign', description: 'Comprehensive image optimization strategy' },
    { packageId: 'premium', name: 'Social Media Integration', description: 'Align social media with SEO strategy' },
    { packageId: 'premium', name: 'Online Reputation Management', description: 'Monitor and improve online reputation' },
    { packageId: 'premium', name: 'Review Generation Campaign', description: 'Implement review acquisition strategy' },
    { packageId: 'premium', name: 'Local Pack Domination', description: 'Optimize for top 3 local search results' },
    { packageId: 'premium', name: 'Multi-Location SEO', description: 'Optimize for multiple business locations' },
    { packageId: 'premium', name: 'A/B Testing Implementation', description: 'Test and optimize page elements' },
    { packageId: 'premium', name: 'Heat Map Analysis', description: 'Analyze user behavior and optimize UX' },
    { packageId: 'premium', name: 'Custom Dashboard Creation', description: 'Build real-time SEO performance dashboard' },
    { packageId: 'premium', name: 'API Integrations', description: 'Connect SEO tools and automate reporting' },
    { packageId: 'premium', name: 'Weekly Strategy Calls', description: 'Weekly progress reviews and planning' },
    { packageId: 'premium', name: 'Dedicated Slack Channel', description: 'Direct communication with SEO team' },
    { packageId: 'premium', name: 'Quarterly Business Reviews', description: 'Comprehensive performance analysis' },
    { packageId: 'premium', name: 'Annual SEO Roadmap', description: 'Develop long-term SEO strategy' },
    { packageId: 'premium', name: 'Team Training Workshop', description: 'Train client team on SEO best practices' },
    { packageId: 'premium', name: 'Emergency Support', description: '24/7 support for critical SEO issues' }
  ]
};