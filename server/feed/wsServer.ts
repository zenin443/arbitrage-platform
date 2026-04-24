import { WebSocketServer, WebSocket } from 'ws'

interface WsClient {
  id: string
  socket: WebSocket
  isAlive: boolean
}

const WS_PORT = 3002
const PING_INTERVAL_MS = 30_000

export class WsServer {
  private wss: WebSocketServer
  private clients = new Map<string, WsClient>()
  private pingTimer: ReturnType<typeof setInterval>
  private clientCounter = 0

  constructor() {
    this.wss = new WebSocketServer({ port: WS_PORT })

    this.wss.on('connection', (socket: WebSocket) => {
      const id = `client-${++this.clientCounter}`
      const client: WsClient = { id, socket, isAlive: true }
      this.clients.set(id, client)

      console.log(`[WsServer] Client connected: ${id} (total: ${this.clients.size})`)

      // Pong handling — mark client alive
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

    console.log(`[WsServer] Listening on ws://localhost:${WS_PORT}`)
  }

  broadcast(type: string, data: unknown): void {
    const payload = JSON.stringify({ type, data, timestamp: Date.now() })
    for (const [id, client] of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload)
      } else {
        this.clients.delete(id)
      }
    }
  }

  broadcastToUser(userId: string, type: string, data: unknown): void {
    const payload = JSON.stringify({ type, data, timestamp: Date.now() })
    const target = Array.from(this.clients.values()).find(c => c.id === userId)
    if (target?.socket.readyState === WebSocket.OPEN) {
      target.socket.send(payload)
    }
  }

  /** Send current snapshot to a single newly-connected client */
  sendSnapshot(clientId: string, type: string, data: unknown): void {
    const client = this.clients.get(clientId)
    if (client?.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify({ type, data, timestamp: Date.now() }))
    }
  }

  get connectedCount(): number {
    return this.clients.size
  }

  /** Registers a callback to be invoked on every new connection */
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
