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

  const competitiveKeywords = searchData?.competitive || [];
  const marketShare = searchData?.marketShare || {};

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
          title="Market Visibility"
          value={marketShare.visibility || 0}
          change={marketShare.visibilityChange || 0}
          period="vs last period"
          format="percentage"
          loading={loading}
        />
        <MetricCard
          title="Share of Voice"
          value={marketShare.shareOfVoice || 0}
          change={marketShare.sovChange || 0}
          period="vs last period"
          format="percentage"
          loading={loading}
        />
        <MetricCard
          title="Ranking Keywords"
          value={searchData?.totalRankingKeywords || 0}
          change={searchData?.keywordChange || 0}
          period="vs last period"
          loading={loading}
        />
        <MetricCard
          title="Top 10 Rankings"
          value={searchData?.top10Rankings || 0}
          change={searchData?.top10Change || 0}
          period="vs last period"
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
            {competitiveKeywords.map((keyword: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{keyword.query}</p>
                    <p className="text-sm text-muted-foreground">
                      Search Volume: {keyword.searchVolume?.toLocaleString() || 'N/A'} / month
                    </p>
                  </div>
                  <Badge variant={keyword.difficulty === 'high' ? 'destructive' : 
                               keyword.difficulty === 'medium' ? 'secondary' : 'default'}>
                    {keyword.difficulty} difficulty
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Your Position</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {keyword.yourPosition.toFixed(1)}
                      </span>
                      {keyword.positionChange !== 0 && (
                        <div className="flex items-center">
                          {keyword.positionChange < 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            {Math.abs(keyword.positionChange)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Top Competitor</p>
                    <p className="text-sm">{keyword.topCompetitor || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      Position: {keyword.competitorPosition || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Opportunity</p>
                    <p className="text-sm">{keyword.opportunity}</p>
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
              data={searchData?.visibilityTrend || []}
              dataKey="visibility"
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
                  {searchData?.quickWins || 0} keywords ranking 11-20 that could easily reach page 1
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="font-medium text-sm">Content Gaps</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchData?.contentGaps || 0} high-value keywords competitors rank for but you don't
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="font-medium text-sm">Featured Snippets</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchData?.snippetOpportunities || 0} queries where you could win featured snippets
                </p>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="font-medium text-sm">Local Pack</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchData?.localPackOpportunities || 0} local searches where you're not in the 3-pack
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}