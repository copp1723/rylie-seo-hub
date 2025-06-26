import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/validation';
import { reportScheduleSchema } from '@/lib/validation';
import { Prisma } from '@prisma/client';
// import { auditLog } from '@/lib/services/audit-service'; // Assuming this service exists and is configured

// Placeholder for auditLog if not available globally
const auditLog = (global as any).auditLog || (async (log: any) => console.log('AUDIT_LOG (API /api/reports/schedules/route.ts):', log));


export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId || !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Missing session or user details' }, { status: 401 });
  }

  const body = await req.json();
  const validationResult = validateRequest(reportScheduleSchema, body);

  if (!validationResult.success) {
    return NextResponse.json({ error: validationResult.error, details: validationResult.details }, { status: 400 });
  }

  const { cronPattern, ga4PropertyId, reportType, emailRecipients, brandingOptions, isActive } = validationResult.data;

  // TODO: Add server-side cron pattern validation using a library like cron-parser
  // For now, we rely on client-side format and assume it's valid or handle errors during processing.

  try {
    const newSchedule = await prisma.reportSchedule.create({
      data: {
        agencyId: session.user.agencyId,
        userId: session.user.id, // Link to the user creating the schedule
        cronPattern,
        ga4PropertyId,
        reportType,
        emailRecipients,
        brandingOptionsJson: brandingOptions ? JSON.stringify(brandingOptions) : undefined, // Use undefined for optional fields not present
        isActive: isActive !== undefined ? isActive : true,
        status: 'active', // Initial status
        // nextRun will be calculated by a scheduler or when the schedule is first processed
      },
    });

    await auditLog({
      event: 'REPORT_SCHEDULE_CREATE_SUCCESS',
      userId: session.user.id,
      agencyId: session.user.agencyId,
      entityType: 'ReportSchedule',
      entityId: newSchedule.id,
      details: { reportType, ga4PropertyId, cronPattern },
    });

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating report schedule:', error);
    let errorMessage = 'Failed to create report schedule';
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Database error creating schedule. Code: ${error.code}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    await auditLog({
      event: 'REPORT_SCHEDULE_CREATE_FAILED',
      userId: session.user.id,
      agencyId: session.user.agencyId,
      entityType: 'ReportSchedule',
      details: { error: String(error), reportType, ga4PropertyId, cronPattern },
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId || !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Missing session or user details' }, { status: 401 });
  }

  // Basic pagination (optional, can be enhanced)
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const skip = (page - 1) * pageSize;

  try {
    const schedules = await prisma.reportSchedule.findMany({
      where: {
        agencyId: session.user.agencyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: pageSize,
      skip: skip,
    });

    const totalSchedules = await prisma.reportSchedule.count({
      where: {
        agencyId: session.user.agencyId,
      },
    });

    // Minimal audit logging for GET requests, focus on failures or sensitive data access.
    // For successful reads, often not logged unless specific compliance requires it.
    // await auditLog({
    //   event: 'REPORT_SCHEDULE_LIST_SUCCESS',
    //   userId: session.user.id,
    //   agencyId: session.user.agencyId,
    //   entityType: 'ReportSchedule',
    //   details: { page, pageSize, count: schedules.length },
    // });

    return NextResponse.json({
      data: schedules,
      pagination: {
        page,
        pageSize,
        totalItems: totalSchedules,
        totalPages: Math.ceil(totalSchedules / pageSize),
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching report schedules:', error);
    await auditLog({
      event: 'REPORT_SCHEDULE_LIST_FAILED',
      userId: session.user.id,
      agencyId: session.user.agencyId,
      entityType: 'ReportSchedule',
      details: { error: String(error) },
    });
    return NextResponse.json({ error: 'Failed to fetch report schedules' }, { status: 500 });
  }
}
