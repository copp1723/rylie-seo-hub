import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exportReport } from '@/lib/reporting/dataAggregator';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, format } = await req.json();

    if (!['pdf', 'csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use pdf, csv, or json' },
        { status: 400 }
      );
    }

    const exportedData = await exportReport(data, format as 'pdf' | 'csv' | 'json');

    if (!exportedData) {
      return NextResponse.json(
        { error: 'Failed to generate export' },
        { status: 500 }
      );
    }

    // Set appropriate headers based on format
    const headers = new Headers();
    const filename = `seo-report-${new Date().toISOString().split('T')[0]}.${format}`;
    
    switch (format) {
      case 'pdf':
        headers.set('Content-Type', 'application/pdf');
        break;
      case 'csv':
        headers.set('Content-Type', 'text/csv');
        break;
      case 'json':
        headers.set('Content-Type', 'application/json');
        break;
    }
    
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(exportedData, { headers });
  } catch (error) {
    console.error('Export error:', error);
    
    // Handle PDF generation not implemented error
    if (error instanceof Error && error.message.includes('PDF generation not implemented')) {
      return NextResponse.json(
        { error: 'PDF export is not available yet. Please use CSV or JSON format.' },
        { status: 501 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    );
  }
}