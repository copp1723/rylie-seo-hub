import { SearchConsoleSetup } from '@/components/settings/SearchConsoleSetup'
import { SearchConsoleDashboard } from '@/components/analytics/SearchConsoleDashboard'

export default function SearchConsolePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search Console Integration</h1>
        <p className="text-muted-foreground">
          Connect and manage your Google Search Console integration
        </p>
      </div>

      <div className="space-y-8">
        <SearchConsoleSetup />
        <SearchConsoleDashboard />
      </div>
    </div>
  )
}