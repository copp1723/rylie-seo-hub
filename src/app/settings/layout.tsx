'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { User, Settings, BarChart, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const settingsNav = [
  {
    title: 'Account Settings',
    href: '/settings',
    icon: Settings,
    description: 'Manage your account and preferences',
  },
  {
    title: 'User Management',
    href: '/settings/users',
    icon: User,
    description: 'Invite and manage team members',
  },
  {
    title: 'GA4 Integration',
    href: '/settings/ga4',
    icon: BarChart,
    description: 'Configure Google Analytics',
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account, team, and integrations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <nav className="space-y-2">
            {settingsNav.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-start gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent',
                    isActive && 'bg-accent'
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </Link>
              )
            })}
          </nav>

          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>
    </>
  )
}
