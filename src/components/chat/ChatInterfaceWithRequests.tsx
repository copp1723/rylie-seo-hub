'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from 'next-auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { RequestForm, RequestData } from '@/components/requests/RequestForm'
import {
  Send,
  Loader2,
  FileText,
  Globe,
  Search,
  Wrench,
  ShoppingCart,
  Sparkles,
  Target,
  AlertCircle
} from 'lucide-react'

interface ChatInterfaceProps {
  user: User
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'text' | 'request-form' | 'clarifying-question'
  metadata?: any
  model?: string
  tokens?: number
}

interface ConversationContext {
  intent?: 'request' | 'general'
  requestType?: string
  clarificationStage?: number
  requestData?: Partial<RequestData>
}

const suggestionCards = [
  {
    icon: Target,
    title: 'Submit monthly SEO focus request',
    prompt: 'I want to submit my monthly SEO focus areas',
    isRequest: true
  },
  {
    icon: FileText,
    title: 'What does my SEO package include?',
    prompt: 'Can you tell me what deliverables are included in my SEO package each month?'
  },
  {
    icon: Globe,
    title: 'How long for SEO results?',
    prompt: 'How long does it take for SEO efforts to produce noticeable improvements?'
  },
  {
    icon: Search,
    title: 'What are the KPIs for SEO?',
    prompt: 'What Key Performance Indicators do you track for SEO and how do I measure success?'
  },
  {
    icon: Wrench,
    title: 'Traffic is down - should I worry?',
    prompt: 'My organic traffic is down this month. Should I be concerned?'
  },
  {
    icon: ShoppingCart,
    title: 'What content do you create?',
    prompt: 'What kind of SEO content do you build, and what\'s the strategy behind it?'
  }
]

const clarifyingQuestions = [
  {
    stage: 1,
    question: "I'd be happy to help you submit your monthly SEO focus request! To get started, what are your top target areas or cities that you want to rank for this month?",
    field: 'targetCities'
  },
  {
    stage: 2,
    question: "Great! Now, what are your top target model priorities? Which vehicles should we focus on?",
    field: 'targetModels'
  },
  {
    stage: 3,
    question: "Which competitor dealerships would you like to target for organic placement in search results?",
    field: 'competitorDealerships'
  },
  {
    stage: 4,
    question: "Is there anything specific about your market that we should know? Any unique advantages or specializations?",
    field: 'marketSpecifics'
  },
  {
    stage: 5,
    question: "Finally, are there any additional focus areas or special requests for this month's SEO strategy?",
    field: 'additionalFocus'
  }
]

export function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [conversationContext, setConversationContext] = useState<ConversationContext>({})
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selectedModel] = useState('openai/gpt-4-turbo-preview')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])

  const handleRequestSubmit = async (data: RequestData) => {
    setShowRequestForm(false)
    
    // Add user message with the request data
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: 'I have submitted my monthly SEO focus request with the following details:',
      timestamp: new Date(),
      type: 'text',
      metadata: data
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Submit to API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'seo',
          title: 'Monthly SEO Focus Request',
          description: `Target Cities: ${data.targetCities || 'Not specified'}\n` +
                      `Target Models: ${data.targetModels || 'Not specified'}\n` +
                      `Competitor Dealerships: ${data.competitorDealerships || 'Not specified'}\n` +
                      `Market Specifics: ${data.marketSpecifics || 'Not specified'}\n` +
                      `Additional Focus: ${data.additionalFocus || 'Not specified'}`,
          metadata: data
        })
      })

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Thank you for submitting your monthly SEO focus request! I've received your priorities and our team will use this information to guide your content strategy for this month. You can track the progress of your request in the Orders section. Is there anything else I can help you with today?",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error submitting request:', error)
    } finally {
      setIsLoading(false)
      setConversationContext({})
    }
  }

  const processUserIntent = (message: string): boolean => {
    const requestKeywords = ['request', 'monthly', 'focus', 'seo priorities', 'target areas', 'submit']
    const isRequest = requestKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    )
    
    if (isRequest) {
      setConversationContext({
        intent: 'request',
        clarificationStage: 1,
        requestData: {}
      })
      return true
    }
    
    return false
  }

  const handleClarifyingResponse = async (response: string) => {
    const currentStage = conversationContext.clarificationStage || 1
    const currentQuestion = clarifyingQuestions.find(q => q.stage === currentStage)
    
    if (currentQuestion) {
      // Update request data
      const updatedData = {
        ...conversationContext.requestData,
        [currentQuestion.field]: response
      }
      
      // Check if we need more clarifications
      if (currentStage < clarifyingQuestions.length) {
        // Ask next question
        const nextQuestion = clarifyingQuestions.find(q => q.stage === currentStage + 1)
        if (nextQuestion) {
          setConversationContext({
            ...conversationContext,
            clarificationStage: currentStage + 1,
            requestData: updatedData
          })
          
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: nextQuestion.question,
            timestamp: new Date(),
            type: 'clarifying-question'
          }
          
          setMessages(prev => [...prev, assistantMessage])
        }
      } else {
        // All questions answered, submit the request
        await handleRequestSubmit(updatedData as RequestData)
      }
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Check if this is a response to a clarifying question
      if (conversationContext.intent === 'request' && conversationContext.clarificationStage) {
        await handleClarifyingResponse(userMessage.content)
      } else if (processUserIntent(userMessage.content)) {
        // Start the request flow with first clarifying question
        const firstQuestion = clarifyingQuestions[0]
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: firstQuestion.question,
          timestamp: new Date(),
          type: 'clarifying-question'
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Regular chat response - Call the actual API
        const requestData = {
          message: userMessage.content,
          conversationId: conversationId,
          model: selectedModel,
        }
        
        console.log('Sending chat request:', requestData)
        
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Chat API error:', response.status, errorData)
          throw new Error(errorData.error || 'Failed to get AI response')
        }

        const data = await response.json()
        
        const assistantMessage: Message = {
          id: data.assistantMessage?.id || (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.assistantMessage?.content || data.content || 'Sorry, I could not generate a response.',
          timestamp: new Date(data.assistantMessage?.createdAt || Date.now()),
          model: data.assistantMessage?.model || data.model,
          tokens: data.assistantMessage?.tokens || data.tokens
        }
        
        setMessages(prev => [...prev, assistantMessage])
        
        // Update conversation ID if this was a new conversation
        if (!conversationId && data.conversation?.id) {
          setConversationId(data.conversation.id)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message. Please try again.'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (prompt: string, isRequest?: boolean) => {
    if (isRequest) {
      setShowRequestForm(true)
    } else {
      setInput(prompt)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && !showRequestForm ? (
          <div className="max-w-4xl mx-auto">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Hello! I'm Rylie, your SEO assistant.</h2>
              <p className="text-muted-foreground">
                How can I help you improve your dealership's search engine optimization today?
              </p>
            </div>

            {/* Request Banner */}
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Monthly SEO Focus</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Help us align our SEO strategy with your dealership goals by providing your monthly focus areas.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => setShowRequestForm(true)}
                      className="w-full sm:w-auto"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Submit Monthly Request
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestionCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <Card
                    key={index}
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                    onClick={() => handleSuggestionClick(card.prompt, card.isRequest)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">{card.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {card.prompt}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : showRequestForm ? (
          <div className="max-w-4xl mx-auto">
            <RequestForm 
              onSubmit={handleRequestSubmit}
              isLoading={isLoading}
            />
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowRequestForm(false)}
              >
                Back to Chat
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.type === 'clarifying-question' 
                        ? 'bg-blue-50 border border-blue-200 text-blue-900'
                        : 'bg-muted'
                  }`}
                >
                  {message.type === 'clarifying-question' && (
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-semibold">Clarifying Question</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.metadata && (
                    <div className="mt-3 pt-3 border-t border-current/10 text-sm space-y-1">
                      {Object.entries(message.metadata)
                        .filter(([, value]) => value)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-semibold">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {String(value)}
                          </div>
                        ))}
                    </div>
                  )}
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Rylie is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {!showRequestForm && (
        <div className="border-t bg-card">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-end space-x-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  conversationContext.intent === 'request' 
                    ? "Type your response here..." 
                    : "Ask me anything about SEO..."
                }
                className="flex-1 min-h-[56px] max-h-[200px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[56px] w-[56px]"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
