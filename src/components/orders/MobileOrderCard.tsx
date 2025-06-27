import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface MobileOrderCardProps {
  order: {
    id: string;
    title: string;
    pageTitle?: string | null;
    contentUrl?: string | null;
    status: string;
    taskCategory?: string | null;
    taskType: string;
  };
  onClick?: () => void;
}

export function MobileOrderCard({ order, onClick }: MobileOrderCardProps) {
  const isCompleted = order.status === 'completed';
  const hasUrl = order.contentUrl && isCompleted;

  return (
    <Card className="p-3 hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="space-y-2">
        {/* Title and Status */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2 flex-1">
            {order.pageTitle || order.title}
          </h4>
          <Badge 
            variant={isCompleted ? 'success' : 'secondary'} 
            className="text-xs whitespace-nowrap"
          >
            {order.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Category */}
        <div className="text-xs text-muted-foreground">
          {order.taskCategory || order.taskType}
        </div>

        {/* Action Button */}
        {hasUrl && (
          <Button
            size="sm"
            variant="link"
            className="p-0 h-auto text-xs"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <a 
              href={order.contentUrl!} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              View Content
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}