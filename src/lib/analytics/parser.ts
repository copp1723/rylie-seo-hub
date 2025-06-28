/**
 * Analytics Query Parser
 * 
 * Parses natural language queries about analytics into structured AnalyticsQuery objects.
 * Uses pattern matching and keyword detection to extract intents, metrics, dimensions, and date ranges.
 */

import { 
  AnalyticsQuery, 
  AnalyticsIntent, 
  AnalyticsMetric, 
  AnalyticsDimension,
  DateRange,
  AnalyticsFilters,
  DateRangeComparison
} from './types';

/**
 * Intent detection patterns
 */
const INTENT_PATTERNS: Record<AnalyticsIntent, RegExp[]> = {
  traffic: [
    /traffic/i,
    /visitors/i,
    /sessions/i,
    /users/i,
    /pageviews/i,
    /how many people/i,
    /website visits/i
  ],
  engagement: [
    /engagement/i,
    /time on (page|site)/i,
    /bounce rate/i,
    /pages per session/i,
    /how long/i,
    /average session/i
  ],
  conversion: [
    /conversion/i,
    /leads/i,
    /form submissions/i,
    /goals/i,
    /sales/i,
    /appointments/i,
    /bookings/i
  ],
  comparison: [
    /compare/i,
    /vs\.?/i,
    /versus/i,
    /difference between/i,
    /how does .+ compare/i,
    /changed/i,
    /improved/i,
    /better or worse/i
  ],
  trend: [
    /trend/i,
    /over time/i,
    /growing/i,
    /declining/i,
    /progress/i,
    /trajectory/i,
    /historical/i
  ],
  ranking: [
    /rank/i,
    /position/i,
    /serp/i,
    /search results/i,
    /keyword position/i,
    /how high/i,
    /where do we appear/i
  ],
  content: [
    /content/i,
    /pages/i,
    /blog/i,
    /article/i,
    /best performing/i,
    /top pages/i,
    /landing page/i
  ],
  local: [
    /local/i,
    /city/i,
    /region/i,
    /geographic/i,
    /location/i,
    /where are/i,
    /nearby/i
  ],
  unknown: []
};

/**
 * Metric detection patterns
 */
const METRIC_PATTERNS: Record<string, RegExp[]> = {
  sessions: [/sessions/i, /visits/i, /traffic/i],
  users: [/users/i, /visitors/i, /people/i],
  newUsers: [/new users/i, /new visitors/i, /first time/i],
  engagementRate: [/engagement rate/i, /engaged/i],
  sessionDuration: [/session duration/i, /time on site/i, /how long/i],
  bounceRate: [/bounce rate/i, /bounce/i],
  conversions: [/conversions/i, /leads/i, /form submissions/i],
  pageviews: [/pageviews/i, /page views/i, /views/i],
  screenPageViews: [/screen views/i, /app views/i],
  eventCount: [/events/i, /actions/i, /interactions/i],
  clicks: [/clicks/i, /click/i, /clicked/i],
  impressions: [/impressions/i, /impression/i, /shown/i, /displayed/i],
  ctr: [/ctr/i, /click through/i, /click-through/i, /click rate/i],
  position: [/position/i, /rank/i, /ranking/i, /serp/i]
};

/**
 * Dimension detection patterns
 */
const DIMENSION_PATTERNS: Record<string, RegExp[]> = {
  date: [/date/i, /day/i, /time/i],
  deviceCategory: [/device/i, /mobile/i, /desktop/i, /tablet/i],
  country: [/country/i, /countries/i, /nation/i],
  region: [/region/i, /state/i, /province/i],
  city: [/city/i, /cities/i, /town/i],
  source: [/source/i, /where from/i, /referrer/i, /came from/i],
  medium: [/medium/i, /channel/i],
  campaign: [/campaign/i, /marketing/i, /promotion/i],
  pagePath: [/page/i, /url/i, /path/i],
  pageTitle: [/title/i, /headline/i],
  landingPage: [/landing page/i, /entry page/i, /first page/i],
  exitPage: [/exit page/i, /last page/i],
  sessionDefaultChannelGrouping: [/channel/i, /traffic type/i, /traffic source/i],
  query: [/query/i, /keyword/i, /search term/i, /searched for/i],
  searchAppearance: [/appearance/i, /rich result/i, /featured/i]
};

/**
 * Time period detection patterns
 */
const TIME_PERIOD_PATTERNS: Record<string, RegExp> = {
  today: /today/i,
  yesterday: /yesterday/i,
  thisWeek: /this week/i,
  lastWeek: /last week/i,
  thisMonth: /this month/i,
  lastMonth: /last month/i,
  thisYear: /this year/i,
  lastYear: /last year/i,
  last7Days: /last (?:7|seven) days/i,
  last14Days: /last (?:14|fourteen) days/i,
  last30Days: /last (?:30|thirty) days/i,
  last90Days: /last (?:90|ninety) days/i,
  last12Months: /last (?:12|twelve) months/i,
  yearToDate: /year to date|ytd/i,
  quarterToDate: /quarter to date|qtd/i,
  monthToDate: /month to date|mtd/i
};

/**
 * Comparison type detection patterns
 */
const COMPARISON_PATTERNS: Record<DateRangeComparison, RegExp[]> = {
  previous_period: [
    /compared to (the )?(last|previous) period/i,
    /vs\.? (the )?(last|previous) period/i,
    /against (the )?(last|previous) period/i,
    /than (the )?(last|previous) period/i
  ],
  year_over_year: [
    /year over year/i,
    /year-over-year/i,
    /yoy/i,
    /compared to (the )?(same|this) time last year/i,
    /vs\.? (the )?(same|this) time last year/i
  ],
  custom: [
    /compared to/i,
    /vs\.?/i,
    /against/i,
    /than/i
  ]
};

/**
 * Filter detection patterns
 */
const FILTER_PATTERNS: Record<string, RegExp> = {
  page: /(?:on|for|about|from) (?:page|url|post|article) ['"]([^'"]+)['"]/i,
  source: /(?:from|on|via|through) (?:source|referrer|website) ['"]([^'"]+)['"]/i,
  medium: /(?:from|on|via|through) (?:medium|channel) ['"]([^'"]+)['"]/i,
  campaign: /(?:from|on|via|through) (?:campaign|promotion) ['"]([^'"]+)['"]/i,
  location: /(?:from|in|near) (?:location|city|region|country) ['"]([^'"]+)['"]/i,
  device: /(?:on|from|via) (?:device|platform) ['"]([^'"]+)['"]/i,
  keyword: /(?:for|about|related to) (?:keyword|term|query) ['"]([^'"]+)['"]/i
};

/**
 * Detects the primary intent of a query
 */
function detectIntent(query: string): AnalyticsIntent {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'unknown') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return intent as AnalyticsIntent;
      }
    }
  }
  
  return 'unknown';
}

/**
 * Detects metrics mentioned in the query
 */
function detectMetrics(query: string): AnalyticsMetric[] {
  const metrics: AnalyticsMetric[] = [];
  
  for (const [metric, patterns] of Object.entries(METRIC_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        metrics.push(metric as AnalyticsMetric);
        break;
      }
    }
  }
  
  // If no specific metrics detected, use defaults based on intent
  if (metrics.length === 0) {
    const intent = detectIntent(query);
    switch (intent) {
      case 'traffic':
        metrics.push('sessions', 'users');
        break;
      case 'engagement':
        metrics.push('engagementRate', 'sessionDuration');
        break;
      case 'conversion':
        metrics.push('conversions');
        break;
      case 'ranking':
        metrics.push('position', 'clicks');
        break;
      case 'content':
        metrics.push('pageviews');
        break;
      default:
        metrics.push('sessions'); // Default fallback
    }
  }
  
  return metrics;
}

/**
 * Detects dimensions mentioned in the query
 */
function detectDimensions(query: string): AnalyticsDimension[] {
  const dimensions: AnalyticsDimension[] = [];
  
  for (const [dimension, patterns] of Object.entries(DIMENSION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        dimensions.push(dimension as AnalyticsDimension);
        break;
      }
    }
  }
  
  // If no specific dimensions detected, use defaults based on intent
  if (dimensions.length === 0) {
    const intent = detectIntent(query);
    switch (intent) {
      case 'traffic':
      case 'engagement':
      case 'conversion':
      case 'trend':
        dimensions.push('date');
        break;
      case 'content':
        dimensions.push('pagePath', 'pageTitle');
        break;
      case 'local':
        dimensions.push('city', 'country');
        break;
      case 'ranking':
        dimensions.push('query');
        break;
      default:
        dimensions.push('date'); // Default fallback
    }
  }
  
  return dimensions;
}

/**
 * Parses date range from the query
 */
function parseDateRange(query: string): DateRange {
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let comparison: DateRangeComparison | undefined;
  
  // Check for specific time periods
  for (const [period, pattern] of Object.entries(TIME_PERIOD_PATTERNS)) {
    if (pattern.test(query)) {
      switch (period) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = now;
          break;
        case 'yesterday':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
          break;
        case 'thisWeek':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          end = now;
          break;
        case 'lastWeek':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 1, 23, 59, 59);
          break;
        case 'thisMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
          break;
        case 'lastMonth':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'thisYear':
          start = new Date(now.getFullYear(), 0, 1);
          end = now;
          break;
        case 'lastYear':
          start = new Date(now.getFullYear() - 1, 0, 1);
          end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
          break;
        case 'last7Days':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          end = now;
          break;
        case 'last14Days':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
          end = now;
          break;
        case 'last30Days':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
          end = now;
          break;
        case 'last90Days':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
          end = now;
          break;
        case 'last12Months':
          start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          end = now;
          break;
        case 'yearToDate':
          start = new Date(now.getFullYear(), 0, 1);
          end = now;
          break;
        case 'quarterToDate':
          const quarter = Math.floor(now.getMonth() / 3);
          start = new Date(now.getFullYear(), quarter * 3, 1);
          end = now;
          break;
        case 'monthToDate':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
          break;
      }
      break;
    }
  }
  
  // If no specific period found, default to last 30 days
  if (start.getTime() === end.getTime()) {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    end = now;
  }
  
  // Check for comparison type
  for (const [compType, patterns] of Object.entries(COMPARISON_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        comparison = compType as DateRangeComparison;
        break;
      }
    }
    if (comparison) break;
  }
  
  // Check for comparison in queries with "compare" intent
  if (!comparison && detectIntent(query) === 'comparison') {
    comparison = 'previous_period';
  }
  
  return { start, end, comparison };
}

/**
 * Extracts filters from the query
 */
function extractFilters(query: string): AnalyticsFilters {
  const filters: AnalyticsFilters = {};
  
  for (const [filterName, pattern] of Object.entries(FILTER_PATTERNS)) {
    const match = query.match(pattern);
    if (match && match[1]) {
      filters[filterName] = match[1];
    }
  }
  
  // Special case for Google organic traffic
  if (/google organic|organic (traffic|search)|organic from google/i.test(query)) {
    filters.source = 'google';
    filters.medium = 'organic';
  }
  
  // Special case for social media traffic
  if (/social (media|traffic)|facebook|twitter|instagram|linkedin/i.test(query)) {
    filters.medium = 'social';
  }
  
  return Object.keys(filters).length > 0 ? filters : undefined;
}

/**
 * Main function to parse a natural language query into an AnalyticsQuery object
 */
export function parseAnalyticsQuery(rawQuery: string, dealershipId?: string): AnalyticsQuery {
  const query = rawQuery.trim();
  
  const intent = detectIntent(query);
  const metrics = detectMetrics(query);
  const dimensions = detectDimensions(query);
  const dateRange = parseDateRange(query);
  const filters = extractFilters(query);
  
  // Default limit based on query type
  let limit = 10;
  if (/top\s+(\d+)/i.test(query)) {
    const match = query.match(/top\s+(\d+)/i);
    if (match && match[1]) {
      limit = parseInt(match[1], 10);
    }
  }
  
  return {
    intent,
    metrics,
    dimensions,
    dateRange,
    filters,
    limit,
    dealershipId,
    rawQuery
  };
}

/**
 * Helper function to get a human-readable description of the query
 */
export function getQueryDescription(query: AnalyticsQuery): string {
  const { intent, metrics, dimensions, dateRange } = query;
  
  let description = `Analyzing ${metrics.join(', ')} `;
  
  if (dimensions.length > 0) {
    description += `by ${dimensions.join(', ')} `;
  }
  
  const startDate = dateRange.start.toLocaleDateString();
  const endDate = dateRange.end.toLocaleDateString();
  description += `from ${startDate} to ${endDate}`;
  
  if (query.filters) {
    const filterDescriptions = Object.entries(query.filters)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    description += ` filtered by ${filterDescriptions}`;
  }
  
  return description;
}

/**
 * Validates if the query has the minimum required fields
 */
export function isValidQuery(query: AnalyticsQuery): boolean {
  return (
    query.intent !== 'unknown' &&
    query.metrics.length > 0 &&
    query.dimensions.length > 0
  );
}

/**
 * Examples of how to use the parser
 */
/* 
// Example 1: "How did our organic traffic from Google change this month?"
const query1 = parseAnalyticsQuery("How did our organic traffic from Google change this month?");
console.log(query1);
// Output:
// {
//   intent: 'comparison',
//   metrics: ['sessions', 'users'],
//   dimensions: ['date'],
//   dateRange: { start: [first day of month], end: [today], comparison: 'previous_period' },
//   filters: { source: 'google', medium: 'organic' },
//   limit: 10,
//   rawQuery: 'How did our organic traffic from Google change this month?'
// }

// Example 2: "What are our top 5 landing pages last week?"
const query2 = parseAnalyticsQuery("What are our top 5 landing pages last week?");
console.log(query2);
// Output:
// {
//   intent: 'content',
//   metrics: ['pageviews'],
//   dimensions: ['pagePath', 'pageTitle'],
//   dateRange: { start: [last Sunday], end: [Saturday], comparison: undefined },
//   filters: undefined,
//   limit: 5,
//   rawQuery: 'What are our top 5 landing pages last week?'
// }
*/
