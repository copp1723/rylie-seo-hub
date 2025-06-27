'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { useSearchConsole } from '@/hooks/useSearchConsole';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';

export function CompetitiveInsights() {
  const { data: searchData, loading } = useSearchConsole('primary', 30);

  // Process search data to extract competitive insights
  const topQueries = searchData?.queries?.slice(0, 10) || [];
  const totalImpressions = searchData?.queries?.reduce((sum, q) => sum + q.impressions, 0) || 0;
  const totalClicks = searchData?.queries?.reduce((sum, q) => sum + q.clicks, 0) || 0;
  const avgPosition = searchData?.queries?.reduce((sum, q, idx, arr) => 
    idx === arr.length - 1 ? (sum + q.position) / arr.length : sum + q.position, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Competitive Insights</h2>
        <p className="text-muted-foreground">
          Understand your position in the competitive landscape
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Competitive data is estimated based on search rankings and visibility metrics.
          For detailed competitor analysis, consider integrating with specialized SEO tools.
        </AlertDescription>
      </Alert>

      {/* Competitive Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Search Impressions"
          value={totalImpressions}
          change={0}
          period="last 30 days"
          loading={loading}
        />
        <MetricCard
          title="Click-Through Rate"
          value={totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0}
          change={0}
          period="last 30 days"
          format="percentage"
          loading={loading}
        />
        <MetricCard
          title="Total Keywords"
          value={searchData?.queries?.length || 0}
          change={0}
          period="last 30 days"
          loading={loading}
        />
        <MetricCard
          title="Avg. Position"
          value={avgPosition}
          change={0}
          period="last 30 days"
          format="decimal"
          loading={loading}
        />
      </div>

      {/* Competitive Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Competitive Keyword Analysis</CardTitle>
          <CardDescription>
            Keywords where you compete with other dealerships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topQueries.map((keyword: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{keyword.keys?.[0] || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      Impressions: {keyword.impressions?.toLocaleString() || 0}
                    </p>
                  </div>
                  <Badge variant={keyword.position <= 10 ? 'default' : 
                               keyword.position <= 20 ? 'secondary' : 'destructive'}>
                    Position {keyword.position?.toFixed(1) || 'N/A'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Your Position</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {keyword.position?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Clicks</p>
                    <p className="text-2xl font-bold">{keyword.clicks || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      CTR: {keyword.ctr ? `${(keyword.ctr * 100).toFixed(2)}%` : '0%'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Performance</p>
                    <p className="text-sm">{keyword.clicks > 0 ? 'Getting clicks' : 'Need optimization'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Search Visibility Trend</CardTitle>
            <CardDescription>
              Your visibility in search results over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              title=""
              data={searchData?.performance || []}
              dataKey="clicks"
              height={250}
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competitive Opportunities</CardTitle>
            <CardDescription>
              Areas where you can gain competitive advantage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="font-medium text-sm">Quick Wins</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchData?.queries?.filter(q => q.position > 10 && q.position <= 20).length || 0} keywords ranking 11-20 that could easily reach page 1
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="font-medium text-sm">Content Gaps</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchData?.queries?.filter(q => q.impressions > 1000 && q.clicks === 0).length || 0} high-impression keywords with no clicks
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="font-medium text-sm">Featured Snippets</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchData?.queries?.filter(q => q.position <= 5).length || 0} queries where you rank in top 5
                </p>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="font-medium text-sm">Local Pack</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchData?.queries?.filter(q => q.keys?.[0]?.includes('near me')).length || 0} "near me" searches found
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}