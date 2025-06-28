/**
 * Analytics Query System Types
 * 
 * This module defines the core types for the conversational analytics assistant,
 * including query parsing, data fetching, and visualization components.
 */

/**
 * Represents the intent of an analytics query
 */
export type AnalyticsIntent = 
  | 'traffic'      // Overall visitor metrics
  | 'engagement'   // How users interact with content
  | 'conversion'   // Lead generation and goal completion
  | 'comparison'   // Comparing time periods or segments
  | 'trend'        // How metrics change over time
  | 'ranking'      // Search position and visibility
  | 'content'      // Content performance analysis
  | 'local'        // Geographic performance
  | 'unknown';     // Could not determine intent

/**
 * Common GA4 metrics
 */
export type GA4Metric = 
  | 'sessions'
  | 'users'
  | 'newUsers'
  | 'engagementRate'
  | 'sessionDuration'
  | 'bounceRate'
  | 'conversions'
  | 'pageviews'
  | 'screenPageViews'
  | 'eventCount';

/**
 * Common Search Console metrics
 */
export type SearchConsoleMetric =
  | 'clicks'
  | 'impressions'
  | 'ctr'
  | 'position';

/**
 * Combined analytics metrics
 */
export type AnalyticsMetric = GA4Metric | SearchConsoleMetric | string;

/**
 * Common GA4 dimensions
 */
export type GA4Dimension =
  | 'date'
  | 'deviceCategory'
  | 'country'
  | 'region'
  | 'city'
  | 'source'
  | 'medium'
  | 'campaign'
  | 'pagePath'
  | 'pageTitle'
  | 'landingPage'
  | 'exitPage'
  | 'sessionDefaultChannelGrouping';

/**
 * Common Search Console dimensions
 */
export type SearchConsoleDimension =
  | 'date'
  | 'country'
  | 'device'
  | 'page'
  | 'query'
  | 'searchAppearance';

/**
 * Combined analytics dimensions
 */
export type AnalyticsDimension = GA4Dimension | SearchConsoleDimension | string;

/**
 * Date range comparison types
 */
export type DateRangeComparison = 
  | 'previous_period'
  | 'year_over_year'
  | 'custom';

/**
 * Date range for analytics queries
 */
export interface DateRange {
  start: Date;
  end: Date;
  comparison?: DateRangeComparison;
}

/**
 * Filters for analytics queries
 */
export interface AnalyticsFilters {
  page?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  location?: string;
  device?: string;
  keyword?: string;
  [key: string]: string | undefined;
}

/**
 * Core interface for parsed analytics queries
 */
export interface AnalyticsQuery {
  intent: AnalyticsIntent;
  metrics: AnalyticsMetric[];
  dimensions: AnalyticsDimension[];
  dateRange: DateRange;
  filters?: AnalyticsFilters;
  limit?: number;
  dealershipId?: string;
  rawQuery: string;
}

/**
 * Types of visualizations that can be generated
 */
export type VisualizationType = 
  | 'line'    // Time series data
  | 'bar'     // Categorical comparisons
  | 'pie'     // Part-to-whole relationships
  | 'metric'  // Single number with context
  | 'table'   // Tabular data
  | 'map'     // Geographic data
  | 'gauge';  // Progress toward goal

/**
 * Trend direction for insights
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Significance level for insights
 */
export type SignificanceLevel = 'high' | 'medium' | 'low';

/**
 * Insight information for visualizations
 */
export interface AnalyticsInsight {
  trend: TrendDirection;
  significance: SignificanceLevel;
  percentage?: number;
  recommendation?: string;
  anomaly?: boolean;
  seasonalAdjusted?: boolean;
}

/**
 * Data point for visualization
 */
export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  [key: string]: any;
}

/**
 * Dataset for visualization
 */
export interface Dataset {
  label: string;
  data: number[];
  borderColor?: string;
  /**
   * Background color(s) for the dataset.
   * Chart.js accepts either a single color or an array
   * (e.g. pie charts need one color per slice).
   */
  backgroundColor?: string | string[];
  [key: string]: any;
}

/**
 * Visualization data structure
 */
export interface VisualizationData {
  labels: string[];
  datasets: Dataset[];
  [key: string]: any;
}

/**
 * Core interface for analytics visualizations
 */
export interface AnalyticsVisualization {
  type: VisualizationType;
  title: string;
  data: VisualizationData;
  insights: AnalyticsInsight;
  timeGranularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  comparisonData?: VisualizationData;
}

/**
 * Response from analytics data fetcher
 */
export interface AnalyticsData {
  source: 'ga4' | 'searchConsole' | 'combined';
  query: AnalyticsQuery;
  rawData: any;
  visualizations: AnalyticsVisualization[];
  summary?: string;
  dateGenerated: Date;
}

/**
 * Analytics response for chat
 */
export interface AnalyticsResponse {
  text: string;
  visualizations: AnalyticsVisualization[];
  query: AnalyticsQuery;
  followUpQuestions?: string[];
}
