import { Package, PackageTask, PackageProgress, packages, packageTasks } from './definitions';

export function calculatePackageProgress(
  packageId: string,
  completedTasks: PackageTask[]
): PackageProgress | null {
  const packageDef = packages.find(p => p.id === packageId);
  if (!packageDef) {
    return null;
  }

  const packageTaskTemplates = packageTasks[packageId] || [];
  const allTasks: PackageTask[] = packageTaskTemplates.map((template, index) => ({
    id: `${packageId}-task-${index + 1}`,
    ...template,
    isCompleted: false,
    completedAt: undefined,
    completedBy: undefined
  }));

  // Merge with completed tasks data
  const mergedTasks = allTasks.map(task => {
    const completedTask = completedTasks.find(ct => ct.id === task.id);
    if (completedTask) {
      return {
        ...task,
        isCompleted: completedTask.isCompleted,
        completedAt: completedTask.completedAt,
        completedBy: completedTask.completedBy
      };
    }
    return task;
  });

  const completedCount = mergedTasks.filter(task => task.isCompleted).length;
  const totalCount = packageDef.totalTasks;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    packageId: packageDef.id,
    packageName: packageDef.name,
    totalTasks: totalCount,
    completedTasks: completedCount,
    progressPercentage,
    remainingTasks: totalCount - completedCount,
    tasks: mergedTasks
  };
}

export function calculateAllPackagesProgress(
  completedTasksByPackage: Record<string, PackageTask[]>
): PackageProgress[] {
  return packages.map(pkg => {
    const completedTasks = completedTasksByPackage[pkg.id] || [];
    return calculatePackageProgress(pkg.id, completedTasks);
  }).filter((progress): progress is PackageProgress => progress !== null);
}

export function getPackageById(packageId: string): Package | undefined {
  return packages.find(p => p.id === packageId);
}

export function getTasksForPackage(packageId: string): PackageTask[] {
  const packageTaskTemplates = packageTasks[packageId] || [];
  return packageTaskTemplates.map((template, index) => ({
    id: `${packageId}-task-${index + 1}`,
    ...template,
    isCompleted: false
  }));
}

export function markTaskAsComplete(
  task: PackageTask,
  completedBy: string
): PackageTask {
  return {
    ...task,
    isCompleted: true,
    completedAt: new Date(),
    completedBy
  };
}

export function calculateTimeToCompletion(
  progress: PackageProgress,
  averageTasksPerDay: number = 2
): {
  estimatedDays: number;
  estimatedCompletionDate: Date;
} {
  const remainingTasks = progress.remainingTasks;
  const estimatedDays = Math.ceil(remainingTasks / averageTasksPerDay);
  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDays);

  return {
    estimatedDays,
    estimatedCompletionDate
  };
}

export function getProgressStatus(progressPercentage: number): {
  status: 'not-started' | 'in-progress' | 'almost-complete' | 'complete';
  color: string;
  description: string;
} {
  if (progressPercentage === 0) {
    return {
      status: 'not-started',
      color: 'gray',
      description: 'Not started'
    };
  } else if (progressPercentage < 50) {
    return {
      status: 'in-progress',
      color: 'blue',
      description: 'In progress'
    };
  } else if (progressPercentage < 100) {
    return {
      status: 'almost-complete',
      color: 'yellow',
      description: 'Almost complete'
    };
  } else {
    return {
      status: 'complete',
      color: 'green',
      description: 'Complete'
    };
  }
}

export function getNextUncompletedTask(tasks: PackageTask[]): PackageTask | undefined {
  return tasks.find(task => !task.isCompleted);
}

export function getRecentlyCompletedTasks(
  tasks: PackageTask[],
  limit: number = 5
): PackageTask[] {
  return tasks
    .filter(task => task.isCompleted && task.completedAt)
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}