import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import jwt from 'jsonwebtoken'
import { IncomingMessage } from 'http'

interface TokenPayload {
  userId: string
  email: string
  plan: string
}

interface WsClient {
  id: string
  socket: WebSocket
  isAlive: boolean
  userId: string
  plan: string
  /** Last time a throttled message type was broadcast to this client */
  lastThrottledAt: number
}

const WS_PORT = 3002
const PING_INTERVAL_MS = 30_000

/** Minimum milliseconds between throttled broadcasts per plan tier.
 *  free = 5s, trader = 1s, pro/institutional = real-time (0ms).
 *  Throttled message types: 'opportunities' and 'ticks' (the high-value feed).
 *  All other message types (ping, system notices) bypass throttling.
 */
const PLAN_THROTTLE_MS: Record<string, number> = {
  free:          5_000,
  trader:        1_000,
  pro:           0,
  institutional: 0,
}

const THROTTLED_TYPES = new Set(['opportunities', 'ticks'])

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://arbitrance.com',
  'https://www.arbitrance.com',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[]

function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  return jwt.verify(token, secret) as TokenPayload
}

function getThrottleMs(plan: string): number {
  return PLAN_THROTTLE_MS[plan] ?? PLAN_THROTTLE_MS.free
}

export class WsServer {
  private wss: WebSocketServer
  private clients = new Map<string, WsClient>()
  private pingTimer: ReturnType<typeof setInterval>
  private clientCounter = 0

  constructor() {
    this.wss = new WebSocketServer({
      port: WS_PORT,
      verifyClient: (info: { origin: string; req: IncomingMessage }, callback: (res: boolean, code?: number, message?: string) => void) => {
        // DEV_AUDIT_MODE: bypass all WS auth for raw development auditing
        if (process.env.DEV_AUDIT_MODE === 'true') {
          ;(info.req as IncomingMessage & { wsUser?: TokenPayload }).wsUser = {
            userId: 'dev-audit-bypass',
            email: 'dev@arbitrance.internal',
            plan: 'institutional',
          }
          callback(true)
          return
        }

        // Origin check — only enforce in production to avoid blocking local dev tools
        const origin = info.origin
        if (origin && process.env.NODE_ENV === 'production' && !ALLOWED_ORIGINS.includes(origin)) {
          console.warn(`[WsServer] Rejected connection from unauthorized origin: ${origin}`)
          callback(false, 403, 'Origin not allowed')
          return
        }

        // Token check — parse from ?token= query param
        const rawUrl = info.req.url ?? '/'
        let token: string | null = null
        try {
          const url = new URL(rawUrl, `http://localhost:${WS_PORT}`)
          token = url.searchParams.get('token')
        } catch {
          callback(false, 400, 'Malformed request URL')
          return
        }

        if (!token) {
          callback(false, 401, 'Authentication required — connect with ?token=<access_token>')
          return
        }

        try {
          const payload = verifyToken(token)
          // Attach user to request so the connection handler can read it
          ;(info.req as IncomingMessage & { wsUser?: TokenPayload }).wsUser = payload
          callback(true)
        } catch {
          callback(false, 401, 'Invalid or expired token')
        }
      },
    })

    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      const wsUser = (req as IncomingMessage & { wsUser?: TokenPayload }).wsUser
      if (!wsUser) {
        // Should never reach here (verifyClient blocks it), but fail-safe
        socket.close(1008, 'Unauthorized')
        return
      }

      const id = `client-${++this.clientCounter}`
      const client: WsClient = {
        id,
        socket,
        isAlive: true,
        userId: wsUser.userId,
        plan: wsUser.plan,
        lastThrottledAt: 0,
      }
      this.clients.set(id, client)

      console.log(`[WsServer] Client connected: ${id} (user: ${wsUser.userId}, plan: ${wsUser.plan}, total: ${this.clients.size})`)

      socket.on('pong', () => {
        const c = this.clients.get(id)
        if (c) c.isAlive = true
      })

      socket.on('close', () => {
        this.clients.delete(id)
        console.log(`[WsServer] Client disconnected: ${id} (total: ${this.clients.size})`)
      })

      socket.on('error', (err: Error) => {
        console.error(`[WsServer] Client ${id} error: ${err.message}`)
        this.clients.delete(id)
      })
    })

    this.wss.on('error', (err: Error) => {
      console.error(`[WsServer] Server error: ${err.message}`)
    })

    // Heartbeat — ping all clients, remove dead ones
    this.pingTimer = setInterval(() => {
      for (const [id, client] of this.clients) {
        if (!client.isAlive) {
          console.log(`[WsServer] Removing dead client: ${id}`)
          client.socket.terminate()
          this.clients.delete(id)
          continue
        }
        client.isAlive = false
        client.socket.ping()
      }
    }, PING_INTERVAL_MS)

    console.log(`[WsServer] Listening on ws://localhost:${WS_PORT} (auth required)`)
  }

  broadcast(type: string, data: unknown): void {
    const now = Date.now()
    const isThrottled = THROTTLED_TYPES.has(type)
    const payload = JSON.stringify({ type, data, timestamp: now })

    for (const [id, client] of this.clients) {
      if (client.socket.readyState !== WebSocket.OPEN) {
        this.clients.delete(id)
        continue
      }

      if (isThrottled) {
        const throttleMs = getThrottleMs(client.plan)
        if (throttleMs > 0 && now - client.lastThrottledAt < throttleMs) {
          continue // throttle this client
        }
        client.lastThrottledAt = now
      }

      client.socket.send(payload)
    }
  }

  broadcastToUser(userId: string, type: string, data: unknown): void {
    const payload = JSON.stringify({ type, data, timestamp: Date.now() })
    for (const client of this.clients.values()) {
      if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload)
      }
    }
  }

  sendSnapshot(clientId: string, type: string, data: unknown): void {
    const client = this.clients.get(clientId)
    if (client?.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify({ type, data, timestamp: Date.now() }))
    }
  }

  get connectedCount(): number {
    return this.clients.size
  }

  onConnection(callback: (clientId: string) => void): void {
    this.wss.on('connection', (_socket, _req) => {
      const latest = Array.from(this.clients.keys()).pop()
      if (latest) callback(latest)
    })
  }

  destroy(): void {
    clearInterval(this.pingTimer)
    this.wss.close()
  }
}

export const wsServer = new WsServer()
