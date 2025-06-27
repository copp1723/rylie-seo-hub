'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { useGA4Data } from '@/hooks/useGA4Data';
import { ExternalLink, TrendingUp } from 'lucide-react';

export function ContentPerformance() {
  const { data: contentData, loading } = useGA4Data({
    metrics: ['screenPageViews', 'averageSessionDuration', 'bounceRate', 'conversions'],
    dimensions: ['pagePath', 'pageTitle'],
    dateRange: 'last30days',
  });

  const topContent = contentData?.pages || [];
  const contentByType = contentData?.byType || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Performance</h2>
        <p className="text-muted-foreground">
          How your content engages and converts visitors
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Page Views"
          value={contentData?.totalPageViews || 0}
          change={contentData?.pageViewChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="Avg. Time on Page"
          value={contentData?.avgTimeOnPage || 0}
          change={contentData?.timeOnPageChange || 0}
          period="vs last period"
          format="decimal"
          loading={loading}
        />
        <MetricCard
          title="Content Conversions"
          value={contentData?.contentConversions || 0}
          change={contentData?.conversionChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="Engagement Rate"
          value={contentData?.engagementRate || 0}
          change={contentData?.engagementChange || 0}
          period="vs last period"
          format="percentage"
          loading={loading}
        />
      </div>

      {/* Content Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>
            Your most viewed and engaging pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Page</th>
                  <th className="text-right p-2">Views</th>
                  <th className="text-right p-2">Avg. Time</th>
                  <th className="text-right p-2">Bounce Rate</th>
                  <th className="text-right p-2">Conversions</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {topContent.map((page: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{page.title}</p>
                          <p className="text-sm text-muted-foreground">{page.path}</p>
                        </div>
                        <a
                          href={page.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                    <td className="text-right p-2">
                      <div>
                        <p className="font-medium">{page.views.toLocaleString()}</p>
                        {page.viewChange > 0 && (
                          <p className="text-sm text-green-600">
                            +{page.viewChange}%
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="text-right p-2">
                      {formatDuration(page.avgTime)}
                    </td>
                    <td className="text-right p-2">
                      {page.bounceRate.toFixed(1)}%
                    </td>
                    <td className="text-right p-2">
                      {page.conversions}
                    </td>
                    <td className="text-center p-2">
                      {page.performance === 'high' && (
                        <Badge variant="default">High Performer</Badge>
                      )}
                      {page.performance === 'growing' && (
                        <Badge variant="secondary">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Growing
                        </Badge>
                      )}
                      {page.performance === 'needs-attention' && (
                        <Badge variant="outline">Needs Attention</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Content Type Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Content Type</CardTitle>
            <CardDescription>
              How different content types perform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contentByType.map((type: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{type.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {type.count} pages
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>{type.avgViews.toLocaleString()} avg views</span>
                    <span>{type.avgTime}s avg time</span>
                    <span>{type.conversionRate.toFixed(1)}% conv rate</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${type.performanceScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Recommendations</CardTitle>
            <CardDescription>
              Actionable insights to improve content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contentData?.recommendations?.map((rec: any, index: number) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rec.description}
                  </p>
                  {rec.impact && (
                    <Badge variant="outline" className="mt-2">
                      {rec.impact} impact
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}