import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  period?: string;
  loading?: boolean;
  inverse?: boolean; // For metrics where lower is better
  format?: 'number' | 'currency' | 'percentage' | 'decimal';
}

export function MetricCard({
  title,
  value,
  change,
  period,
  loading,
  inverse = false,
  format = 'number',
}: MetricCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'decimal':
        return val.toFixed(2);
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const isPositive = inverse ? (change || 0) < 0 : (change || 0) > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value)}
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1 text-sm">
            <TrendIcon
              className={cn(
                "h-4 w-4",
                isPositive ? "text-green-600" : "text-red-600"
              )}
            />
            <span
              className={cn(
                "font-medium",
                isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {Math.abs(change).toFixed(1)}%
            </span>
            {period && (
              <span className="text-muted-foreground">{period}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}