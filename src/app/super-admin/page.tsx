import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SuperAdminDashboard } from '@/components/super-admin/SuperAdminDashboard'

export default async function SuperAdminPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/')
  }
  
  // Check if user is super admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  })
  
  if (!user?.isSuperAdmin) {
    redirect('/')
  }
  
  // Get all agencies and users for super admin view
  const [agencies, users, totalConversations] = await Promise.all([
    prisma.agency.findMany({
      include: {
        _count: {
          select: {
            users: true,
            conversations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      include: {
        agency: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.conversation.count(),
  ])
  
  return <SuperAdminDashboard agencies={agencies} users={users} totalConversations={totalConversations} />
}