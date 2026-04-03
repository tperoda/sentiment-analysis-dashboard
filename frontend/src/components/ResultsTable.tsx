import { useState } from 'react'
import { useSentiment } from '../context/SentimentContext'
import type { SentimentLabel } from '../types'

type SortKey = 'order' | 'sentiment' | 'score'
type FilterLabel = 'ALL' | SentimentLabel

const LABEL_COLORS: Record<SentimentLabel, string> = {
  POSITIVE: 'bg-green-100 text-green-700',
  NEGATIVE: 'bg-red-100 text-red-700',
  NEUTRAL: 'bg-slate-100 text-slate-600',
}

const PAGE_SIZE = 50

/**
 * Displays sentiment classification results in a sortable, filterable table.
 */
export function ResultsTable() {
  const { results, exportCSV } = useSentiment()
  const [sortBy, setSortBy] = useState<SortKey>('order')
  const [filter, setFilter] = useState<FilterLabel>('ALL')
  const [page, setPage] = useState(1)

  const filtered = filter === 'ALL' ? results : results.filter(r => r.label === filter)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'sentiment') return a.label.localeCompare(b.label)
    if (sortBy === 'score') return b.score - a.score
    return 0 // 'order' — already newest-first from context
  })

  const paginated = sorted.slice(0, page * PAGE_SIZE)
  const hasMore = paginated.length < sorted.length

  if (results.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 text-sm">
          <span className="text-gray-500">Filter:</span>
          {(['ALL', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'] as FilterLabel[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
              className={`px-2 py-0.5 rounded text-xs font-medium border ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-sm items-center">
          <span className="text-gray-500">Sort:</span>
          {(['order', 'sentiment', 'score'] as SortKey[]).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2 py-0.5 rounded text-xs font-medium border ${sortBy === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {s}
            </button>
          ))}
          <button onClick={exportCSV} className="ml-2 px-3 py-1 bg-gray-800 text-white rounded text-xs font-medium hover:bg-gray-900">
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium w-[55%]">Text</th>
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Sentiment</th>
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Confidence Score</th>
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2 text-gray-700 max-w-xs truncate" title={r.text}>
                  {r.text.slice(0, 100)}{r.text.length > 100 ? '…' : ''}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LABEL_COLORS[r.label]}`}>
                    {r.label}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600 tabular-nums">{r.score.toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">
                  {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-50"
        >
          Load more ({sorted.length - paginated.length} remaining)
        </button>
      )}
    </div>
  )
}
