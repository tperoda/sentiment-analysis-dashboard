import { useState, useCallback } from 'react'
import { SentimentProvider, useSentiment } from './context/SentimentContext'
import { useWebSocket } from './hooks/useWebSocket'
import { UploadSection } from './components/UploadSection'
import { Dashboard } from './components/Dashboard'
import { SentimentChart } from './components/SentimentChart'
import { ResultsTable } from './components/ResultsTable'
import type { SentimentResult, SessionStats, ForecastData } from './types'

function AppInner() {
  const { addResults, clearSession } = useSentiment()
  const [isLoading, setIsLoading] = useState(false)

  const handleClassificationComplete = useCallback(
    (payload: { results: SentimentResult[]; stats: SessionStats; forecast: ForecastData | null }) => {
      addResults(payload.results, payload.stats, payload.forecast)
    },
    [addResults]
  )

  const { sendResults, clearSession: wsClearSession } = useWebSocket({
    onClassificationComplete: handleClassificationComplete,
    onSessionCleared: clearSession,
  })

  const handleResults = useCallback(
    (results: unknown[]) => {
      sendResults(results as SentimentResult[])
    },
    [sendResults]
  )

  const handleClear = () => {
    wsClearSession()
    clearSession()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Sentiment Analysis Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Real-time customer feedback classification</p>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-red-200 transition-colors"
        >
          Clear Session
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input */}
          <div className="lg:col-span-1">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Upload Feedback</h2>
              <UploadSection onResults={handleResults} isLoading={isLoading} setIsLoading={setIsLoading} />
            </section>
          </div>

          {/* Right: Stats */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Sentiment Overview</h2>
              <Dashboard />
            </section>
          </div>
        </div>

        {/* Chart */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Trend & Quarterly Forecast</h2>
          <SentimentChart />
        </section>

        {/* Results Table */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Classification Results</h2>
          <ResultsTable />
        </section>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SentimentProvider>
      <AppInner />
    </SentimentProvider>
  )
}
