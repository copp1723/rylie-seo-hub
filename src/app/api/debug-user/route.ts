import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        role: true,
        agencyId: true,
        createdAt: true
      }
    });

    // Also check if tables exist
    const inviteCount = await prisma.userInvite.count().catch(() => -1);

    return NextResponse.json({ 
      session: {
        email: session.user.email,
        name: session.user.name
      },
      user,
      database: {
        inviteTableExists: inviteCount >= 0,
        inviteCount
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}