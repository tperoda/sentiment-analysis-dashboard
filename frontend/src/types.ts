export type SentimentLabel = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'

export interface SentimentResult {
  text: string
  label: SentimentLabel
  score: number
  timestamp?: string
}

export interface SessionStats {
  total: number
  positive: number
  negative: number
  neutral: number
  positive_pct: number
  negative_pct: number
  neutral_pct: number
}

export interface ForecastData {
  history: [number, number][]
  forecast: [number, number][]
  confidence_interval: [number, number, number][]
}
