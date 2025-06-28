import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function ThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/chat"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium">Back to Chat</span>
            </Link>
            <h1 className="text-xl font-semibold">Theme Settings</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
