/**
 * Analytics Data Fetcher
 * 
 * Service to fetch data from GA4 and Google Search Console APIs based on parsed analytics queries.
 * Handles API calls, data transformation, visualization generation, and caching.
 */

import { 
  AnalyticsQuery, 
  AnalyticsData,
  AnalyticsVisualization,
  VisualizationType,
  VisualizationData,
  Dataset,
  AnalyticsInsight,
  TrendDirection,
  SignificanceLevel,
  DateRange
} from './types';

/**
 * Cache entry for analytics data
 */
interface CacheEntry {
  data: AnalyticsData;
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  // Cache expiration in milliseconds (30 minutes)
  TTL: 30 * 60 * 1000,
  // Maximum cache size
  MAX_SIZE: 100
};

/**
 * Simple in-memory cache for analytics data
 */
class AnalyticsCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  /**
   * Generate a cache key from a query
   */
  private generateKey(query: AnalyticsQuery): string {
    const { intent, metrics, dimensions, dateRange, filters, dealershipId } = query;
    
    return JSON.stringify({
      intent,
      metrics: metrics.sort(),
      dimensions: dimensions.sort(),
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        comparison: dateRange.comparison
      },
      filters,
      dealershipId
    });
  }
  
  /**
   * Get data from cache if available and not expired
   */
  get(query: AnalyticsQuery): AnalyticsData | null {
    const key = this.generateKey(query);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Store data in cache
   */
  set(query: AnalyticsQuery, data: AnalyticsData): void {
    // Maintain cache size limit
    if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
    const key = this.generateKey(query);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_CONFIG.TTL
    });
  }
  
  /**
   * Clear cache entries for a specific dealership
   */
  clearForDealership(dealershipId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(dealershipId)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Main analytics data fetcher class
 */
export class AnalyticsDataFetcher {
  private cache: AnalyticsCache = new AnalyticsCache();
  
  /**
   * Fetch analytics data based on the query
   */
  async fetchData(query: AnalyticsQuery): Promise<AnalyticsData> {
    // Check cache first
    const cachedData = this.cache.get(query);
    if (cachedData) {
      return cachedData;
    }
    
    // Determine which data sources to use based on the query
    const needsGA4 = this.queryNeedsGA4(query);
    const needsSearchConsole = this.queryNeedsSearchConsole(query);
    
    let ga4Data: any = null;
    let searchConsoleData: any = null;
    
    // Fetch data from required sources
    if (needsGA4) {
      ga4Data = await this.fetchGA4Data(query);
    }
    
    if (needsSearchConsole) {
      searchConsoleData = await this.fetchSearchConsoleData(query);
    }
    
    // Combine data from multiple sources if needed
    const rawData = this.combineData(ga4Data, searchConsoleData);
    
    // Generate visualizations
    const visualizations = this.generateVisualizations(query, rawData);
    
    // Create analytics data response
    const analyticsData: AnalyticsData = {
      source: needsGA4 && needsSearchConsole ? 'combined' : 
              needsGA4 ? 'ga4' : 'searchConsole',
      query,
      rawData,
      visualizations,
      dateGenerated: new Date()
    };
    
    // Cache the result
    this.cache.set(query, analyticsData);
    
    return analyticsData;
  }
  
  /**
   * Determine if the query needs GA4 data
   */
  private queryNeedsGA4(query: AnalyticsQuery): boolean {
    const ga4Metrics = [
      'sessions', 'users', 'newUsers', 'engagementRate', 
      'sessionDuration', 'bounceRate', 'conversions',
      'pageviews', 'screenPageViews', 'eventCount'
    ];
    
    // Check if any of the requested metrics are GA4 metrics
    return query.metrics.some(metric => 
      ga4Metrics.includes(metric as string)
    );
  }
  
  /**
   * Determine if the query needs Search Console data
   */
  private queryNeedsSearchConsole(query: AnalyticsQuery): boolean {
    const searchConsoleMetrics = [
      'clicks', 'impressions', 'ctr', 'position'
    ];
    
    // Check if any of the requested metrics are Search Console metrics
    return query.metrics.some(metric => 
      searchConsoleMetrics.includes(metric as string)
    ) || query.intent === 'ranking';
  }
  
  /**
   * Fetch data from GA4 API
   */
  private async fetchGA4Data(query: AnalyticsQuery): Promise<any> {
    try {
      // Prepare request parameters
      const params = this.buildGA4Params(query);
      
      // Make API request
      const response = await fetch('/api/ga4/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.transformGA4Response(data, query);
    } catch (error) {
      console.error('Error fetching GA4 data:', error);
      throw new Error('Failed to fetch analytics data from GA4');
    }
  }
  
  /**
   * Build parameters for GA4 API request
   */
  private buildGA4Params(query: AnalyticsQuery): any {
    const { metrics, dimensions, dateRange, filters, limit } = query;
    
    // Convert metrics to GA4 format
    const ga4Metrics = metrics.map(metric => ({ name: metric }));
    
    // Convert dimensions to GA4 format
    const ga4Dimensions = dimensions.map(dimension => ({ name: dimension }));
    
    // Format date range
    const dateRanges = [{
      startDate: this.formatDate(dateRange.start),
      endDate: this.formatDate(dateRange.end)
    }];
    
    // Add comparison date range if needed
    if (dateRange.comparison) {
      const comparisonRange = this.getComparisonDateRange(dateRange);
      dateRanges.push({
        startDate: this.formatDate(comparisonRange.start),
        endDate: this.formatDate(comparisonRange.end)
      });
    }
    
    // Convert filters to GA4 format if present
    let dimensionFilter;
    if (filters) {
      dimensionFilter = {
        andGroup: {
          expressions: Object.entries(filters).map(([key, value]) => ({
            filter: {
              fieldName: key,
              stringFilter: {
                matchType: 'EXACT',
                value
              }
            }
          }))
        }
      };
    }
    
    return {
      metrics: ga4Metrics,
      dimensions: ga4Dimensions,
      dateRanges,
      dimensionFilter,
      limit: limit || 10
    };
  }
  
  /**
   * Transform GA4 API response to our format
   */
  private transformGA4Response(data: any, query: AnalyticsQuery): any {
    // Handle empty response
    if (!data || !data.rows || data.rows.length === 0) {
      return {
        rows: [],
        totals: [],
        metadata: {
          metrics: query.metrics,
          dimensions: query.dimensions
        }
      };
    }
    
    // Extract dimension and metric headers
    const dimensionHeaders = data.dimensionHeaders || [];
    const metricHeaders = data.metricHeaders || [];
    
    // Transform rows
    const rows = data.rows.map((row: any) => {
      const dimensionValues = row.dimensionValues || [];
      const metricValues = row.metricValues || [];
      
      const transformedRow: any = {};
      
      // Add dimensions
      dimensionHeaders.forEach((header: any, index: number) => {
        const value = dimensionValues[index]?.value;
        transformedRow[header.name] = value;
      });
      
      // Add metrics
      metricHeaders.forEach((header: any, index: number) => {
        const value = metricValues[index]?.value;
        transformedRow[header.name] = this.parseMetricValue(value, header.name);
      });
      
      return transformedRow;
    });
    
    // Extract totals
    const totals = data.totals?.[0]?.metricValues?.map((value: any, index: number) => ({
      metric: metricHeaders[index]?.name,
      value: this.parseMetricValue(value.value, metricHeaders[index]?.name)
    })) || [];
    
    return {
      rows,
      totals,
      metadata: {
        metrics: query.metrics,
        dimensions: query.dimensions
      }
    };
  }
  
  /**
   * Parse metric value to appropriate type
   */
  private parseMetricValue(value: string, metricName: string): number {
    // Convert string value to number
    const numValue = parseFloat(value);
    
    // Handle percentage metrics
    if (['bounceRate', 'engagementRate', 'ctr'].includes(metricName)) {
      return numValue * 100; // Convert to percentage
    }
    
    return numValue;
  }
  
  /**
   * Fetch data from Search Console API
   */
  private async fetchSearchConsoleData(query: AnalyticsQuery): Promise<any> {
    try {
      // Prepare request parameters
      const params = this.buildSearchConsoleParams(query);
      
      // Make API request
      const response = await fetch('/api/search-console/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Search Console API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.transformSearchConsoleResponse(data, query);
    } catch (error) {
      console.error('Error fetching Search Console data:', error);
      throw new Error('Failed to fetch analytics data from Search Console');
    }
  }
  
  /**
   * Build parameters for Search Console API request
   */
  private buildSearchConsoleParams(query: AnalyticsQuery): any {
    const { dimensions, dateRange, filters, limit } = query;
    
    // Convert dimensions to Search Console format
    const scDimensions = dimensions.filter(dim => 
      ['date', 'country', 'device', 'page', 'query', 'searchAppearance'].includes(dim as string)
    );
    
    // Format date range
    const startDate = this.formatDate(dateRange.start);
    const endDate = this.formatDate(dateRange.end);
    
    // Handle comparison date range if needed
    let compareDateRange;
    if (dateRange.comparison) {
      const comparisonRange = this.getComparisonDateRange(dateRange);
      compareDateRange = {
        startDate: this.formatDate(comparisonRange.start),
        endDate: this.formatDate(comparisonRange.end)
      };
    }
    
    // Convert filters to Search Console format if present
    let dimensionFilterGroups = [];
    if (filters) {
      const filterGroup = {
        filters: Object.entries(filters)
          .filter(([key]) => ['page', 'country', 'device', 'query'].includes(key))
          .map(([key, value]) => ({
            dimension: key,
            operator: 'equals',
            expression: value
          }))
      };
      
      if (filterGroup.filters.length > 0) {
        dimensionFilterGroups.push(filterGroup);
      }
    }
    
    return {
      startDate,
      endDate,
      dimensions: scDimensions,
      compareDateRange,
      dimensionFilterGroups: dimensionFilterGroups.length > 0 ? dimensionFilterGroups : undefined,
      rowLimit: limit || 10
    };
  }
  
  /**
   * Transform Search Console API response to our format
   */
  private transformSearchConsoleResponse(data: any, query: AnalyticsQuery): any {
    // Handle empty response
    if (!data || !data.rows || data.rows.length === 0) {
      return {
        rows: [],
        totals: {
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0
        },
        metadata: {
          metrics: query.metrics,
          dimensions: query.dimensions
        }
      };
    }
    
    // Calculate totals
    const totals = {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    };
    
    // Transform rows
    const rows = data.rows.map((row: any) => {
      // Update totals
      totals.clicks += row.clicks || 0;
      totals.impressions += row.impressions || 0;
      
      return row;
    });
    
    // Calculate average CTR and position
    if (rows.length > 0) {
      totals.ctr = (totals.clicks / totals.impressions) * 100;
      totals.position = rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) / rows.length;
    }
    
    return {
      rows,
      totals,
      metadata: {
        metrics: query.metrics,
        dimensions: query.dimensions
      }
    };
  }
  
  /**
   * Combine data from multiple sources
   */
  private combineData(ga4Data: any, searchConsoleData: any): any {
    // If only one data source, return it
    if (!ga4Data) return searchConsoleData;
    if (!searchConsoleData) return ga4Data;
    
    // For now, just return both data sources separately
    // In a real implementation, we would merge the data based on common dimensions
    return {
      ga4: ga4Data,
      searchConsole: searchConsoleData
    };
  }
  
  /**
   * Generate visualizations based on query and data
   */
  private generateVisualizations(query: AnalyticsQuery, data: any): AnalyticsVisualization[] {
    const visualizations: AnalyticsVisualization[] = [];
    const { intent, metrics, dimensions } = query;
    
    // Handle empty data
    if (!data || (data.rows && data.rows.length === 0)) {
      return visualizations;
    }
    
    // Generate appropriate visualizations based on intent and data
    switch (intent) {
      case 'traffic':
      case 'trend':
        if (dimensions.includes('date')) {
          visualizations.push(this.createTimeSeriesVisualization(query, data));
        }
        break;
        
      case 'content':
        visualizations.push(this.createContentPerformanceVisualization(query, data));
        break;
        
      case 'ranking':
        visualizations.push(this.createKeywordRankingVisualization(query, data));
        break;
        
      case 'comparison':
        visualizations.push(this.createComparisonVisualization(query, data));
        break;
        
      case 'local':
        if (dimensions.includes('city') || dimensions.includes('country')) {
          visualizations.push(this.createGeographicVisualization(query, data));
        }
        break;
    }
    
    // Add a metric summary visualization for all queries
    visualizations.push(this.createMetricSummaryVisualization(query, data));
    
    return visualizations;
  }
  
  /**
   * Create a time series visualization
   */
  private createTimeSeriesVisualization(query: AnalyticsQuery, data: any): AnalyticsVisualization {
    const { metrics } = query;
    const rows = data.rows || [];
    
    // Extract dates and metric values
    const labels: string[] = [];
    const datasets: Dataset[] = metrics.map(metric => ({
      label: this.formatMetricName(metric as string),
      data: [],
      borderColor: this.getColorForMetric(metric as string),
      backgroundColor: this.getColorForMetric(metric as string, 0.2)
    }));
    
    // Sort rows by date
    const sortedRows = [...rows].sort((a, b) => {
      const dateA = new Date(a.date || a.datehour || '');
      const dateB = new Date(b.date || b.datehour || '');
      return dateA.getTime() - dateB.getTime();
    });
    
    // Extract data points
    sortedRows.forEach((row: any) => {
      const dateStr = row.date || row.datehour || '';
      const formattedDate = this.formatDateForDisplay(dateStr);
      
      labels.push(formattedDate);
      
      metrics.forEach((metric, index) => {
        datasets[index].data.push(row[metric as string] || 0);
      });
    });
    
    // Calculate trend insights
    const insights = this.calculateTrendInsights(datasets[0].data);
    
    return {
      type: 'line',
      title: `${this.formatMetricName(metrics[0] as string)} Over Time`,
      data: { labels, datasets },
      insights,
      timeGranularity: this.determineTimeGranularity(query.dateRange)
    };
  }
  
  /**
   * Create a content performance visualization
   */
  private createContentPerformanceVisualization(query: AnalyticsQuery, data: any): AnalyticsVisualization {
    const { metrics } = query;
    const rows = data.rows || [];
    const primaryMetric = metrics[0] as string;
    
    // Sort rows by primary metric in descending order
    const sortedRows = [...rows].sort((a, b) => 
      (b[primaryMetric] || 0) - (a[primaryMetric] || 0)
    ).slice(0, 10); // Limit to top 10
    
    // Extract labels (page titles or paths)
    const labels = sortedRows.map((row: any) => {
      return row.pageTitle || row.pagePath || row.page || 'Unknown';
    });
    
    // Extract metric values
    const datasets: Dataset[] = metrics.map(metric => ({
      label: this.formatMetricName(metric as string),
      data: sortedRows.map((row: any) => row[metric as string] || 0),
      backgroundColor: this.getColorForMetric(metric as string, 0.7)
    }));
    
    // Calculate insights
    const insights = this.calculateDistributionInsights(datasets[0].data);
    
    return {
      type: 'bar',
      title: `Top Content by ${this.formatMetricName(primaryMetric)}`,
      data: { labels, datasets },
      insights
    };
  }
  
  /**
   * Create a keyword ranking visualization
   */
  private createKeywordRankingVisualization(query: AnalyticsQuery, data: any): AnalyticsVisualization {
    const rows = data.searchConsole?.rows || data.rows || [];
    
    // Sort rows by position (ascending) and clicks (descending)
    const sortedRows = [...rows].sort((a, b) => {
      if (a.position !== b.position) {
        return (a.position || 100) - (b.position || 100);
      }
      return (b.clicks || 0) - (a.clicks || 0);
    }).slice(0, 10); // Limit to top 10
    
    // Extract labels (keywords)
    const labels = sortedRows.map((row: any) => row.query || 'Unknown');
    
    // Create datasets for position (primary y-axis) and clicks (secondary y-axis)
    const datasets: Dataset[] = [
      {
        label: 'Position',
        data: sortedRows.map((row: any) => row.position || 0),
        borderColor: '#4285F4',
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        yAxisID: 'y'
      },
      {
        label: 'Clicks',
        data: sortedRows.map((row: any) => row.clicks || 0),
        borderColor: '#34A853',
        backgroundColor: 'rgba(52, 168, 83, 0.2)',
        yAxisID: 'y1'
      }
    ];
    
    // Calculate insights
    const positionData = datasets[0].data;
    const avgPosition = positionData.reduce((sum, val) => sum + val, 0) / positionData.length;
    
    const insights: AnalyticsInsight = {
      trend: avgPosition <= 10 ? 'up' : 'down',
      significance: avgPosition <= 5 ? 'high' : avgPosition <= 15 ? 'medium' : 'low',
      recommendation: avgPosition <= 10 
        ? 'Your top keywords are ranking well. Focus on increasing CTR with better meta descriptions.'
        : 'Work on improving rankings for these keywords through content optimization and backlinks.'
    };
    
    return {
      type: 'bar',
      title: 'Top Keyword Rankings',
      data: { labels, datasets },
      insights
    };
  }
  
  /**
   * Create a comparison visualization
   */
  private createComparisonVisualization(query: AnalyticsQuery, data: any): AnalyticsVisualization {
    const { metrics, dateRange } = query;
    const primaryMetric = metrics[0] as string;
    
    // Handle different data structures based on source
    let currentValue = 0;
    let previousValue = 0;
    
    if (data.ga4) {
      // GA4 data with comparison
      currentValue = data.ga4.totals?.[0]?.[primaryMetric] || 0;
      previousValue = data.ga4.totals?.[1]?.[primaryMetric] || 0;
    } else if (data.searchConsole) {
      // Search Console data with comparison
      currentValue = data.searchConsole.totals?.[primaryMetric] || 0;
      previousValue = data.searchConsole.compareTotals?.[primaryMetric] || 0;
    } else {
      // Direct data
      currentValue = data.totals?.[0]?.[primaryMetric] || data.totals?.[primaryMetric] || 0;
      previousValue = data.totals?.[1]?.[primaryMetric] || data.compareTotals?.[primaryMetric] || 0;
    }
    
    // Calculate percentage change
    const percentChange = previousValue !== 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : 100;
    
    // Create datasets for the comparison
    const labels = [
      this.formatDateRangeForDisplay(dateRange),
      this.formatComparisonRangeForDisplay(dateRange)
    ];
    
    const datasets: Dataset[] = [{
      label: this.formatMetricName(primaryMetric),
      data: [currentValue, previousValue],
      backgroundColor: [
        this.getColorForMetric(primaryMetric, 0.7),
        this.getColorForMetric(primaryMetric, 0.4)
      ]
    }];
    
    // Calculate insights
    const insights: AnalyticsInsight = {
      trend: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'stable',
      significance: Math.abs(percentChange) > 20 ? 'high' : Math.abs(percentChange) > 5 ? 'medium' : 'low',
      percentage: percentChange,
      recommendation: percentChange > 0 
        ? `Continue the strategies that led to this ${percentChange.toFixed(1)}% increase.`
        : `Investigate what caused this ${Math.abs(percentChange).toFixed(1)}% decrease and adjust your strategy.`
    };
    
    return {
      type: 'bar',
      title: `${this.formatMetricName(primaryMetric)} Comparison`,
      data: { labels, datasets },
      insights
    };
  }
  
  /**
   * Create a geographic visualization
   */
  private createGeographicVisualization(query: AnalyticsQuery, data: any): AnalyticsVisualization {
    const { metrics } = query;
    const rows = data.rows || [];
    const primaryMetric = metrics[0] as string;
    
    // Group by location and sum metrics
    const locationMap = new Map<string, number>();
    
    rows.forEach((row: any) => {
      const location = row.city || row.country || 'Unknown';
      const value = row[primaryMetric] || 0;
      
      locationMap.set(location, (locationMap.get(location) || 0) + value);
    });
    
    // Convert to arrays for visualization
    const locationEntries = Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const labels = locationEntries.map(([location]) => location);
    const values = locationEntries.map(([, value]) => value);
    
    const datasets: Dataset[] = [{
      label: this.formatMetricName(primaryMetric),
      data: values,
      backgroundColor: this.getColorForMetric(primaryMetric, 0.7)
    }];
    
    // Calculate insights
    const topLocation = labels[0];
    const topValue = values[0];
    const totalValue = values.reduce((sum, val) => sum + val, 0);
    const topPercentage = (topValue / totalValue) * 100;
    
    const insights: AnalyticsInsight = {
      trend: 'stable',
      significance: topPercentage > 50 ? 'high' : topPercentage > 25 ? 'medium' : 'low',
      percentage: topPercentage,
      recommendation: topPercentage > 40
        ? `${topLocation} represents ${topPercentage.toFixed(1)}% of your ${this.formatMetricName(primaryMetric)}. Consider diversifying your reach.`
        : `Your ${this.formatMetricName(primaryMetric)} is well distributed across locations.`
    };
    
    return {
      type: 'pie',
      title: `${this.formatMetricName(primaryMetric)} by Location`,
      data: { labels, datasets },
      insights
    };
  }
  
  /**
   * Create a metric summary visualization
   */
  private createMetricSummaryVisualization(query: AnalyticsQuery, data: any): AnalyticsVisualization {
    const { metrics } = query;
    
    // Extract metric values from totals
    const metricValues: Record<string, number> = {};
    
    if (data.ga4 && data.searchConsole) {
      // Combined data
      metrics.forEach(metric => {
        if (this.queryNeedsGA4({ ...query, metrics: [metric] })) {
          metricValues[metric as string] = data.ga4.totals?.[0]?.[metric as string] || 0;
        } else {
          metricValues[metric as string] = data.searchConsole.totals?.[metric as string] || 0;
        }
      });
    } else if (data.totals) {
      // Single data source with totals array
      if (Array.isArray(data.totals)) {
        metrics.forEach((metric, index) => {
          metricValues[metric as string] = data.totals[0]?.[metric as string] || 0;
        });
      } else {
        // Single data source with totals object
        metrics.forEach(metric => {
          metricValues[metric as string] = data.totals[metric as string] || 0;
        });
      }
    }
    
    // Create dataset for the metric summary
    const labels = metrics.map(metric => this.formatMetricName(metric as string));
    const values = metrics.map(metric => metricValues[metric as string] || 0);
    
    const datasets: Dataset[] = [{
      label: 'Value',
      data: values,
      backgroundColor: metrics.map(metric => this.getColorForMetric(metric as string, 0.7))
    }];
    
    // Simple insights
    const insights: AnalyticsInsight = {
      trend: 'stable',
      significance: 'medium',
      recommendation: 'This is a summary of your key metrics for the selected time period.'
    };
    
    return {
      type: 'metric',
      title: 'Key Metrics Summary',
      data: { labels, datasets },
      insights
    };
  }
  
  /**
   * Calculate trend insights from time series data
   */
  private calculateTrendInsights(data: number[]): AnalyticsInsight {
    if (data.length < 2) {
      return { trend: 'stable', significance: 'low' };
    }
    
    // Calculate percentage change from first to last point
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    const percentChange = firstValue !== 0 
      ? ((lastValue - firstValue) / firstValue) * 100 
      : 100;
    
    // Determine trend direction
    const trend: TrendDirection = percentChange > 5 
      ? 'up' 
      : percentChange < -5 
        ? 'down' 
        : 'stable';
    
    // Determine significance
    const significance: SignificanceLevel = Math.abs(percentChange) > 25 
      ? 'high' 
      : Math.abs(percentChange) > 10 
        ? 'medium' 
        : 'low';
    
    // Generate recommendation
    let recommendation = '';
    if (trend === 'up' && significance === 'high') {
      recommendation = `Strong positive trend with ${percentChange.toFixed(1)}% growth. Continue your current strategy.`;
    } else if (trend === 'up') {
      recommendation = `Positive trend with ${percentChange.toFixed(1)}% growth. Monitor to ensure continued improvement.`;
    } else if (trend === 'down' && significance === 'high') {
      recommendation = `Significant decline of ${Math.abs(percentChange).toFixed(1)}%. Immediate attention required.`;
    } else if (trend === 'down') {
      recommendation = `Declining trend of ${Math.abs(percentChange).toFixed(1)}%. Review recent changes that might have caused this.`;
    } else {
      recommendation = 'Stable performance. Consider testing new strategies for potential growth.';
    }
    
    return {
      trend,
      significance,
      percentage: percentChange,
      recommendation
    };
  }
  
  /**
   * Calculate distribution insights from bar/pie data
   */
  private calculateDistributionInsights(data: number[]): AnalyticsInsight {
    if (data.length === 0) {
      return { trend: 'stable', significance: 'low' };
    }
    
    // Calculate total and top value percentage
    const total = data.reduce((sum, val) => sum + val, 0);
    const topValue = Math.max(...data);
    const topPercentage = (topValue / total) * 100;
    
    // Calculate concentration (Gini coefficient simplified)
    let concentration = 0;
    if (data.length > 1) {
      const sortedData = [...data].sort((a, b) => a - b);
      let sumOfDifferences = 0;
      
      for (let i = 0; i < sortedData.length; i++) {
        for (let j = i + 1; j < sortedData.length; j++) {
          sumOfDifferences += Math.abs(sortedData[i] - sortedData[j]);
        }
      }
      
      concentration = sumOfDifferences / (2 * data.length * data.length * (total / data.length));
    }
    
    // Determine significance based on concentration
    const significance: SignificanceLevel = concentration > 0.5 
      ? 'high' 
      : concentration > 0.3 
        ? 'medium' 
        : 'low';
    
    // Generate recommendation
    let recommendation = '';
    if (significance === 'high') {
      recommendation = `Your top performer represents ${topPercentage.toFixed(1)}% of the total. Consider diversifying while learning from this success.`;
    } else if (significance === 'medium') {
      recommendation = `You have a healthy distribution with some standout performers. Replicate what works well.`;
    } else {
      recommendation = `Very even distribution. Identify which areas have the most potential for growth and focus efforts there.`;
    }
    
    return {
      trend: 'stable',
      significance,
      percentage: topPercentage,
      recommendation
    };
  }
  
  /**
   * Format a date for API requests (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Format a date for display
   */
  private formatDateForDisplay(dateStr: string): string {
    // Handle different date formats
    if (dateStr.length === 8) {
      // YYYYMMDD format
      return `${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`;
    }
    
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  
  /**
   * Format a date range for display
   */
  private formatDateRangeForDisplay(dateRange: DateRange): string {
    const start = dateRange.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const end = dateRange.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  }
  
  /**
   * Format a comparison range for display
   */
  private formatComparisonRangeForDisplay(dateRange: DateRange): string {
    const comparisonRange = this.getComparisonDateRange(dateRange);
    return this.formatDateRangeForDisplay(comparisonRange);
  }
  
  /**
   * Get comparison date range based on primary date range and comparison type
   */
  private getComparisonDateRange(dateRange: DateRange): DateRange {
    const { start, end, comparison } = dateRange;
    const durationMs = end.getTime() - start.getTime();
    
    let comparisonStart: Date;
    let comparisonEnd: Date;
    
    switch (comparison) {
      case 'previous_period':
        comparisonStart = new Date(start.getTime() - durationMs);
        comparisonEnd = new Date(end.getTime() - durationMs);
        break;
        
      case 'year_over_year':
        comparisonStart = new Date(start);
        comparisonStart.setFullYear(start.getFullYear() - 1);
        
        comparisonEnd = new Date(end);
        comparisonEnd.setFullYear(end.getFullYear() - 1);
        break;
        
      default:
        comparisonStart = new Date(start.getTime() - durationMs);
        comparisonEnd = new Date(end.getTime() - durationMs);
    }
    
    return { start: comparisonStart, end: comparisonEnd };
  }
  
  /**
   * Format metric name for display
   */
  private formatMetricName(metric: string): string {
    // Convert camelCase to Title Case with spaces
    return metric
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  /**
   * Get color for a metric
   */
  private getColorForMetric(metric: string, alpha: number = 1): string {
    // Map of metrics to colors
    const colorMap: Record<string, string> = {
      sessions: `rgba(66, 133, 244, ${alpha})`,       // Google Blue
      users: `rgba(52, 168, 83, ${alpha})`,           // Google Green
      newUsers: `rgba(251, 188, 5, ${alpha})`,        // Google Yellow
      pageviews: `rgba(234, 67, 53, ${alpha})`,       // Google Red
      sessionDuration: `rgba(26, 115, 232, ${alpha})`, // Light Blue
      bounceRate: `rgba(255, 109, 0, ${alpha})`,      // Orange
      engagementRate: `rgba(0, 200, 83, ${alpha})`,   // Bright Green
      conversions: `rgba(103, 58, 183, ${alpha})`,    // Purple
      clicks: `rgba(0, 172, 193, ${alpha})`,          // Teal
      impressions: `rgba(156, 39, 176, ${alpha})`,    // Deep Purple
      ctr: `rgba(255, 152, 0, ${alpha})`,             // Amber
      position: `rgba(3, 169, 244, ${alpha})`         // Light Blue
    };
    
    return colorMap[metric] || `rgba(96, 125, 139, ${alpha})`; // Default: Blue Grey
  }
  
  /**
   * Determine time granularity based on date range
   */
  private determineTimeGranularity(dateRange: DateRange): 'day' | 'week' | 'month' | 'quarter' | 'year' {
    const durationDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    
    if (durationDays <= 14) {
      return 'day';
    } else if (durationDays <= 90) {
      return 'week';
    } else if (durationDays <= 365) {
      return 'month';
    } else if (durationDays <= 730) {
      return 'quarter';
    } else {
      return 'year';
    }
  }
}

// Export singleton instance for use throughout the application
export const analyticsDataFetcher = new AnalyticsDataFetcher();
