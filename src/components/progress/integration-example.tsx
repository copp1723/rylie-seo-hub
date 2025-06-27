// Example of how to integrate package progress components into existing pages
// This file shows integration patterns - not meant to be imported directly

import { PackageProgressCard } from '@/components/progress/PackageProgressCard';
import { ProgressWidget } from '@/components/progress/ProgressWidget';
import { usePackageProgress } from '@/hooks/usePackageProgress';

// Example 1: Full Progress Card in Dashboard
export function DashboardWithProgress() {
  const { progress, loading } = usePackageProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Other dashboard content */}
        
        {/* Package Progress Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Package Progress
          </h2>
          {!loading && progress && (
            <PackageProgressCard progress={progress} />
          )}
        </div>
        
        {/* Rest of dashboard */}
      </div>
    </div>
  );
}

// Example 2: Compact Widget in Sidebar
export function SidebarWithWidget() {
  return (
    <aside className="w-64 bg-white shadow-sm">
      <div className="p-4 space-y-4">
        {/* Other sidebar items */}
        
        {/* Progress Widget */}
        <ProgressWidget />
        
        {/* More sidebar items */}
      </div>
    </aside>
  );
}

// Example 3: Integration with Stats Grid
export function StatsGridWithProgress() {
  const { progress, loading } = usePackageProgress();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Existing stat cards */}
      
      {/* Package Progress Card */}
      {!loading && progress && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Package Usage</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {Math.round(progress.overallPercentage)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {progress.totalCompleted} of {progress.totalTasks} tasks
              </p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Example 4: Custom Progress Display
export function CustomProgressDisplay() {
  const { progress, loading, error } = usePackageProgress();

  if (loading) return <div>Loading progress...</div>;
  if (error) return <div>Error loading progress</div>;
  if (!progress) return null;

  return (
    <div className="space-y-2">
      {progress.categoryProgress.map((category) => (
        <div key={category.category} className="flex justify-between text-sm">
          <span>{category.category}: </span>
          <span className="font-medium">
            {category.completed}/{category.total}
          </span>
        </div>
      ))}
    </div>
  );
}