import { usePackageProgress } from '@/hooks/usePackageProgress';
import { Skeleton } from '@/components/ui/skeleton';

export function ProgressWidget() {
  const { progress, loading, error } = usePackageProgress();

  if (loading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (error || !progress) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Monthly Progress</span>
        <span className="text-xs text-muted-foreground">
          {progress.package} Package
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">{progress.totalCompleted}</p>
          <p className="text-xs text-muted-foreground">of {progress.totalTasks} tasks</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-primary">
            {Math.round(progress.overallPercentage)}%
          </p>
          <p className="text-xs text-muted-foreground">Complete</p>
        </div>
      </div>
    </div>
  );
}