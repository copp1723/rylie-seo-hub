'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from 'next-auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Send,
  Loader2,
  FileText,
  Globe,
  Search,
  Wrench,
  ShoppingCart,
  Sparkles,
  Users,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { EscalationModal } from './EscalationModal'
import { AIContextPreview } from './AIContextPreview'

interface ChatInterfaceProps {
  user: User
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const suggestionCards = [
  {
    icon: FileText,
    title: 'Create a blog post about local SEO',
    prompt:
      'Help me create an SEO-optimized blog post about improving local search rankings for car dealerships',
  },
  {
    icon: Globe,
    title: "Audit my website's technical SEO",
    prompt: 'Can you help me audit my dealership website for technical SEO issues?',
  },
  {
    icon: Search,
    title: 'Help me with keyword research',
    prompt: 'I need help finding the best keywords for my automotive dealership in [city]',
  },
  {
    icon: Wrench,
    title: 'Website maintenance checklist',
    prompt: 'What website maintenance tasks should I prioritize for better SEO?',
  },
  {
    icon: ShoppingCart,
    title: 'Optimize my Google Business Profile',
    prompt: 'How can I optimize my Google Business Profile for my car dealership?',
  },
  {
    icon: Sparkles,
    title: 'SEO strategy for new car models',
    prompt: 'Create an SEO strategy for promoting our new 2025 vehicle inventory',
  },
]

export function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showEscalationModal, setShowEscalationModal] = useState(false)
  const [escalationMessage, setEscalationMessage] = useState<Message | null>(null)
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      console.log('Sending chat request:', {
        message: userMessage.content,
        model: 'openai/gpt-4o',
      })
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          model: 'openai/gpt-4o',
          useContext: true, // Enable context-aware responses
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Chat API error:', response.status, errorData)
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const openEscalationModal = (message: Message) => {
    // Find the previous user message
    const messageIndex = messages.findIndex(m => m.id === message.id)
    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find(m => m.role === 'user')
    
    if (previousUserMessage) {
      setEscalationMessage({
        ...previousUserMessage,
        content: previousUserMessage.content,
      })
      setShowEscalationModal(true)
    }
  }

  const handleEscalation = async (data: any) => {
    try {
      const response = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: escalationMessage?.content,
          aiResponse: messages.find(m => m.role === 'assistant')?.content,
          priority: data.priority,
          additionalContext: data.additionalContext,
          contactPreference: data.contactPreference,
        }),
      })

      if (!response.ok) throw new Error('Failed to create escalation')

      const result = await response.json()
      
      // Add a system message to chat
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ ${result.message}. Our team will respond within 2-4 hours during business hours.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, systemMessage])
    } catch (error) {
      console.error('Escalation error:', error)
    }
  }

  const handleThumbsUp = (message: Message) => {
    console.log('Thumbs up for message:', message.id)
    // TODO: Implement feedback tracking
  }

  const handleThumbsDown = (message: Message) => {
    console.log('Thumbs down for message:', message.id)
    // Could automatically suggest escalation
    openEscalationModal(message)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Hello! I'm your SEO assistant.</h2>
              <p className="text-muted-foreground">
                How can I help you improve your website's search engine optimization today?
              </p>
              <div className="mt-2">
                <AIContextPreview />
              </div>
            </div>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestionCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <Card
                    key={index}
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                    onClick={() => handleSuggestionClick(card.prompt)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">{card.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{card.prompt}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                  {message.role === 'assistant' && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleThumbsUp(message)}
                        className="text-xs px-2 py-1 rounded hover:bg-black/5 transition-colors flex items-center gap-1"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Helpful
                      </button>
                      <button
                        onClick={() => handleThumbsDown(message)}
                        className="text-xs px-2 py-1 rounded hover:bg-black/5 transition-colors flex items-center gap-1"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        Not helpful
                      </button>
                      <button
                        onClick={() => openEscalationModal(message)}
                        className="text-xs px-2 py-1 rounded hover:bg-black/5 transition-colors flex items-center gap-1 text-blue-600"
                      >
                        <Users className="h-3 w-3" />
                        Ask SEO Team
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-card">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-end space-x-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about SEO..."
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

      {/* Escalation Modal */}
      {showEscalationModal && escalationMessage && (
        <EscalationModal
          isOpen={showEscalationModal}
          onClose={() => setShowEscalationModal(false)}
          question={escalationMessage.content}
          aiResponse={messages.find(m => m.role === 'assistant')?.content}
          onSubmit={handleEscalation}
        />
      )}
    </div>
  )
}
