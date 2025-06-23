import OnboardingStatus from '@/components/onboarding/OnboardingStatus'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function OnboardingStatusPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Onboarding Status</h1>
            <p className="text-lg text-gray-600 mt-2">
              Track your dealership onboarding submissions and SEOWerks integration status
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/onboarding">
              <Button>
                New Onboarding
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Component */}
        <OnboardingStatus />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Onboarding Status | Rylie SEO Hub',
  description: 'Track your dealership onboarding submissions and SEOWerks integration status',
}