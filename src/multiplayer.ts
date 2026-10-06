import { ChatMessage } from './types'

export class MultiplayerConnection {
  private ws: WebSocket | null = null
  private sessionId: string = ''
  private playerId: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private messageHandlers: Map<string, (data: any) => void> = new Map()
  private onConnectCallback: (() => void) | null = null
  private onDisconnectCallback: (() => void) | null = null
  private chatMessages: ChatMessage[] = []

  constructor(
    private serverUrl: string = 'ws://localhost:4173/ws',
    sessionIdParam?: string
  ) {
    this.sessionId = sessionIdParam || this.generateSessionId()
    this.playerId = this.generatePlayerId()
  }

  private generateSessionId(): string {
    return Math.random().toString(36).slice(2, 10).toUpperCase()
  }

  private generatePlayerId(): string {
    return `player-${Math.random().toString(36).slice(2, 10)}`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.serverUrl}?session=${this.sessionId}`
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('Connected to game session:', this.sessionId)
          this.reconnectAttempts = 0
          this.broadcastPlayerJoin()
          if (this.onConnectCallback) this.onConnectCallback()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (e) {
            console.error('Failed to parse message:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('Disconnected from server')
          if (this.onDisconnectCallback) this.onDisconnectCallback()
          this.attemptReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts += 1
      const delay = Math.pow(2, this.reconnectAttempts) * 1000
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(() => this.connect().catch(console.error), delay)
    }
  }

  private handleMessage(data: any): void {
    if (data.type === 'chat') {
      this.chatMessages.push(data.message)
      const handler = this.messageHandlers.get('chat')
      if (handler) handler(data.message)
    }

    if (data.type === 'player-join') {
      const handler = this.messageHandlers.get('player-join')
      if (handler) handler(data)
    }

    if (data.type === 'player-update') {
      const handler = this.messageHandlers.get('player-update')
      if (handler) handler(data)
    }

    if (data.type === 'snapshot') {
      const handler = this.messageHandlers.get('snapshot')
      if (handler) handler(data.snapshot)
    }
  }

  private broadcastPlayerJoin(): void {
    this.send({
      type: 'join',
      playerId: this.playerId,
      player: {
        id: this.playerId,
        name: 'Player',
        status: 'exploring',
      },
    })
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  sendChat(text: string): void {
    const message: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      sender: this.playerId,
      text,
      timestamp: Date.now(),
      type: 'player',
    }
    this.send({
      type: 'message',
      text,
      messageType: 'player',
      playerId: this.playerId,
    })
    this.chatMessages.push(message)
  }

  sendSystemMessage(text: string): void {
    const message: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      sender: 'System',
      text,
      timestamp: Date.now(),
      type: 'system',
    }
    this.send({
      type: 'message',
      text,
      messageType: 'system',
    })
    this.chatMessages.push(message)
  }

  on(event: string, handler: (data: any) => void): void {
    this.messageHandlers.set(event, handler)
  }

  onConnect(callback: () => void): void {
    this.onConnectCallback = callback
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback
  }

  getChatMessages(): ChatMessage[] {
    return this.chatMessages.slice(-15)
  }

  getSessionId(): string {
    return this.sessionId
  }

  getPlayerId(): string {
    return this.playerId
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
