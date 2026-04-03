import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { useSentiment } from '../context/SentimentContext'

/**
 * Line chart showing historical % positive sentiment (solid) and
 * 12-week forecast (dashed) with a confidence interval band.
 */
export function SentimentChart() {
  const { forecast } = useSentiment()

  if (!forecast || forecast.history.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Classify at least 3 items to see the trend chart.
      </div>
    )
  }

  // Merge history + forecast into a single series for rendering
  const historyMap = new Map(forecast.history.map(([idx, pct]) => [idx, pct]))
  const forecastMap = new Map(forecast.forecast.map(([idx, pct]) => [idx, pct]))
  const ciMap = new Map(
    forecast.confidence_interval.map(([idx, lo, hi]) => [idx, { lo, hi }])
  )

  const allIndices = [
    ...new Set([
      ...forecast.history.map(([i]) => i),
      ...forecast.forecast.map(([i]) => i),
    ]),
  ].sort((a, b) => a - b)

  const chartData = allIndices.map((idx) => ({
    idx,
    history: historyMap.get(idx) ?? null,
    forecast: forecastMap.get(idx) ?? null,
    ci_lo: ciMap.get(idx)?.lo ?? null,
    ci_hi: ciMap.get(idx)?.hi ?? null,
  }))

  const splitIdx = forecast.history.length - 1

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="idx" tick={{ fontSize: 11 }} label={{ value: 'Entry', position: 'insideBottomRight', offset: -8, fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          formatter={(value: ValueType, name: string) => {
            if (value === null || value === undefined) return ['-', name]
            const labels: Record<string, string> = {
              history: '% Positive (historical)',
              forecast: '% Positive (forecast)',
            }
            return [`${(value as number).toFixed(1)}%`, labels[name] ?? name]
          }}
        />
        {/* Confidence interval band */}
        <Area dataKey="ci_hi" stroke="none" fill="#bfdbfe" fillOpacity={0.5} legendType="none" />
        <Area dataKey="ci_lo" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" />
        {/* Historical line */}
        <Line type="monotone" dataKey="history" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
        {/* Forecast dashed line */}
        <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
        {/* Divider between history and forecast */}
        <ReferenceLine x={splitIdx} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Now', fontSize: 10, fill: '#94a3b8' }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
