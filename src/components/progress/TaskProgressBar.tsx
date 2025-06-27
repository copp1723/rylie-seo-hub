import { cn } from '@/lib/utils';

interface TaskProgressBarProps {
  category: string;
  completed: number;
  total: number;
  className?: string;
}

export function TaskProgressBar({ 
  category, 
  completed, 
  total, 
  className 
}: TaskProgressBarProps) {
  const percentage = Math.min(100, (completed / total) * 100);
  const isComplete = completed >= total;
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="font-medium capitalize">{category}</span>
        <span className={cn(
          "text-muted-foreground",
          isComplete && "text-green-600 font-medium"
        )}>
          {completed} of {total} {isComplete && "✓"}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out",
            isComplete ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}