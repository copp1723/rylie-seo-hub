import prisma from '@/lib/prisma'

export interface TaskContext {
  completedTasks: Array<{
    title: string
    type: string
    url?: string
    completedAt: Date
    keywords?: string[]
  }>
  activeTaskTypes: string[]
  packageInfo: {
    type: string
    progress: number
    remainingTasks: number
  }
  recentKeywords: string[]
  dealershipInfo?: {
    businessName: string
    location: string
    mainBrand: string
    targetCities: string[]
    targetModels: string[]
  }
}

export async function getTaskContext(agencyId: string): Promise<TaskContext> {
  // Get completed tasks (last 30)
  const completedTasks = await prisma.order.findMany({
    where: {
      agencyId,
      status: 'completed',
      pageTitle: { not: null },
    },
    select: {
      pageTitle: true,
      taskType: true,
      contentUrl: true,
      completedAt: true,
      keywords: true,
      taskCategory: true,
    },
    orderBy: { completedAt: 'desc' },
    take: 30,
  })

  // Get active task types
  const activeTasks = await prisma.order.findMany({
    where: {
      agencyId,
      status: { in: ['pending', 'in_progress', 'review'] },
    },
    select: { taskType: true },
    distinct: ['taskType'],
  })

  // Get agency info
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { plan: true },
  })

  // Get dealership info
  const dealership = await prisma.dealershipOnboarding.findFirst({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    select: {
      businessName: true,
      city: true,
      state: true,
      mainBrand: true,
      targetCities: true,
      targetVehicleModels: true,
    },
  })

  // Extract keywords from recent tasks
  const recentKeywords = completedTasks
    .filter(task => task.keywords)
    .flatMap(task => {
      if (Array.isArray(task.keywords)) {
        return task.keywords as string[]
      }
      try {
        return JSON.parse(task.keywords as string || '[]')
      } catch {
        return []
      }
    })
    .slice(0, 20)

  // Calculate package progress (simplified for now)
  const totalCompleted = await prisma.order.count({
    where: {
      agencyId,
      status: 'completed',
    },
  })

  const packageLimits: Record<string, number> = {
    SILVER: 50,
    GOLD: 100,
    PLATINUM: 200,
  }

  const packageType = agency?.plan || 'GOLD'
  const limit = packageLimits[packageType] || 100
  const progress = Math.min(100, (totalCompleted / limit) * 100)

  return {
    completedTasks: completedTasks.map(task => ({
      title: task.pageTitle!,
      type: task.taskType,
      url: task.contentUrl || undefined,
      completedAt: task.completedAt!,
      keywords: Array.isArray(task.keywords) 
        ? task.keywords as string[]
        : undefined,
    })),
    activeTaskTypes: activeTasks.map(t => t.taskType),
    packageInfo: {
      type: packageType,
      progress: Math.round(progress),
      remainingTasks: Math.max(0, limit - totalCompleted),
    },
    recentKeywords: [...new Set(recentKeywords)], // Remove duplicates
    dealershipInfo: dealership ? {
      businessName: dealership.businessName,
      location: `${dealership.city}, ${dealership.state}`,
      mainBrand: dealership.mainBrand,
      targetCities: Array.isArray(dealership.targetCities) 
        ? dealership.targetCities as string[]
        : [],
      targetModels: Array.isArray(dealership.targetVehicleModels)
        ? dealership.targetVehicleModels as string[]
        : [],
    } : undefined,
  }
}

// Format context for AI prompt
export function formatTaskContextForAI(context: TaskContext): string {
  const sections = []

  // Recent content section
  if (context.completedTasks.length > 0) {
    sections.push(
      'Recently Completed Content:',
      context.completedTasks
        .slice(0, 10)
        .map(task => `- ${task.title} (${task.type})${task.url ? ' - Published' : ''}`)
        .join('\n')
    )
  }

  // Active work section
  if (context.activeTaskTypes.length > 0) {
    sections.push(
      '\nCurrently Working On:',
      context.activeTaskTypes.map(type => `- ${type} content`).join('\n')
    )
  }

  // Keywords section
  if (context.recentKeywords.length > 0) {
    sections.push(
      '\nRecent Target Keywords:',
      context.recentKeywords.slice(0, 10).join(', ')
    )
  }

  // Package info
  sections.push(
    '\nPackage Status:',
    `- ${context.packageInfo.type} Package`,
    `- Progress: ${context.packageInfo.progress}% complete`,
    `- Remaining tasks: ${context.packageInfo.remainingTasks}`
  )

  return sections.join('\n')
}

// Build enhanced system prompt for AI
export function buildEnhancedSystemPrompt(
  taskContext: TaskContext,
  basePrompt?: string
): string {
  const contextInfo = formatTaskContextForAI(taskContext)
  const dealership = taskContext.dealershipInfo
  
  const enhancedPrompt = `You are Rylie, an expert SEO assistant for automotive dealerships.

${dealership ? `DEALERSHIP CONTEXT:
- Business: ${dealership.businessName}
- Location: ${dealership.location}
- Main Brand: ${dealership.mainBrand}
- Package: ${taskContext.packageInfo.type}
${dealership.targetCities.length > 0 ? `- Target Cities: ${dealership.targetCities.join(', ')}` : ''}
${dealership.targetModels.length > 0 ? `- Target Models: ${dealership.targetModels.join(', ')}` : ''}

` : ''}YOUR KNOWLEDGE OF THEIR SEO WORK:
${contextInfo}

INSTRUCTIONS:
1. Reference completed content when relevant (e.g., "I see you already have a great page about the Camry")
2. Avoid suggesting content that's already been created
3. Consider their package limits when making recommendations (${taskContext.packageInfo.remainingTasks} tasks remaining)
4. Use their target cities and models in examples when applicable
5. Be specific to their dealership and location
6. If they ask about existing content, you can reference what you know

Remember: You have access to their actual SEO work history, so provide informed, contextual advice.

${basePrompt || ''}`

  return enhancedPrompt
}