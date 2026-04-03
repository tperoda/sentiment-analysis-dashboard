import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { SentimentResult, SessionStats, ForecastData } from '../types'

interface SentimentContextValue {
  results: SentimentResult[]
  stats: SessionStats
  forecast: ForecastData | null
  addResults: (newResults: SentimentResult[], newStats: SessionStats, newForecast: ForecastData | null) => void
  clearSession: () => void
  exportCSV: () => void
}

const DEFAULT_STATS: SessionStats = {
  total: 0,
  positive: 0,
  negative: 0,
  neutral: 0,
  positive_pct: 0,
  negative_pct: 0,
  neutral_pct: 0,
}

const SentimentContext = createContext<SentimentContextValue | null>(null)

export function SentimentProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<SentimentResult[]>([])
  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS)
  const [forecast, setForecast] = useState<ForecastData | null>(null)

  const addResults = useCallback(
    (newResults: SentimentResult[], newStats: SessionStats, newForecast: ForecastData | null) => {
      setResults(prev => [...newResults, ...prev]) // newest first
      setStats(newStats)
      setForecast(newForecast)
    },
    []
  )

  const clearSession = useCallback(() => {
    setResults([])
    setStats(DEFAULT_STATS)
    setForecast(null)
  }, [])

  const exportCSV = useCallback(() => {
    const header = ['text', 'sentiment', 'score', 'timestamp']
    const rows = results.map(r => [
      `"${r.text.replace(/"/g, '""')}"`,
      r.label,
      r.score.toFixed(4),
      r.timestamp ?? '',
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentiment_results_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  return (
    <SentimentContext.Provider value={{ results, stats, forecast, addResults, clearSession, exportCSV }}>
      {children}
    </SentimentContext.Provider>
  )
}

export function useSentiment(): SentimentContextValue {
  const ctx = useContext(SentimentContext)
  if (!ctx) throw new Error('useSentiment must be used within SentimentProvider')
  return ctx
}
