import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefinitiveAnswerProps {
  question: string;
  answer: string;
  details?: string;
  trend?: 'up' | 'down' | 'stable';
  confidence?: 'high' | 'medium' | 'low';
  link?: string;
  actionable?: boolean;
}

export function DefinitiveAnswer({
  question,
  answer,
  details,
  trend,
  confidence,
  link,
  actionable,
}: DefinitiveAnswerProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : 
                   trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className={cn(
      "p-4",
      actionable && "border-primary/50 bg-primary/5"
    )}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {question}
        </p>
        
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-lg font-semibold">
              {answer}
            </p>
            {details && (
              <p className="text-sm text-muted-foreground mt-1">
                {details}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {trend && (
              <TrendIcon className={cn(
                "h-5 w-5",
                trend === 'up' && "text-green-500",
                trend === 'down' && "text-red-500",
                trend === 'stable' && "text-gray-500"
              )} />
            )}
            
            {confidence && (
              <Badge variant="outline" className="text-xs">
                {confidence}
              </Badge>
            )}
            
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}