import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewDashboard } from '@/components/reporting/OverviewDashboard';
import { TrafficAnalysis } from '@/components/reporting/TrafficAnalysis';
import { SearchPerformance } from '@/components/reporting/SearchPerformance';
import { ContentPerformance } from '@/components/reporting/ContentPerformance';
import { CompetitiveInsights } from '@/components/reporting/CompetitiveInsights';

export default function ReportingPage() {
  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">SEO Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Your single source of truth for SEO metrics
        </p>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="competitive">Competitive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewDashboard />
        </TabsContent>

        <TabsContent value="traffic">
          <TrafficAnalysis />
        </TabsContent>

        <TabsContent value="search">
          <SearchPerformance />
        </TabsContent>

        <TabsContent value="content">
          <ContentPerformance />
        </TabsContent>

        <TabsContent value="competitive">
          <CompetitiveInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}