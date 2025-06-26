// src/app/api/reports/trigger-scheduled-jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { processSchedule, calculateNextRun } from '@/lib/services/scheduler-service';

export async function POST(request: NextRequest) {
  const reportTriggerSecret = process.env.REPORT_TRIGGER_SECRET;

  if (!reportTriggerSecret) {
    console.error('REPORT_TRIGGER_SECRET is not set.');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!validateApiKey(request, reportTriggerSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implement logic to find and process due schedules
  try {
    const now = new Date();
    const dueSchedules = await prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: now,
        },
      },
    });

    if (dueSchedules.length === 0) {
      return NextResponse.json({ message: 'No due schedules to process.' });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const schedule of dueSchedules) {
      try {
        await processSchedule(schedule); // This will be the actual call to the refactored function

        const nextRun = calculateNextRun(schedule.cronPattern);
        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRun: now,
            nextRun: nextRun,
          },
        });
        processedCount++;
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        errorCount++;
        // Optionally, update the schedule to indicate failure or retry logic
      }
    }

    return NextResponse.json({
      message: 'Scheduled jobs processed.',
      processedCount,
      errorCount,
      totalDue: dueSchedules.length,
    });

  } catch (error) {
    console.error('Error in trigger-scheduled-jobs endpoint:', error);
    return NextResponse.json({ error: 'Failed to process scheduled jobs' }, { status: 500 });
  }
}
