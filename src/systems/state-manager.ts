import { Player, GameSession, WorldState, ChatMessage } from '../types'
import { EventEmitter } from '../types/events'

export class StateManager {
  private currentPlayer: Player | null = null
  private gameSession: GameSession | null = null
  private worldState: WorldState | null = null
  private eventEmitter: EventEmitter

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
  }

  // Player state management
  setPlayer(player: Player): void {
    this.currentPlayer = { ...player }
    this.eventEmitter.emit('player:updated', {
      playerId: player.id,
      changes: player,
    })
  }

  getPlayer(): Player | null {
    return this.currentPlayer
  }

  updatePlayerStats(updates: Partial<Player>): void {
    if (this.currentPlayer) {
      this.currentPlayer = { ...this.currentPlayer, ...updates }
      this.eventEmitter.emit('player:updated', {
        playerId: this.currentPlayer.id,
        changes: updates,
      })
    }
  }

  addToInventory(itemName: string, quantity: number = 1): void {
    if (!this.currentPlayer) return

    const existing = this.currentPlayer.inventory.find((i) => i.name === itemName)
    if (existing) {
      existing.quantity += quantity
    } else {
      this.currentPlayer.inventory.push({
        id: Math.random().toString(36).slice(2),
        name: itemName,
        quantity,
        rarity: 'common',
        type: 'material',
      })
    }
  }

  removeFromInventory(itemId: string, quantity: number = 1): boolean {
    if (!this.currentPlayer) return false

    const item = this.currentPlayer.inventory.find((i) => i.id === itemId)
    if (item && item.quantity >= quantity) {
      item.quantity -= quantity
      if (item.quantity === 0) {
        this.currentPlayer.inventory = this.currentPlayer.inventory.filter((i) => i.id !== itemId)
      }
      return true
    }
    return false
  }

  // Session management
  setSession(session: GameSession): void {
    this.gameSession = session
  }

  getSession(): GameSession | null {
    return this.gameSession
  }

  addSessionMessage(message: ChatMessage): void {
    if (this.gameSession) {
      this.gameSession.messages.push(message)
      if (this.gameSession.messages.length > 100) {
        this.gameSession.messages = this.gameSession.messages.slice(-100)
      }
    }
  }

  getSessionMessages(limit: number = 15): ChatMessage[] {
    if (!this.gameSession) return []
    return this.gameSession.messages.slice(-limit)
  }

  // World state management
  setWorldState(state: WorldState): void {
    this.worldState = state
    this.eventEmitter.emit('world:state_updated', {
      players: state.playersOnline,
      weather: state.weather,
    })
  }

  getWorldState(): WorldState | null {
    return this.worldState
  }

  updateWorldState(updates: Partial<WorldState>): void {
    if (this.worldState) {
      this.worldState = { ...this.worldState, ...updates }
      this.eventEmitter.emit('world:state_updated', {
        players: this.worldState.playersOnline,
        weather: this.worldState.weather,
      })
    }
  }

  // Serialization for network transmission
  serializePlayer(): string {
    return JSON.stringify(this.currentPlayer)
  }

  deserializePlayer(data: string): void {
    try {
      const player = JSON.parse(data) as Player
      this.setPlayer(player)
    } catch (e) {
      console.error('Failed to deserialize player:', e)
    }
  }

  // Clear state on disconnect
  clear(): void {
    this.currentPlayer = null
    this.gameSession = null
    this.worldState = null
  }
}
