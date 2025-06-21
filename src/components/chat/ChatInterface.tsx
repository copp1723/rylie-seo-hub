"use client"

import { useState, useEffect, useRef } from "react"
import { User } from "next-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { 
  Menu, 
  Send, 
  Settings, 
  LogOut, 
  MessageSquare, 
  Plus,
  ChevronDown,
  Loader2
} from "lucide-react"
import { signOut } from "next-auth/react"
import Sidebar from "./Sidebar"
import MessageBubble from "./MessageBubble"
import ModelSelector from "./ModelSelector"
import TypingIndicator from "./TypingIndicator"

interface ChatInterfaceProps {
  user: User
}

interface Message {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  createdAt: string
  model?: string
  tokens?: number
}

interface Conversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  messages: Message[]
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4-turbo-preview")
  const [availableModels, setAvailableModels] = useState([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load conversations and models on mount
  useEffect(() => {
    loadConversations()
    loadModels()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error("Failed to load conversations:", error)
    }
  }

  const loadModels = async () => {
    try {
      const response = await fetch("/api/models")
      if (response.ok) {
        const data = await response.json()
        setAvailableModels(data.models || [])
      }
    } catch (error) {
      console.error("Failed to load models:", error)
    }
  }

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentConversation(data.conversation)
        setMessages(data.conversation.messages || [])
        setSelectedModel(data.conversation.model)
      }
    } catch (error) {
      console.error("Failed to load conversation:", error)
    }
  }

  const createNewConversation = () => {
    setCurrentConversation(null)
    setMessages([])
    setSidebarOpen(false)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setIsLoading(true)
    setIsTyping(true)

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversation?.id,
          model: selectedModel,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      let assistantMessage = ""
      let assistantMessageId = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === "conversation" && !currentConversation) {
                setCurrentConversation(parsed.data)
                loadConversations() // Refresh sidebar
              }
              
              if (parsed.type === "userMessage") {
                // Update the temp message with real ID
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === tempUserMessage.id 
                      ? { ...msg, id: parsed.data.id }
                      : msg
                  )
                )
              }
              
              if (parsed.type === "chunk") {
                assistantMessage += parsed.data.content
                
                // Update or add assistant message
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1]
                  if (lastMessage?.role === "ASSISTANT" && !assistantMessageId) {
                    return prev.map((msg, index) => 
                      index === prev.length - 1 
                        ? { ...msg, content: assistantMessage }
                        : msg
                    )
                  } else if (lastMessage?.role !== "ASSISTANT") {
                    const newAssistantMessage: Message = {
                      id: `streaming-${Date.now()}`,
                      role: "ASSISTANT",
                      content: assistantMessage,
                      createdAt: new Date().toISOString(),
                      model: selectedModel,
                    }
                    return [...prev, newAssistantMessage]
                  }
                  return prev
                })
              }
              
              if (parsed.type === "complete") {
                assistantMessageId = parsed.data.id
                setMessages(prev => 
                  prev.map(msg => 
                    msg.role === "ASSISTANT" && msg.id.startsWith("streaming-")
                      ? { 
                          ...msg, 
                          id: assistantMessageId,
                          tokens: parsed.data.tokens,
                          model: parsed.data.model 
                        }
                      : msg
                  )
                )
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to send message:", error)
        // Remove the temp user message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
      }
    } finally {
      setIsLoading(false)
      setIsTyping(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={loadConversation}
        onNewConversation={createNewConversation}
        user={user}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">
                {currentConversation?.title || "New Conversation"}
              </h1>
              <ModelSelector
                models={availableModels}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Card className="p-8 text-center max-w-md">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                <p className="text-muted-foreground">
                  Ask me anything about SEO for your automotive dealership!
                </p>
              </Card>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isUser={message.role === "USER"}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t bg-card p-4">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about SEO strategies, content ideas, or technical improvements..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {inputMessage.length}/2000 characters
          </p>
        </div>
      </div>
    </div>
  )
}

