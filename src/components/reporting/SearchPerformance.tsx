'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { useSearchConsole } from '@/hooks/useSearchConsole';
import { ExportReport } from './ExportReport';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function SearchPerformance() {
  const { data: searchData, loading, primarySite } = useSearchConsole('primary', 30);

  const topQueries = searchData?.queries || [];
  const topPages = searchData?.pages || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Search Performance</h2>
          <p className="text-muted-foreground">
            How your site performs in Google Search
          </p>
          {primarySite && (
            <p className="text-sm text-muted-foreground mt-1">
              Tracking: {primarySite}
            </p>
          )}
        </div>
        <ExportReport data={searchData} />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clicks"
          value={searchData?.totalClicks || 0}
          change={searchData?.clickChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="Total Impressions"
          value={searchData?.totalImpressions || 0}
          change={searchData?.impressionChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="Average CTR"
          value={searchData?.avgCTR || 0}
          change={searchData?.ctrChange || 0}
          period="vs last period"
          format="percentage"
          loading={loading}
        />
        <MetricCard
          title="Average Position"
          value={searchData?.avgPosition || 0}
          change={searchData?.positionChange || 0}
          period="vs last period"
          format="decimal"
          inverse={true}
          loading={loading}
        />
      </div>

      {/* Performance Chart */}
      <TrendChart
        title="Search Performance Over Time"
        data={searchData?.performanceTrend || []}
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
                {searchData?.opportunities?.map((opp: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{opp.query}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Current position: {opp.position.toFixed(1)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {opp.trend === 'up' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {opp.potentialClicks}+ potential clicks
                        </span>
                      </div>
                    </div>
                    <p className="text-sm mt-2">{opp.recommendation}</p>
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