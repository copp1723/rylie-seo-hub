import { parseAnalyticsQuery, isValidQuery, getQueryDescription } from '../parser';
import { AnalyticsIntent, AnalyticsQuery } from '../types';

describe('Analytics Query Parser', () => {
  describe('parseAnalyticsQuery', () => {
    test('should parse traffic-related queries', () => {
      const query = parseAnalyticsQuery('How many visitors did we get last month?');
      
      expect(query.intent).toBe('traffic');
      expect(query.metrics).toContain('sessions');
      expect(query.metrics).toContain('users');
      expect(query.dimensions).toContain('date');
      
      // Date range check - last month
      const now = new Date();
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      expect(query.dateRange.start.getMonth()).toBe(firstDayLastMonth.getMonth());
      expect(query.dateRange.end.getMonth()).toBe(lastDayLastMonth.getMonth());
    });

    test('should parse engagement-related queries', () => {
      const query = parseAnalyticsQuery('What is our average time on site this week?');
      
      expect(query.intent).toBe('engagement');
      expect(query.metrics).toContain('sessionDuration');
      
      // Date range check - this week
      const now = new Date();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      
      expect(query.dateRange.start.getDate()).toBe(startOfWeek.getDate());
    });

    test('should parse conversion-related queries', () => {
      const query = parseAnalyticsQuery('How many leads did we generate last week?');
      
      expect(query.intent).toBe('conversion');
      expect(query.metrics).toContain('conversions');
    });

    test('should parse comparison queries', () => {
      const query = parseAnalyticsQuery('How does our traffic compare to last month?');
      
      expect(query.intent).toBe('comparison');
      expect(query.dateRange.comparison).toBe('previous_period');
    });

    test('should parse ranking-related queries', () => {
      const query = parseAnalyticsQuery('What keywords are we ranking for?');
      
      expect(query.intent).toBe('ranking');
      expect(query.metrics).toContain('position');
      expect(query.metrics).toContain('clicks');
      expect(query.dimensions).toContain('query');
    });

    test('should parse content performance queries', () => {
      const query = parseAnalyticsQuery('What are our top 5 performing pages?');
      
      expect(query.intent).toBe('content');
      expect(query.metrics).toContain('pageviews');
      expect(query.dimensions).toContain('pagePath');
      expect(query.dimensions).toContain('pageTitle');
      expect(query.limit).toBe(5);
    });

    test('should parse local performance queries', () => {
      const query = parseAnalyticsQuery('Where are our website visitors coming from?');
      
      expect(query.intent).toBe('local');
      expect(query.dimensions).toContain('city');
      expect(query.dimensions).toContain('country');
    });

    test('should extract filters from queries', () => {
      const query = parseAnalyticsQuery('How many visitors came from page "/contact-us"?');
      
      expect(query.filters).toBeDefined();
      expect(query.filters?.page).toBe('/contact-us');
    });

    test('should extract source filters', () => {
      const query = parseAnalyticsQuery('How much traffic came from source "google"?');
      
      expect(query.filters).toBeDefined();
      expect(query.filters?.source).toBe('google');
    });

    test('should handle Google organic traffic special case', () => {
      const query = parseAnalyticsQuery('How much organic traffic from Google did we get?');
      
      expect(query.filters).toBeDefined();
      expect(query.filters?.source).toBe('google');
      expect(query.filters?.medium).toBe('organic');
    });

    test('should handle social media traffic special case', () => {
      const query = parseAnalyticsQuery('How much traffic did we get from social media?');
      
      expect(query.filters).toBeDefined();
      expect(query.filters?.medium).toBe('social');
    });

    test('should set default metrics when none are detected', () => {
      const query = parseAnalyticsQuery('Show me data from last week');
      
      expect(query.metrics.length).toBeGreaterThan(0);
    });

    test('should set default dimensions when none are detected', () => {
      const query = parseAnalyticsQuery('Show me traffic data');
      
      expect(query.dimensions.length).toBeGreaterThan(0);
    });

    test('should default to last 30 days when no time period is specified', () => {
      const query = parseAnalyticsQuery('Show me traffic data');
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      
      expect(query.dateRange.start.getDate()).toBe(thirtyDaysAgo.getDate());
      expect(query.dateRange.end.getDate()).toBe(now.getDate());
    });

    test('should include dealershipId when provided', () => {
      const dealershipId = 'dealer-123';
      const query = parseAnalyticsQuery('Show me traffic data', dealershipId);
      
      expect(query.dealershipId).toBe(dealershipId);
    });

    test('should store the original query', () => {
      const originalQuery = 'How many visitors did we get last month?';
      const query = parseAnalyticsQuery(originalQuery);
      
      expect(query.rawQuery).toBe(originalQuery);
    });
  });

  describe('isValidQuery', () => {
    test('should return true for valid queries', () => {
      const validQuery: AnalyticsQuery = {
        intent: 'traffic',
        metrics: ['sessions'],
        dimensions: ['date'],
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        rawQuery: 'How many visitors did we get?'
      };
      
      expect(isValidQuery(validQuery)).toBe(true);
    });

    test('should return false for queries with unknown intent', () => {
      const invalidQuery: AnalyticsQuery = {
        intent: 'unknown',
        metrics: ['sessions'],
        dimensions: ['date'],
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        rawQuery: 'Tell me a joke'
      };
      
      expect(isValidQuery(invalidQuery)).toBe(false);
    });

    test('should return false for queries without metrics', () => {
      const invalidQuery: AnalyticsQuery = {
        intent: 'traffic',
        metrics: [],
        dimensions: ['date'],
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        rawQuery: 'Show me something'
      };
      
      expect(isValidQuery(invalidQuery)).toBe(false);
    });

    test('should return false for queries without dimensions', () => {
      const invalidQuery: AnalyticsQuery = {
        intent: 'traffic',
        metrics: ['sessions'],
        dimensions: [],
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        rawQuery: 'Show me something'
      };
      
      expect(isValidQuery(invalidQuery)).toBe(false);
    });
  });

  describe('getQueryDescription', () => {
    test('should generate a human-readable description', () => {
      const query: AnalyticsQuery = {
        intent: 'traffic',
        metrics: ['sessions', 'users'],
        dimensions: ['date'],
        dateRange: {
          start: new Date('2025-06-01'),
          end: new Date('2025-06-30')
        },
        rawQuery: 'How many visitors did we get in June?'
      };
      
      const description = getQueryDescription(query);
      
      expect(description).toContain('sessions, users');
      expect(description).toContain('by date');
      expect(description).toContain('from');
      expect(description).toContain('to');
    });

    test('should include filters in the description', () => {
      const query: AnalyticsQuery = {
        intent: 'traffic',
        metrics: ['sessions'],
        dimensions: ['date'],
        dateRange: {
          start: new Date('2025-06-01'),
          end: new Date('2025-06-30')
        },
        filters: {
          source: 'google',
          medium: 'organic'
        },
        rawQuery: 'How many visitors from Google organic did we get in June?'
      };
      
      const description = getQueryDescription(query);
      
      expect(description).toContain('filtered by');
      expect(description).toContain('source: google');
      expect(description).toContain('medium: organic');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty queries', () => {
      const query = parseAnalyticsQuery('');
      
      expect(query.intent).toBe('unknown');
    });

    test('should handle non-analytics queries', () => {
      const query = parseAnalyticsQuery('What is the weather today?');
      
      expect(query.intent).toBe('unknown');
    });

    test('should handle queries with typos', () => {
      const query = parseAnalyticsQuery('How many vistors did we get?'); // Typo in 'visitors'
      
      // Should still detect traffic intent despite typo
      expect(query.intent).toBe('traffic');
    });

    test('should handle queries with mixed intents', () => {
      const query = parseAnalyticsQuery('Show me traffic and conversion data');
      
      // Should detect at least one valid intent
      expect(['traffic', 'conversion']).toContain(query.intent);
    });

    test('should handle complex date ranges', () => {
      const query = parseAnalyticsQuery('Compare this month to the same time last year');
      
      expect(query.dateRange.comparison).toBe('year_over_year');
    });
  });
});
