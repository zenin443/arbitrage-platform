"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { useArbitrageStore } from '@/store/useArbitrageStore'
import type { ArbitrageOpportunity, PriceTick } from '@/types'

export interface WebSocketState {
  opportunities: ArbitrageOpportunity[]
  ticks: PriceTick[]
  connected: boolean
  lastUpdate: number | null
}

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

export function useWebSocket(url: string): WebSocketState {
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(INITIAL_BACKOFF_MS)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)

  const setOpportunities = useArbitrageStore(s => s.setOpportunities)
  const setLatestTicks = useArbitrageStore(s => s.setLatestTicks)
  const setStoreConnected = useArbitrageStore(s => s.setConnected)

  const opportunities = useArbitrageStore(s => s.opportunities)
  const ticks = useArbitrageStore(s => s.latestTicks)

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return }
      backoffRef.current = INITIAL_BACKOFF_MS
      setConnected(true)
      setStoreConnected(true)
    }

    ws.onmessage = (event: MessageEvent) => {
      if (unmountedRef.current) return
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string
          data: unknown
          timestamp: number
        }

        if (msg.type === 'opportunities') {
          setOpportunities(Array.isArray(msg.data) ? (msg.data as ArbitrageOpportunity[]) : [])
          setLastUpdate(msg.timestamp)
        } else if (msg.type === 'ticks') {
          setLatestTicks(Array.isArray(msg.data) ? (msg.data as PriceTick[]) : [])
          setLastUpdate(msg.timestamp)
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      setConnected(false)
      setStoreConnected(false)

      const delay = backoffRef.current
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS)

      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect()
      }, delay)
    }

    ws.onerror = () => {
      // onclose fires right after, which handles reconnect
      ws.close()
    }
  }, [url, setOpportunities, setLatestTicks, setStoreConnected])

  useEffect(() => {
    unmountedRef.current = false
    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { opportunities, ticks, connected, lastUpdate }
}
