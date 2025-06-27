import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aggregateReportingData } from '@/lib/reporting/dataAggregator';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!session.user.agencyId) {
    return NextResponse.json(
      { error: 'No agency associated with user' },
      { status: 400 }
    );
  }

  try {
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    const aggregatedData = await aggregateReportingData(
      session.user.agencyId,
      dateRange
    );

    return NextResponse.json(aggregatedData);
  } catch (error) {
    console.error('Aggregation error:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate reporting data' },
      { status: 500 }
    );
  }
}