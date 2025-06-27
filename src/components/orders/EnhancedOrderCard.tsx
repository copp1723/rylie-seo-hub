import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  ExternalLink, 
  Calendar, 
  Clock, 
  CheckCircle,
  FileText,
  Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedOrderCardProps {
  order: {
    id: string;
    title: string;
    pageTitle?: string | null;
    contentUrl?: string | null;
    taskType: string;
    status: string;
    completedAt?: Date | string | null;
    description: string;
    taskCategory?: string | null;
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    estimatedHours?: number;
    actualHours?: number;
  };
  onClick?: () => void;
}

export function EnhancedOrderCard({ order, onClick }: EnhancedOrderCardProps) {
  const isCompleted = order.status === 'completed';
  const hasUrl = order.contentUrl && isCompleted;
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
      case 'review':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  
  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Status and Type */}
          <div className="flex items-start justify-between">
            <div className="flex gap-2">
              <Badge variant={getStatusVariant(order.status)}>
                {order.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(order.priority)}>
                {order.priority} priority
              </Badge>
            </div>
            <Badge variant="outline">
              {order.taskCategory || order.taskType}
            </Badge>
          </div>
          
          {/* Title Section */}
          <div>
            {order.pageTitle ? (
              <h3 className="font-semibold text-lg line-clamp-2">
                {order.pageTitle}
              </h3>
            ) : (
              <h3 className="font-medium text-base text-muted-foreground">
                {order.title}
              </h3>
            )}
          </div>
          
          {/* URL Section */}
          {hasUrl && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={order.contentUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                View Published Content
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Description */}
        {order.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {order.description}
          </p>
        )}
        
        {/* Meta Information */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {order.completedAt && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                Completed {formatDistanceToNow(new Date(order.completedAt), { addSuffix: true })}
              </span>
            </div>
          )}
          {!order.completedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Created {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </span>
            </div>
          )}
          {order.estimatedHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{order.estimatedHours}h estimated</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {hasUrl && (
            <Button
              size="sm"
              variant="default"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={order.contentUrl!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4 mr-1" />
                View Content
              </a>
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}