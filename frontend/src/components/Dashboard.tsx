import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useSentiment } from '../context/SentimentContext'

const COLORS: Record<string, string> = {
  Positive: '#22c55e',
  Negative: '#ef4444',
  Neutral: '#94a3b8',
}

/**
 * Displays aggregate sentiment stats as stat cards + a donut chart.
 */
export function Dashboard() {
  const { stats } = useSentiment()

  if (stats.total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data yet — upload a CSV or paste feedback to get started.
      </div>
    )
  }

  const pieData = [
    { name: 'Positive', value: stats.positive },
    { name: 'Negative', value: stats.negative },
    { name: 'Neutral', value: stats.neutral },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Positive" value={stats.positive_pct} count={stats.positive} color="text-green-600" />
        <StatCard label="Negative" value={stats.negative_pct} count={stats.negative} color="text-red-500" />
        <StatCard label="Neutral" value={stats.neutral_pct} count={stats.neutral} color="text-slate-500" />
      </div>

      <p className="text-xs text-gray-400 text-right">{stats.total} total classifications</p>

      {/* Donut Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value} items`, '']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  count: number
  color: string
}

function StatCard({ label, value, count, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value.toFixed(1)}%</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-xs text-gray-400">{count} items</p>
    </div>
  )
}
