import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateRequest, idParamSchema, updateReportScheduleSchema } from '@/lib/validation';
import { Prisma } from '@prisma/client';

// Placeholder for auditLog if not available globally
const auditLog = (global as any).auditLog || (async (log: any) => console.log('AUDIT_LOG (API /api/reports/schedules/[id]/route.ts):', log));

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId || !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const validatedId = idParamSchema.safeParse(params);
  if (!validatedId.success) {
    return NextResponse.json({ error: 'Invalid schedule ID format', details: validatedId.error }, { status: 400 });
  }
  const scheduleId = validatedId.data.id;

  try {
    const schedule = await prisma.reportSchedule.findUnique({
      where: {
        id: scheduleId,
        agencyId: session.user.agencyId, // Tenant isolation
      },
    });

    if (!schedule) {
      await auditLog({
        event: 'REPORT_SCHEDULE_READ_NOT_FOUND',
        userId: session.user.id,
        agencyId: session.user.agencyId,
        entityType: 'ReportSchedule',
        entityId: scheduleId,
        details: { message: 'Schedule not found or access denied' },
      });
      return NextResponse.json({ error: 'Report schedule not found' }, { status: 404 });
    }

    // Optional: Audit successful read access if required
    // await auditLog({
    //   event: 'REPORT_SCHEDULE_READ_SUCCESS',
    //   userId: session.user.id,
    //   agencyId: session.user.agencyId,
    //   entityType: 'ReportSchedule',
    //   entityId: schedule.id,
    // });

    return NextResponse.json(schedule, { status: 200 });
  } catch (error) {
    console.error(`Error fetching report schedule ${scheduleId}:`, error);
    await auditLog({
        event: 'REPORT_SCHEDULE_READ_FAILED',
        userId: session.user.id,
        agencyId: session.user.agencyId,
        entityType: 'ReportSchedule',
        entityId: scheduleId,
        details: { error: String(error) },
      });
    return NextResponse.json({ error: 'Failed to fetch report schedule' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId || !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const validatedId = idParamSchema.safeParse(params);
  if (!validatedId.success) {
    return NextResponse.json({ error: 'Invalid schedule ID format', details: validatedId.error }, { status: 400 });
  }
  const scheduleId = validatedId.data.id;

  const body = await req.json();
  const validationResult = validateRequest(updateReportScheduleSchema, body);

  if (!validationResult.success) {
    return NextResponse.json({ error: validationResult.error, details: validationResult.details }, { status: 400 });
  }

  const { cronPattern, ga4PropertyId, reportType, emailRecipients, brandingOptions, isActive } = validationResult.data;

  // TODO: Add cron pattern validation if cronPattern is being updated

  try {
    // First, verify the schedule exists and belongs to the agency
    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: {
        id: scheduleId,
        agencyId: session.user.agencyId,
      },
    });

    if (!existingSchedule) {
      await auditLog({
        event: 'REPORT_SCHEDULE_UPDATE_NOT_FOUND',
        userId: session.user.id,
        agencyId: session.user.agencyId,
        entityType: 'ReportSchedule',
        entityId: scheduleId,
        details: { message: 'Schedule not found or access denied for update' },
      });
      return NextResponse.json({ error: 'Report schedule not found' }, { status: 404 });
    }

    const dataToUpdate: Prisma.ReportScheduleUpdateInput = {};
    if (cronPattern !== undefined) dataToUpdate.cronPattern = cronPattern;
    if (ga4PropertyId !== undefined) dataToUpdate.ga4PropertyId = ga4PropertyId;
    if (reportType !== undefined) dataToUpdate.reportType = reportType;
    if (emailRecipients !== undefined) dataToUpdate.emailRecipients = emailRecipients;
    if (brandingOptions !== undefined) dataToUpdate.brandingOptionsJson = brandingOptions === null ? null : JSON.stringify(brandingOptions);
    if (isActive !== undefined) {
      dataToUpdate.isActive = isActive;
      dataToUpdate.status = isActive ? 'active' : 'paused';
    }


    const updatedSchedule = await prisma.reportSchedule.update({
      where: {
        id: scheduleId,
      },
      data: dataToUpdate,
    });

    await auditLog({
      event: 'REPORT_SCHEDULE_UPDATE_SUCCESS',
      userId: session.user.id,
      agencyId: session.user.agencyId,
      entityType: 'ReportSchedule',
      entityId: updatedSchedule.id,
      details: { updatedFields: Object.keys(validationResult.data) },
    });

    return NextResponse.json(updatedSchedule, { status: 200 });
  } catch (error) {
    console.error(`Error updating report schedule ${scheduleId}:`, error);
    let errorMessage = 'Failed to update report schedule';
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record not found for update
        errorMessage = 'Report schedule not found for update.';
         await auditLog({
            event: 'REPORT_SCHEDULE_UPDATE_FAILED',
            userId: session.user.id,
            agencyId: session.user.agencyId,
            entityType: 'ReportSchedule',
            entityId: scheduleId,
            details: { error: 'P2025: Record to update not found.', requestedData: validationResult.data },
        });
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
      errorMessage = `Database error updating schedule. Code: ${error.code}`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    await auditLog({
      event: 'REPORT_SCHEDULE_UPDATE_FAILED',
      userId: session.user.id,
      agencyId: session.user.agencyId,
      entityType: 'ReportSchedule',
      entityId: scheduleId,
      details: { error: String(error), requestedData: validationResult.data },
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId || !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const validatedId = idParamSchema.safeParse(params);
  if (!validatedId.success) {
    return NextResponse.json({ error: 'Invalid schedule ID format', details: validatedId.error }, { status: 400 });
  }
  const scheduleId = validatedId.data.id;

  try {
    // Verify the schedule exists and belongs to the agency before deleting
    const scheduleToDelete = await prisma.reportSchedule.findFirst({
        where: {
            id: scheduleId,
            agencyId: session.user.agencyId,
        }
    });

    if (!scheduleToDelete) {
        await auditLog({
            event: 'REPORT_SCHEDULE_DELETE_NOT_FOUND',
            userId: session.user.id,
            agencyId: session.user.agencyId,
            entityType: 'ReportSchedule',
            entityId: scheduleId,
            details: { message: 'Schedule not found or access denied for deletion' },
        });
        return NextResponse.json({ error: 'Report schedule not found' }, { status: 404 });
    }

    await prisma.reportSchedule.delete({
      where: {
        id: scheduleId,
      },
    });

    await auditLog({
      event: 'REPORT_SCHEDULE_DELETE_SUCCESS',
      userId: session.user.id,
      agencyId: session.user.agencyId,
      entityType: 'ReportSchedule',
      entityId: scheduleId,
      details: { ga4PropertyId: scheduleToDelete.ga4PropertyId, reportType: scheduleToDelete.reportType },
    });

    return NextResponse.json({ message: 'Report schedule deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting report schedule ${scheduleId}:`, error);
    let errorMessage = 'Failed to delete report schedule';
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record to delete not found
         errorMessage = 'Report schedule not found for deletion.';
         await auditLog({
            event: 'REPORT_SCHEDULE_DELETE_FAILED',
            userId: session.user.id,
            agencyId: session.user.agencyId,
            entityType: 'ReportSchedule',
            entityId: scheduleId,
            details: { error: 'P2025: Record to delete not found.' },
        });
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
       errorMessage = `Database error deleting schedule. Code: ${error.code}`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    await auditLog({
      event: 'REPORT_SCHEDULE_DELETE_FAILED',
      userId: session.user.id,
      agencyId: session.user.agencyId,
      entityType: 'ReportSchedule',
      entityId: scheduleId,
      details: { error: String(error) },
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PATCH can be an alias for PUT if full updates are typical,
// or implement more granular partial updates if needed.
export async function PATCH(req: NextRequest, context: RouteContext) {
  return PUT(req, context);
}
