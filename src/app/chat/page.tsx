'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/chat/Sidebar'
import { ChatInterface } from '@/components/chat/ChatInterfaceWithRequests'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/')
    }
  }, [status])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="chat-page">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-professional ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => isMobile && setSidebarOpen(false)} 
        />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="page-header">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-toggle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Rylie SEO Assistant</h1>
                <p className="text-xs text-muted-foreground">AI-Powered SEO Insights</p>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-3">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
              </div>
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full border-2 border-border"
                />
              )}
            </div>

            {/* Mobile User Avatar */}
            <div className="sm:hidden">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full border-2 border-border"
                />
              ) : (
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface user={session.user} />
        </div>
      </div>
    </div>
  )
}