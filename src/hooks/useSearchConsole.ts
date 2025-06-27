'use client'

import { useState, useEffect } from 'react'

interface SearchConsoleData {
  queries: Array<{
    keys: string[]
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  pages: Array<{
    keys: string[]
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  performance: Array<{
    keys: string[]
    clicks: number
    impressions: number
  }>
}

export function useSearchConsole(siteUrl: string, days = 28) {
  const [data, setData] = useState<SearchConsoleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!siteUrl) return

    fetchSearchConsoleData()
  }, [siteUrl, days])

  const fetchSearchConsoleData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [queries, pages, performance] = await Promise.all([
        fetch(`/api/search-console/analytics?siteUrl=${encodeURIComponent(siteUrl)}&metric=queries&days=${days}`).then(r => r.json()),
        fetch(`/api/search-console/analytics?siteUrl=${encodeURIComponent(siteUrl)}&metric=pages&days=${days}`).then(r => r.json()),
        fetch(`/api/search-console/analytics?siteUrl=${encodeURIComponent(siteUrl)}&metric=performance&days=${days}`).then(r => r.json()),
      ])

      setData({
        queries: queries.rows || [],
        pages: pages.rows || [],
        performance: performance.rows || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch: fetchSearchConsoleData }
}