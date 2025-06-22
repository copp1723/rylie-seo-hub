import { NextRequest, NextResponse } from 'next/server'

// Get supported task types
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    taskTypes: [
      {
        id: 'blog',
        name: 'Blog Post',
        description: 'SEO-optimized blog post creation',
        estimatedHours: 4
      },
      {
        id: 'page',
        name: 'Page Content',
        description: 'Website page content creation and optimization',
        estimatedHours: 6
      },
      {
        id: 'gbp',
        name: 'Google Business Profile',
        description: 'Google Business Profile optimization',
        estimatedHours: 3
      },
      {
        id: 'maintenance',
        name: 'Site Maintenance',
        description: 'Website maintenance and updates',
        estimatedHours: 2
      },
      {
        id: 'seo',
        name: 'SEO Optimization',
        description: 'SEO audit, strategy, and optimization',
        estimatedHours: 8
      }
    ]
  })
}