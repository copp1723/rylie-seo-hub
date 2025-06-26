import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/route-handler';
import { processSchedule } from '@/lib/services/scheduler-service';
import { auditLog } from '@/lib/audit';

export const POST = withAuth(
  async (request: NextRequest, { user, tenant, params }: { user: any; tenant: any; params: { id: string } }) => {
    const scheduleId = params.id;
    const userId = user.id;
    const userRole = user.role;
    const isSuperAdmin = user.isSuperAdmin;

    if (userRole !== 'admin' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Report schedule not found' }, { status: 404 });
    }

    if (!isSuperAdmin && schedule.agencyId !== user.agencyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      await auditLog({
        userId,
        action: 'report_schedule_retry_manual',
        entityId: scheduleId,
        entityType: 'reportSchedule',
        details: { message: `Manual retry triggered for schedule ${scheduleId}` },
      });
      
      // Reset status before processing
      await prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: {
          status: 'queued',
          errorMessage: null,
        },
      });

      // Asynchronously process the schedule without waiting for it to complete
      processSchedule(schedule).catch(async (error) => {
        console.error(`Manual retry failed for schedule ${scheduleId}:`, error);
        await auditLog({
            userId,
            action: 'report_schedule_process_failed_manual',
            entityId: scheduleId,
            entityType: 'reportSchedule',
            details: { error: error instanceof Error ? error.message : String(error) },
        });
      });

      return NextResponse.json({
        message: 'Report schedule retry has been queued successfully.',
      });
    } catch (error) {
      console.error('Error triggering manual retry:', error);
      return NextResponse.json({ error: 'Failed to trigger retry' }, { status: 500 });
    }
  }
);
