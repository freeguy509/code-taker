import { NetworkMessage, Player, ChatMessage, ConnectionState, ConnectionStatus } from '../types'
import { EventEmitter } from '../types/events'

export class NetworkManager {
  private ws: WebSocket | null = null
  private connectionState: ConnectionState
  private eventEmitter: EventEmitter
  private messageQueue: NetworkMessage[] = []
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private messageHandlers: Map<string, (data: any) => void> = new Map()

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
    this.connectionState = {
      status: 'disconnected',
      sessionId: '',
      playerId: '',
      ping: 0,
      lastMessage: 0,
      reconnectAttempts: 0,
    }
  }

  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionState.status = 'connecting'
        const url = `${serverUrl}?session=${this.generateSessionId()}`

        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.connectionState.status = 'connected'
          this.connectionState.reconnectAttempts = 0
          this.eventEmitter.emit('connection:connected', {
            sessionId: this.connectionState.sessionId,
            playerId: this.connectionState.playerId,
          })
          this.startHeartbeat()
          this.flushMessageQueue()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          this.connectionState.status = 'error'
          this.eventEmitter.emit('connection:error', { error: new Error('WebSocket error') })
          reject(error)
        }

        this.ws.onclose = () => {
          this.connectionState.status = 'disconnected'
          this.stopHeartbeat()
          this.eventEmitter.emit('connection:disconnected', { reason: 'Connection closed' })
          this.attemptReconnect(serverUrl)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as NetworkMessage
      this.connectionState.lastMessage = Date.now()

      switch (message.type) {
        case 'player_join':
          this.eventEmitter.emit('player:joined', {
            playerId: message.playerId,
            playerName: message.playerName,
          })
          break

        case 'player_leave':
          this.eventEmitter.emit('player:left', {
            playerId: message.playerId,
          })
          break

        case 'player_update':
          this.eventEmitter.emit('player:updated', {
            playerId: message.playerId,
            changes: message.player,
          })
          break

        case 'chat':
          this.eventEmitter.emit('chat:message', {
            senderId: message.senderId,
            senderName: message.senderName,
            text: message.text,
            channel: message.channel,
          })
          break

        case 'combat':
          this.eventEmitter.emit('combat:damage', {
            damage: message.damage,
            attacker: message.attacker,
            defender: message.defender,
          })
          break

        case 'loot':
          this.eventEmitter.emit('loot:obtained', {
            playerId: message.playerId,
            items: message.items.map((i) => i.itemName),
            gold: message.gold,
          })
          break

        case 'snapshot':
          this.eventEmitter.emit('sync:snapshot', {
            players: message.players,
            timestamp: message.timestamp,
          })
          break

        case 'error':
          console.error('Server error:', message.message)
          break
      }

      // Call registered handlers
      const handler = this.messageHandlers.get(message.type)
      if (handler) {
        handler(message)
      }
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }

  send(message: NetworkMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  sendChat(text: string, channel: 'world' | 'party' | 'guild' = 'world'): void {
    const message: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      senderId: this.connectionState.playerId,
      senderName: 'Player',
      text,
      timestamp: Date.now(),
      type: 'player',
      channel,
    }
    this.send(message as any)
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        const start = Date.now()
        this.send({
          type: 'ping',
          timestamp: start,
        } as any)
        this.connectionState.ping = Date.now() - start
      }
    }, 30000) as any
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private attemptReconnect(serverUrl: string): void {
    if (this.connectionState.reconnectAttempts < 5) {
      this.connectionState.reconnectAttempts += 1
      const delay = Math.pow(2, this.connectionState.reconnectAttempts) * 1000
      this.connectionState.status = 'reconnecting'
      this.eventEmitter.emit('connection:reconnecting', {
        attempt: this.connectionState.reconnectAttempts,
      })
      this.reconnectTimer = window.setTimeout(() => {
        this.connect(serverUrl).catch(console.error)
      }, delay) as any
    }
  }

  on(messageType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(messageType, handler)
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  disconnect(): void {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).slice(2, 10).toUpperCase()
  }
}
