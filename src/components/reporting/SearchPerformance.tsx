'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { useSearchConsole } from '@/hooks/useSearchConsole';
import { ExportReport } from './ExportReport';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function SearchPerformance() {
  const { data: searchData, loading } = useSearchConsole('primary', 30);

  const topQueries = searchData?.queries || [];
  const topPages = searchData?.pages || [];
  
  // Calculate aggregate metrics
  const totalClicks = topQueries.reduce((sum, q) => sum + q.clicks, 0);
  const totalImpressions = topQueries.reduce((sum, q) => sum + q.impressions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgPosition = topQueries.length > 0 
    ? topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Search Performance</h2>
          <p className="text-muted-foreground">
            How your site performs in Google Search
          </p>
        </div>
        <ExportReport data={searchData} />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clicks"
          value={totalClicks}
          change={0}
          period="last 30 days"
          loading={loading}
        />
        <MetricCard
          title="Total Impressions"
          value={totalImpressions}
          change={0}
          period="last 30 days"
          loading={loading}
        />
        <MetricCard
          title="Average CTR"
          value={avgCTR}
          change={0}
          period="last 30 days"
          format="percentage"
          loading={loading}
        />
        <MetricCard
          title="Average Position"
          value={avgPosition}
          change={0}
          period="last 30 days"
          format="decimal"
          inverse={true}
          loading={loading}
        />
      </div>

      {/* Performance Chart */}
      <TrendChart
        title="Search Performance Over Time"
        data={searchData?.performance || []}
        dataKey="clicks"
        secondaryDataKey="impressions"
        loading={loading}
      />

      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queries">Top Queries</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Search Queries</CardTitle>
              <CardDescription>
                Keywords driving traffic to your site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topQueries.map((query: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted">
                    <div className="flex-1">
                      <p className="font-medium">{query.query}</p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{query.impressions.toLocaleString()} impressions</span>
                        <span>Position: {query.position.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{query.clicks.toLocaleString()} clicks</p>
                      <p className="text-sm text-muted-foreground">
                        {query.ctr.toFixed(1)}% CTR
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <CardDescription>
                Your most visible pages in search results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topPages.map((page: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted">
                    <div className="flex-1">
                      <p className="font-medium truncate">{page.page}</p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{page.impressions.toLocaleString()} impressions</span>
                        <span>Position: {page.position.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{page.clicks.toLocaleString()} clicks</p>
                      <p className="text-sm text-muted-foreground">
                        {page.ctr.toFixed(1)}% CTR
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Opportunities</CardTitle>
              <CardDescription>
                Keywords with potential for improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topQueries
                  .filter(q => q.position > 10 && q.position <= 20)
                  .slice(0, 5)
                  .map((query: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{query.keys?.[0] || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Current position: {query.position.toFixed(1)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {query.impressions} impressions
                        </span>
                      </div>
                    </div>
                    <p className="text-sm mt-2">
                      Move to page 1 to capture more clicks
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}