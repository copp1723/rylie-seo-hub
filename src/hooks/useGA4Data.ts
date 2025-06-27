'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface GA4DataOptions {
  metrics: string[];
  dimensions: string[];
  dateRange: string;
  propertyId?: string;
}

export function useGA4Data(options: GA4DataOptions) {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          metrics: options.metrics.join(','),
          dimensions: options.dimensions.join(','),
          dateRange: options.dateRange,
        });

        if (options.propertyId) {
          params.append('propertyId', options.propertyId);
        }

        const response = await fetch(`/api/analytics/ga4?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch GA4 data');
        }

        const result = await response.json();
        
        // Process and format the data
        const formattedData = processGA4Data(result, options);
        setData(formattedData);
      } catch (err) {
        console.error('GA4 data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, options.metrics.join(','), options.dimensions.join(','), options.dateRange, options.propertyId]);

  return { data, loading, error };
}

function processGA4Data(rawData: any, options: GA4DataOptions) {
  if (!rawData?.rows) {
    return {
      totalSessions: 0,
      totalUsers: 0,
      totalConversions: 0,
      sessionChange: 0,
      userChange: 0,
      conversionChange: 0,
      trafficTrend: [],
      topPage: null,
      bounceRate: 0,
    };
  }

  // Calculate totals and changes
  const rows = rawData.rows;
  const halfIndex = Math.floor(rows.length / 2);
  
  const currentPeriod = rows.slice(halfIndex);
  const previousPeriod = rows.slice(0, halfIndex);
  
  // Calculate metrics based on the requested data
  const processedData: any = {};
  
  if (options.metrics.includes('sessions')) {
    const currentSessions = sumMetric(currentPeriod, 0);
    const previousSessions = sumMetric(previousPeriod, 0);
    processedData.totalSessions = currentSessions;
    processedData.sessionChange = calculateChange(currentSessions, previousSessions);
  }
  
  if (options.metrics.includes('users')) {
    const currentUsers = sumMetric(currentPeriod, 1);
    const previousUsers = sumMetric(previousPeriod, 1);
    processedData.totalUsers = currentUsers;
    processedData.userChange = calculateChange(currentUsers, previousUsers);
  }
  
  if (options.metrics.includes('conversions')) {
    const currentConversions = sumMetric(currentPeriod, 2);
    const previousConversions = sumMetric(previousPeriod, 2);
    processedData.totalConversions = currentConversions;
    processedData.conversionChange = calculateChange(currentConversions, previousConversions);
  }
  
  // Create trend data
  if (options.dimensions.includes('date')) {
    processedData.trafficTrend = rows.map((row: any) => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0]?.value || 0),
      users: parseInt(row.metricValues[1]?.value || 0),
    }));
  }
  
  // Process channel data if requested
  if (options.dimensions.includes('sessionDefaultChannelGroup')) {
    processedData.byChannel = aggregateByDimension(rows, 0, 0);
  }
  
  return processedData;
}

function sumMetric(rows: any[], metricIndex: number): number {
  return rows.reduce((sum, row) => 
    sum + parseInt(row.metricValues[metricIndex]?.value || 0), 0
  );
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function aggregateByDimension(rows: any[], dimensionIndex: number, metricIndex: number) {
  const grouped = rows.reduce((acc: any, row: any) => {
    const dimension = row.dimensionValues[dimensionIndex].value;
    const value = parseInt(row.metricValues[metricIndex].value || 0);
    
    if (!acc[dimension]) {
      acc[dimension] = 0;
    }
    acc[dimension] += value;
    
    return acc;
  }, {});
  
  return Object.entries(grouped)
    .map(([key, value]) => ({ name: key, value }))
    .sort((a: any, b: any) => b.value - a.value);
}