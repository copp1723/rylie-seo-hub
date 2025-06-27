import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculatePackageProgress } from '@/lib/seo-packages/progress';
import { prisma } from '@/lib/prisma';
import { PackageType } from '@/lib/seo-packages/definitions';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's package type from agency or user settings
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { agency: true }
  });

  const packageType = user?.agency?.plan?.toUpperCase() as PackageType || 'GOLD';

  try {
    const progress = await calculatePackageProgress(
      session.user.agencyId,
      packageType
    );
    
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error calculating progress:', error);
    return NextResponse.json(
      { error: 'Failed to calculate progress' },
      { status: 500 }
    );
  }
}