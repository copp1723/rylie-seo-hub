'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DefinitiveAnswer } from './DefinitiveAnswer';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { useGA4Data } from '@/hooks/useGA4Data';
import { useSearchConsole } from '@/hooks/useSearchConsole';

export function OverviewDashboard() {
  const { data: ga4Data, loading: ga4Loading } = useGA4Data({
    metrics: ['sessions', 'users', 'conversions'],
    dimensions: ['date'],
    dateRange: 'last30days',
  });

  const { data: searchData, loading: searchLoading } = useSearchConsole(
    'primary',
    30
  );

  const loading = ga4Loading || searchLoading;

  // Calculate definitive answers
  const answers = calculateDefinitiveAnswers(ga4Data, searchData);

  return (
    <div className="space-y-6">
      {/* Definitive Answers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Answers</CardTitle>
          <CardDescription>
            Clear answers to your most important questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DefinitiveAnswer
              question="Is our traffic growing?"
              answer={answers.trafficGrowth.answer}
              details={answers.trafficGrowth.details}
              trend={answers.trafficGrowth.trend}
              confidence={answers.trafficGrowth.confidence}
            />
            
            <DefinitiveAnswer
              question="Are we ranking better?"
              answer={answers.rankingImprovement.answer}
              details={answers.rankingImprovement.details}
              trend={answers.rankingImprovement.trend}
              confidence={answers.rankingImprovement.confidence}
            />
            
            <DefinitiveAnswer
              question="Which content performs best?"
              answer={answers.topContent.answer}
              details={answers.topContent.details}
              link={answers.topContent.link}
            />
            
            <DefinitiveAnswer
              question="What should we focus on?"
              answer={answers.nextFocus.answer}
              details={answers.nextFocus.details}
              actionable={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Organic Traffic"
          value={ga4Data?.totalSessions || 0}
          change={ga4Data?.sessionChange || 0}
          period="vs last month"
          loading={loading}
        />
        
        <MetricCard
          title="Search Clicks"
          value={searchData?.totalClicks || 0}
          change={searchData?.clickChange || 0}
          period="vs last month"
          loading={loading}
        />
        
        <MetricCard
          title="Avg. Position"
          value={searchData?.avgPosition || 0}
          change={searchData?.positionChange || 0}
          period="vs last month"
          inverse={true} // Lower is better
          loading={loading}
        />
        
        <MetricCard
          title="Conversions"
          value={ga4Data?.totalConversions || 0}
          change={ga4Data?.conversionChange || 0}
          period="vs last month"
          loading={loading}
        />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TrendChart
          title="Traffic Trend"
          data={ga4Data?.trafficTrend || []}
          dataKey="sessions"
          loading={loading}
        />
        
        <TrendChart
          title="Search Performance"
          data={searchData?.performanceTrend || []}
          dataKey="clicks"
          secondaryDataKey="impressions"
          loading={loading}
        />
      </div>
    </div>
  );
}

// Helper function for calculating definitive answers
function calculateDefinitiveAnswers(ga4Data: any, searchData: any) {
  return {
    trafficGrowth: {
      answer: ga4Data?.sessionChange > 5 ? "Yes, growing strongly" : 
              ga4Data?.sessionChange > 0 ? "Yes, modest growth" :
              ga4Data?.sessionChange > -5 ? "Stable" : "Declining",
      details: `${Math.abs(ga4Data?.sessionChange || 0)}% ${ga4Data?.sessionChange > 0 ? 'increase' : 'decrease'} in organic traffic`,
      trend: ga4Data?.sessionChange > 0 ? 'up' : 'down' as const,
      confidence: 'high' as const,
    },
    rankingImprovement: {
      answer: searchData?.positionChange < -0.5 ? "Yes, significantly" :
              searchData?.positionChange < 0 ? "Yes, gradually" :
              "Not yet",
      details: `Average position ${Math.abs(searchData?.positionChange || 0).toFixed(1)} ${searchData?.positionChange < 0 ? 'better' : 'worse'}`,
      trend: searchData?.positionChange < 0 ? 'up' : 'down' as const,
      confidence: 'high' as const,
    },
    topContent: {
      answer: ga4Data?.topPage?.title || "Homepage",
      details: `${ga4Data?.topPage?.sessions || 0} sessions this month`,
      link: ga4Data?.topPage?.url,
    },
    nextFocus: {
      answer: determineNextFocus(ga4Data, searchData),
      details: "Based on current performance trends",
      actionable: true,
    },
  };
}

function determineNextFocus(ga4Data: any, searchData: any): string {
  if (searchData?.avgPosition > 15) {
    return "Improve content quality for better rankings";
  }
  if (ga4Data?.bounceRate > 60) {
    return "Optimize page experience to reduce bounce rate";
  }
  if (searchData?.ctr < 2) {
    return "Improve meta descriptions for better CTR";
  }
  return "Create more content targeting your key models";
}