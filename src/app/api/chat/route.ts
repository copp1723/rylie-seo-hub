import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTaskContext, buildEnhancedSystemPrompt } from '@/lib/ai/taskContextService'
import { getCachedTaskContext } from '@/lib/ai/contextCache'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, model = 'openai/gpt-4o', useContext = true } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build messages array
    const messages = []

    // Add enhanced context if enabled
    if (useContext && session.user.agencyId) {
      try {
        // Use cached context for performance
        const taskContext = await getCachedTaskContext(session.user.agencyId)
        const systemPrompt = buildEnhancedSystemPrompt(taskContext)
        messages.push({ role: 'system', content: systemPrompt })
      } catch (error) {
        console.error('Error loading task context:', error)
        // Fall back to basic prompt
        messages.push({ 
          role: 'system', 
          content: 'You are Rylie, an expert SEO assistant for automotive dealerships. Provide helpful, specific advice for improving search engine rankings and online visibility.' 
        })
      }
    } else {
      // Basic prompt without context
      messages.push({ 
        role: 'system', 
        content: 'You are Rylie, an expert SEO assistant for automotive dealerships. Provide helpful, specific advice for improving search engine rankings and online visibility.' 
      })
    }

    // Add user message
    messages.push({ role: 'user', content: message })

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'Rylie SEO Hub',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!openRouterResponse.ok) {
      const error = await openRouterResponse.json()
      console.error('OpenRouter API error:', error)
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: openRouterResponse.status }
      )
    }

    const data = await openRouterResponse.json()
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'

    // Create conversation record if needed
    // await prisma.message.create({
    //   data: {
    //     content: message,
    //     role: 'user',
    //     agencyId: session.user.agencyId!,
    //     userId: session.user.id,
    //     conversationId: conversationId || createNewConversationId(),
    //   }
    // })

    return NextResponse.json({
      content: aiResponse,
      model: data.model || model,
      usage: data.usage,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve task context info
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.agencyId) {
      return NextResponse.json({ error: 'No agency context' }, { status: 400 })
    }

    const context = await getTaskContext(session.user.agencyId)
    
    // Return simplified context for preview
    return NextResponse.json({
      completedTasks: context.completedTasks.slice(0, 10),
      activeTaskTypes: context.activeTaskTypes,
      packageInfo: context.packageInfo,
      recentKeywords: context.recentKeywords.slice(0, 15),
      dealershipInfo: context.dealershipInfo,
    })
  } catch (error) {
    console.error('Error fetching context:', error)
    return NextResponse.json(
      { error: 'Failed to fetch context' },
      { status: 500 }
    )
  }
}