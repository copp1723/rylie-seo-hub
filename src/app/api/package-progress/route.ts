import { NextRequest, NextResponse } from 'next/server';
import { 
  calculatePackageProgress, 
  calculateAllPackagesProgress,
  getPackageById,
  getTasksForPackage
} from '@/lib/progress';
import { PackageTask } from '@/lib/definitions';

// Mock data for completed tasks - in a real implementation, this would come from a database
// This is temporary until database integration is implemented
const mockCompletedTasks: Record<string, PackageTask[]> = {
  basic: [
    {
      id: 'basic-task-1',
      packageId: 'basic',
      name: 'Initial Website Audit',
      description: 'Comprehensive analysis of current website SEO status',
      isCompleted: true,
      completedAt: new Date('2024-06-20'),
      completedBy: 'john.doe@example.com'
    },
    {
      id: 'basic-task-2',
      packageId: 'basic',
      name: 'Keyword Research',
      description: 'Research and identify up to 10 target keywords',
      isCompleted: true,
      completedAt: new Date('2024-06-22'),
      completedBy: 'john.doe@example.com'
    },
    {
      id: 'basic-task-3',
      packageId: 'basic',
      name: 'Title Tag Optimization',
      description: 'Optimize title tags for all main pages',
      isCompleted: true,
      completedAt: new Date('2024-06-24'),
      completedBy: 'jane.smith@example.com'
    }
  ],
  standard: [
    {
      id: 'standard-task-1',
      packageId: 'standard',
      name: 'Comprehensive Site Audit',
      description: 'In-depth technical and content audit',
      isCompleted: true,
      completedAt: new Date('2024-06-18'),
      completedBy: 'jane.smith@example.com'
    }
  ],
  premium: []
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');

    if (packageId) {
      // Get progress for a specific package
      const packageDef = getPackageById(packageId);
      if (!packageDef) {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        );
      }

      const completedTasks = mockCompletedTasks[packageId] || [];
      const progress = calculatePackageProgress(packageId, completedTasks);

      if (!progress) {
        return NextResponse.json(
          { error: 'Failed to calculate progress' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: progress
      });
    } else {
      // Get progress for all packages
      const allProgress = calculateAllPackagesProgress(mockCompletedTasks);
      
      return NextResponse.json({
        success: true,
        data: allProgress
      });
    }
  } catch (error) {
    console.error('Error in package-progress API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageId, taskId, action } = body;

    if (!packageId || !taskId || !action) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: packageId, taskId, and action' 
        },
        { status: 400 }
      );
    }

    // Validate package exists
    const packageDef = getPackageById(packageId);
    if (!packageDef) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Package not found' 
        },
        { status: 404 }
      );
    }

    // In a real implementation, this would update the database
    // For now, we'll just return a success response
    if (action === 'complete') {
      // Mock marking task as complete
      return NextResponse.json({
        success: true,
        message: `Task ${taskId} marked as complete`,
        data: {
          taskId,
          packageId,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          completedBy: 'current-user@example.com' // This would come from auth
        }
      });
    } else if (action === 'uncomplete') {
      // Mock marking task as incomplete
      return NextResponse.json({
        success: true,
        message: `Task ${taskId} marked as incomplete`,
        data: {
          taskId,
          packageId,
          isCompleted: false,
          completedAt: null,
          completedBy: null
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid action. Use "complete" or "uncomplete"' 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in package-progress POST:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper endpoint to get all tasks for a package
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');

    if (!packageId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'packageId query parameter is required' 
        },
        { status: 400 }
      );
    }

    const packageDef = getPackageById(packageId);
    if (!packageDef) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Package not found' 
        },
        { status: 404 }
      );
    }

    const tasks = getTasksForPackage(packageId);
    
    return NextResponse.json({
      success: true,
      data: {
        packageId,
        packageName: packageDef.name,
        tasks
      }
    });
  } catch (error) {
    console.error('Error in package-progress PUT:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}