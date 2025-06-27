'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { useGA4Data } from '@/hooks/useGA4Data';
import { ExportReport } from './ExportReport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function TrafficAnalysis() {
  const { data: trafficData, loading } = useGA4Data({
    metrics: ['sessions', 'users', 'newUsers', 'bounceRate', 'averageSessionDuration'],
    dimensions: ['date', 'sessionDefaultChannelGroup'],
    dateRange: 'last30days',
  });

  const channelData = trafficData?.byChannel || [];
  const deviceData = trafficData?.byDevice || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Traffic Analysis</h2>
          <p className="text-muted-foreground">
            Deep dive into your website traffic patterns
          </p>
        </div>
        <ExportReport data={trafficData} />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard
          title="Total Sessions"
          value={trafficData?.totalSessions || 0}
          change={trafficData?.sessionChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="Unique Users"
          value={trafficData?.totalUsers || 0}
          change={trafficData?.userChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="New Users"
          value={trafficData?.newUsers || 0}
          change={trafficData?.newUserChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="Bounce Rate"
          value={trafficData?.bounceRate || 0}
          change={trafficData?.bounceRateChange || 0}
          period="vs last period"
          format="percentage"
          inverse={true}
          loading={loading}
        />
        <MetricCard
          title="Avg. Session"
          value={trafficData?.avgSessionDuration || 0}
          change={trafficData?.sessionDurationChange || 0}
          period="vs last period"
          format="decimal"
          loading={loading}
        />
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">By Channel</TabsTrigger>
          <TabsTrigger value="devices">By Device</TabsTrigger>
          <TabsTrigger value="landing">Landing Pages</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic by Channel</CardTitle>
              <CardDescription>
                How users are finding your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic by Device</CardTitle>
              <CardDescription>
                Device categories your users prefer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="device" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Landing Pages</CardTitle>
              <CardDescription>
                Pages where users enter your site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trafficData?.topLandingPages?.map((page: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                    <div className="flex-1">
                      <p className="font-medium">{page.title}</p>
                      <p className="text-sm text-muted-foreground">{page.path}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{page.sessions.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {page.bounceRate.toFixed(1)}% bounce
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic by Location</CardTitle>
              <CardDescription>
                Where your users are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trafficData?.topLocations?.map((location: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2">
                    <span className="font-medium">{location.country}</span>
                    <div className="flex items-center gap-4">
                      <span>{location.sessions.toLocaleString()} sessions</span>
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${location.percentage}%` }}
                        />
                      </div>
                    </div>
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