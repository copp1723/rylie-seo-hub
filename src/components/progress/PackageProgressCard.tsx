import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskProgressBar } from './TaskProgressBar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package } from 'lucide-react';
import { SEO_PACKAGES } from '@/lib/seo-packages/definitions';

interface PackageProgressCardProps {
  progress: {
    package: string;
    totalCompleted: number;
    totalTasks: number;
    overallPercentage: number;
    categoryProgress: Array<{
      category: string;
      completed: number;
      total: number;
      percentage: number;
      remaining: number;
    }>;
    activeTasks: number;
  };
}

export function PackageProgressCard({ progress }: PackageProgressCardProps) {
  const packageInfo = SEO_PACKAGES[progress.package as keyof typeof SEO_PACKAGES];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {packageInfo.name} Package Progress
            </CardTitle>
            <CardDescription>
              Track your monthly SEO deliverables
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {progress.totalCompleted} / {progress.totalTasks}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress.overallPercentage)}% Complete
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700"
              style={{ width: `${progress.overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          {progress.categoryProgress.map((category) => (
            <TaskProgressBar
              key={category.category}
              category={category.category}
              completed={category.completed}
              total={category.total}
            />
          ))}
        </div>

        {/* Active Tasks */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Active Tasks</span>
          </div>
          <span className="text-2xl font-bold text-blue-500">
            {progress.activeTasks}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}