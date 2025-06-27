import prisma from '@/lib/prisma';
import { GA4Service } from '@/lib/google/ga4Service';
import { getSearchConsoleService } from '@/lib/google/searchConsoleService';

interface AggregatedMetrics {
  traffic: {
    current: number;
    previous: number;
    change: number;
    trend: number[];
  };
  search: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    topQueries: Array<{ query: string; clicks: number }>;
  };
  content: {
    topPages: Array<{ page: string; views: number }>;
    avgTimeOnPage: number;
    bounceRate: number;
  };
  conversions: {
    total: number;
    rate: number;
    bySource: Record<string, number>;
  };
}

export async function aggregateReportingData(
  agencyId: string,
  dateRange: { start: Date; end: Date }
): Promise<AggregatedMetrics> {
  // Fetch from multiple sources in parallel
  const [ga4Data, searchConsoleData, internalData] = await Promise.all([
    fetchGA4Metrics(agencyId, dateRange),
    fetchSearchConsoleMetrics(agencyId, dateRange),
    fetchInternalMetrics(agencyId, dateRange),
  ]);

  // Combine and calculate
  return {
    traffic: calculateTrafficMetrics(ga4Data),
    search: calculateSearchMetrics(searchConsoleData),
    content: calculateContentMetrics(ga4Data, internalData),
    conversions: calculateConversionMetrics(ga4Data),
  };
}

async function fetchGA4Metrics(agencyId: string, dateRange: { start: Date; end: Date }) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: { users: { where: { role: 'admin' }, take: 1 } },
  });

  if (!agency?.ga4PropertyId || !agency.users[0]) {
    return null;
  }

  const ga4Service = new GA4Service(agency.users[0].id);
  
  const [traffic, content, conversions] = await Promise.all([
    ga4Service.runReport({
      propertyId: agency.ga4PropertyId,
      metrics: ['sessions', 'users', 'bounceRate'],
      dimensions: ['date'],
      startDate: dateRange.start.toISOString().split('T')[0],
      endDate: dateRange.end.toISOString().split('T')[0],
    }),
    ga4Service.runReport({
      propertyId: agency.ga4PropertyId,
      metrics: ['sessions', 'averageSessionDuration'],
      dimensions: ['pagePath'],
      startDate: dateRange.start.toISOString().split('T')[0],
      endDate: dateRange.end.toISOString().split('T')[0],
      limit: 10,
    }),
    ga4Service.runReport({
      propertyId: agency.ga4PropertyId,
      metrics: ['conversions'],
      dimensions: ['sessionDefaultChannelGroup'],
      startDate: dateRange.start.toISOString().split('T')[0],
      endDate: dateRange.end.toISOString().split('T')[0],
    }),
  ]);

  return { traffic, content, conversions };
}

async function fetchSearchConsoleMetrics(agencyId: string, dateRange: { start: Date; end: Date }) {
  const users = await prisma.user.findMany({
    where: { agencyId, role: 'admin' },
    include: { searchConsoleToken: true },
  });

  const userWithToken = users.find(u => u.searchConsoleToken);
  if (!userWithToken?.searchConsoleToken?.primarySite) {
    return null;
  }

  const searchService = await getSearchConsoleService(userWithToken.id);
  
  const analytics = await searchService.getSearchAnalytics(
    userWithToken.searchConsoleToken.primarySite,
    {
      startDate: dateRange.start.toISOString().split('T')[0],
      endDate: dateRange.end.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 100,
    }
  );

  return analytics;
}

async function fetchInternalMetrics(agencyId: string, dateRange: { start: Date; end: Date }) {
  const orders = await prisma.order.findMany({
    where: {
      agencyId,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    select: {
      taskType: true,
      status: true,
      contentUrl: true,
      pageTitle: true,
    },
  });

  return { orders };
}

function calculateTrafficMetrics(ga4Data: any) {
  if (!ga4Data?.traffic) {
    return {
      current: 0,
      previous: 0,
      change: 0,
      trend: [],
    };
  }

  const rows = ga4Data.traffic.rows || [];
  const halfIndex = Math.floor(rows.length / 2);
  
  const currentPeriod = rows.slice(halfIndex);
  const previousPeriod = rows.slice(0, halfIndex);
  
  const current = currentPeriod.reduce((sum: number, row: any) => 
    sum + parseInt(row.metricValues[0].value), 0);
  const previous = previousPeriod.reduce((sum: number, row: any) => 
    sum + parseInt(row.metricValues[0].value), 0);
  
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  
  const trend = rows.map((row: any) => parseInt(row.metricValues[0].value));

  return { current, previous, change, trend };
}

function calculateSearchMetrics(searchData: any) {
  if (!searchData?.rows) {
    return {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      topQueries: [],
    };
  }

  const totals = searchData.rows.reduce((acc: any, row: any) => ({
    clicks: acc.clicks + (row.clicks || 0),
    impressions: acc.impressions + (row.impressions || 0),
    positionSum: acc.positionSum + ((row.position || 0) * (row.impressions || 0)),
    impressionCount: acc.impressionCount + (row.impressions || 0),
  }), { clicks: 0, impressions: 0, positionSum: 0, impressionCount: 0 });

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const position = totals.impressionCount > 0 ? totals.positionSum / totals.impressionCount : 0;

  const topQueries = searchData.rows
    .sort((a: any, b: any) => b.clicks - a.clicks)
    .slice(0, 10)
    .map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
    }));

  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr,
    position,
    topQueries,
  };
}

function calculateContentMetrics(ga4Data: any, internalData: any) {
  if (!ga4Data?.content) {
    return {
      topPages: [],
      avgTimeOnPage: 0,
      bounceRate: 0,
    };
  }

  const topPages = (ga4Data.content.rows || [])
    .map((row: any) => ({
      page: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value),
    }))
    .slice(0, 10);

  const avgTimeOnPage = ga4Data.content.rows?.reduce((sum: number, row: any) => 
    sum + parseFloat(row.metricValues[1].value), 0) / (ga4Data.content.rows?.length || 1);

  const bounceRate = ga4Data.traffic?.rows?.[0]?.metricValues?.[2]?.value || 0;

  return { topPages, avgTimeOnPage, bounceRate };
}

function calculateConversionMetrics(ga4Data: any) {
  if (!ga4Data?.conversions) {
    return {
      total: 0,
      rate: 0,
      bySource: {},
    };
  }

  const bySource = (ga4Data.conversions.rows || []).reduce((acc: any, row: any) => {
    const source = row.dimensionValues[0].value;
    const conversions = parseInt(row.metricValues[0].value);
    acc[source] = conversions;
    return acc;
  }, {});

  const total = Object.values(bySource).reduce((sum: number, val: any) => sum + val, 0);
  const sessions = ga4Data.traffic?.rows?.reduce((sum: number, row: any) => 
    sum + parseInt(row.metricValues[0].value), 0) || 0;
  const rate = sessions > 0 ? (total / sessions) * 100 : 0;

  return { total, rate, bySource };
}

// Export functionality
export async function exportReport(
  data: AggregatedMetrics,
  format: 'pdf' | 'csv' | 'json'
) {
  switch (format) {
    case 'pdf':
      return generatePDFReport(data);
    case 'csv':
      return generateCSVReport(data);
    case 'json':
      return JSON.stringify(data, null, 2);
  }
}

async function generatePDFReport(data: AggregatedMetrics) {
  // PDF generation would require a library like jsPDF or puppeteer
  // This is a placeholder for the actual implementation
  throw new Error('PDF generation not implemented yet');
}

function generateCSVReport(data: AggregatedMetrics) {
  const rows = [
    ['Metric', 'Value', 'Change'],
    ['Total Traffic', data.traffic.current.toString(), `${data.traffic.change.toFixed(1)}%`],
    ['Search Clicks', data.search.clicks.toString(), ''],
    ['Average Position', data.search.position.toFixed(1), ''],
    ['CTR', `${data.search.ctr.toFixed(2)}%`, ''],
    ['Conversions', data.conversions.total.toString(), ''],
    ['Conversion Rate', `${data.conversions.rate.toFixed(2)}%`, ''],
    ['Bounce Rate', `${data.content.bounceRate}%`, ''],
    '',
    ['Top Queries', 'Clicks'],
    ...data.search.topQueries.map(q => [q.query, q.clicks.toString()]),
    '',
    ['Top Pages', 'Views'],
    ...data.content.topPages.map(p => [p.page, p.views.toString()]),
  ];

  return rows.map(row => row.join(',')).join('\n');
}