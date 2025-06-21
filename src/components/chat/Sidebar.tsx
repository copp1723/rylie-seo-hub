"use client"

import { User } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  X,
  User as UserIcon
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { formatDate, formatTime } from "@/lib/utils"

interface Conversation {
  id: string
  title: string
  model: string
  messageCount: number
  lastMessage?: string
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  currentConversation: Conversation | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  user: User
}

export default function Sidebar({
  isOpen,
  onClose,
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  user,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm("Are you sure you want to delete this conversation?")) {
      return
    }

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        // Refresh conversations list
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-card border-r transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">R</span>
                </div>
                <span className="font-semibold">Rylie SEO</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="md:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              onClick={onNewConversation}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className={`
                      p-3 cursor-pointer transition-colors hover:bg-accent group
                      ${currentConversation?.id === conversation.id ? "bg-accent" : ""}
                    `}
                    onClick={() => {
                      onSelectConversation(conversation.id)
                      onClose()
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {conversation.title}
                        </h4>
                        {conversation.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conversation.lastMessage}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {conversation.messageCount} messages
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {conversation.lastMessageAt 
                              ? formatTime(conversation.lastMessageAt)
                              : formatDate(conversation.createdAt)
                            }
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6"
                        onClick={(e) => deleteConversation(conversation.id, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                {user.image ? (
                  <img 
                    src={user.image} 
                    alt={user.name || "User"} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            
            {/* Theme Customization Link */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => window.open('/theme', '_blank')}
            >
              <div className="w-3 h-3 bg-primary rounded mr-2" />
              Customize Theme
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

