"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  User, 
  Bot,
  Check
} from "lucide-react"
import { formatTime } from "@/lib/utils"

interface Message {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  createdAt: string
  model?: string
  tokens?: number
}

interface MessageBubbleProps {
  message: Message
  isUser: boolean
}

export default function MessageBubble({ message, isUser }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<boolean | null>(null)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleLike = (isLike: boolean) => {
    setLiked(isLike)
    // TODO: Send feedback to API
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className={`flex items-start space-x-2 max-w-[85%] ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}>
        {/* Avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isUser ? "bg-primary" : "bg-muted"}
        `}>
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Message Content */}
        <Card className={`
          p-3 relative
          ${isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
          }
        `}>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap break-words m-0">
              {message.content}
            </p>
          </div>

          {/* Message Info */}
          <div className={`
            flex items-center justify-between mt-2 pt-2 border-t text-xs
            ${isUser 
              ? "border-primary-foreground/20 text-primary-foreground/70" 
              : "border-muted-foreground/20 text-muted-foreground/70"
            }
          `}>
            <span>{formatTime(message.createdAt)}</span>
            {message.model && !isUser && (
              <span className="text-xs">
                {message.model.split("/")[1]?.replace("-", " ") || message.model}
              </span>
            )}
            {message.tokens && !isUser && (
              <span className="text-xs">
                {message.tokens} tokens
              </span>
            )}
          </div>

          {/* Action Buttons */}
          {!isUser && (
            <div className="absolute -bottom-8 left-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-background border"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 bg-background border ${
                  liked === true ? "text-green-600" : ""
                }`}
                onClick={() => handleLike(true)}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 bg-background border ${
                  liked === false ? "text-red-600" : ""
                }`}
                onClick={() => handleLike(false)}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

