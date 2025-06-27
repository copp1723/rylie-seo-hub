'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendChartProps {
  title: string;
  data: any[];
  dataKey: string;
  secondaryDataKey?: string;
  loading?: boolean;
  height?: number;
}

export function TrendChart({
  title,
  data,
  dataKey,
  secondaryDataKey,
  loading,
  height = 300,
}: TrendChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  // Simple text-based representation
  const hasData = data && data.length > 0;
  const latestValue = hasData ? data[data.length - 1]?.[dataKey] : 0;
  const firstValue = hasData ? data[0]?.[dataKey] : 0;
  const change = firstValue > 0 ? ((latestValue - firstValue) / firstValue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="flex flex-col justify-center items-center">
          {hasData ? (
            <div className="text-center">
              <p className="text-3xl font-bold">{latestValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Latest {dataKey}
              </p>
              <p className={`text-sm mt-2 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}% from start
              </p>
              {secondaryDataKey && data[data.length - 1]?.[secondaryDataKey] && (
                <p className="text-sm text-muted-foreground mt-4">
                  {secondaryDataKey}: {data[data.length - 1][secondaryDataKey].toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}