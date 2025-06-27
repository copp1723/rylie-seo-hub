'use client'

import { Suspense } from 'react'
import GA4SettingsContent from './GA4SettingsContent'

export default function GA4SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GA4SettingsContent />
    </Suspense>
  )
}