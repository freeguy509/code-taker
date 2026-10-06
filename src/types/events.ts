// Event emitter types for decoupled communication
export type EventMap = {
  // Connection events
  'connection:connected': { sessionId: string; playerId: string }
  'connection:disconnected': { reason: string }
  'connection:error': { error: Error }
  'connection:reconnecting': { attempt: number }

  // Player events
  'player:joined': { playerId: string; playerName: string }
  'player:left': { playerId: string }
  'player:updated': { playerId: string; changes: Record<string, any> }
  'player:levelup': { playerId: string; newLevel: number }

  // Combat events
  'combat:started': { playerId: string; monsterId: string }
  'combat:ended': { playerId: string; victory: boolean }
  'combat:damage': { damage: number; attacker: string; defender: string }

  // Loot events
  'loot:obtained': { playerId: string; items: string[]; gold: number }
  'loot:dropped': { monsterId: string; items: string[] }

  // Quest events
  'quest:started': { questId: string; questName: string }
  'quest:updated': { questId: string; progress: number; target: number }
  'quest:completed': { questId: string; reward: number }

  // Dungeon events
  'dungeon:entered': { dungeonId: string; dungeonName: string }
  'dungeon:floor_cleared': { floor: number; totalFloors: number }
  'dungeon:completed': { dungeonId: string; reward: number }

  // Chat events
  'chat:message': { senderId: string; senderName: string; text: string; channel: string }
  'chat:system': { text: string }

  // World events
  'world:state_updated': { players: number; weather: string }
  'world:event_started': { eventName: string; duration: number }
  'world:event_ended': { eventName: string }

  // Multiplayer sync events
  'sync:snapshot': { players: Record<string, any>; timestamp: number }
  'sync:partial': { updates: Record<string, any>; timestamp: number }
}

export type EventHandler<K extends keyof EventMap> = (data: EventMap[K]) => void

export class EventEmitter {
  private listeners: Map<string, Set<Function>> = new Map()

  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set())
    }
    this.listeners.get(event as string)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event as string)?.delete(handler)
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event as string)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void {
    this.listeners.get(event as string)?.delete(handler)
  }

  offAll(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event as string)
    } else {
      this.listeners.clear()
    }
  }
}
