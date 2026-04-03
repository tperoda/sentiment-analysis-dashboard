import { useEffect, useRef, useCallback } from 'react'
import type { SentimentResult, SessionStats, ForecastData } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

interface ClassificationCompletePayload {
  results: SentimentResult[]
  stats: SessionStats
  forecast: ForecastData | null
}

interface UseWebSocketOptions {
  onClassificationComplete: (payload: ClassificationCompletePayload) => void
  onSessionCleared: () => void
}

export function useWebSocket({ onClassificationComplete, onSessionCleared }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUnmounted = useRef(false)

  const connect = useCallback(() => {
    if (isUnmounted.current) return

    const ws = new WebSocket(`${WS_URL}/ws/sentiment`)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttempt.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)
        if (msg.event === 'classification_complete') {
          onClassificationComplete(msg.data as ClassificationCompletePayload)
        } else if (msg.event === 'session_cleared') {
          onSessionCleared()
        }
      } catch {
        // malformed message — ignore
      }
    }

    ws.onclose = () => {
      if (isUnmounted.current) return
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** reconnectAttempt.current,
        RECONNECT_MAX_MS
      )
      reconnectAttempt.current += 1
      reconnectTimer.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [onClassificationComplete, onSessionCleared])

  useEffect(() => {
    isUnmounted.current = false
    connect()
    return () => {
      isUnmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  /** Send new results to the server via WebSocket. */
  const sendResults = useCallback((results: SentimentResult[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'results_update', data: { results } }))
    }
  }, [])

  /** Tell the server to clear the session. */
  const clearSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'clear_session', data: {} }))
    }
  }, [])

  return { sendResults, clearSession }
}
