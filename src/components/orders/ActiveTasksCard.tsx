import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { SEO_PACKAGES, PackageType } from '@/lib/seo-packages/definitions';

interface ActiveTasksCardProps {
  packageType: PackageType;
  completedTasks: number;
  className?: string;
}

export function ActiveTasksCard({ packageType, completedTasks, className = '' }: ActiveTasksCardProps) {
  const packageInfo = SEO_PACKAGES[packageType];
  const activeTasks = packageInfo.totalTasks - completedTasks;
  const percentageUsed = (completedTasks / packageInfo.totalTasks) * 100;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Active Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-blue-600">{activeTasks}</p>
            <p className="text-sm text-muted-foreground">
              Remaining in your {packageInfo.name} package
            </p>
          </div>
          
          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Package Usage</span>
              <span className="font-medium">{Math.round(percentageUsed)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${percentageUsed}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedTasks} of {packageInfo.totalTasks} tasks completed
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}