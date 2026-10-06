import { Player, Quest, Dungeon, Monster } from '../types'
import { EventEmitter } from '../types/events'
import { StateManager } from './state-manager'
import { NetworkManager } from './network-manager'
import { DungeonSystem } from '../dungeon-system'
import { QuestSystem } from '../quest-system'

export class GameController {
  private stateManager: StateManager
  private networkManager: NetworkManager
  private eventEmitter: EventEmitter
  private dungeonSystem: DungeonSystem
  private questSystem: QuestSystem

  constructor() {
    this.eventEmitter = new EventEmitter()
    this.stateManager = new StateManager(this.eventEmitter)
    this.networkManager = new NetworkManager(this.eventEmitter)
    this.dungeonSystem = new DungeonSystem()
    this.questSystem = new QuestSystem()

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Handle player state changes
    this.eventEmitter.on('player:updated', ({ playerId, changes }) => {
      console.log(`Player ${playerId} updated:`, changes)
      // Broadcast to network
      this.networkManager.send({
        type: 'player_update',
        playerId,
        player: changes,
        timestamp: Date.now(),
      } as any)
    })

    // Handle combat events
    this.eventEmitter.on('combat:damage', ({ damage, attacker, defender }) => {
      console.log(`Combat: ${attacker} dealt ${damage} damage to ${defender}`)
    })

    // Handle loot events
    this.eventEmitter.on('loot:obtained', ({ playerId, items, gold }) => {
      this.stateManager.updatePlayerStats({ gold: (this.stateManager.getPlayer()?.gold || 0) + gold })
      items.forEach((item) => this.stateManager.addToInventory(item))
    })
  }

  // Connection management
  async connectToWorld(serverUrl: string): Promise<void> {
    await this.networkManager.connect(serverUrl)
  }

  disconnectFromWorld(): void {
    this.networkManager.disconnect()
  }

  // Player management
  createPlayer(name: string, race: string, classType: string): Player {
    const player: Player = {
      id: `player-${Math.random().toString(36).slice(2, 10)}`,
      name,
      race: race as any,
      classType: classType as any,
      level: 1,
      experience: 0,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 10,
      defense: 5,
      region: 'Eldrin Reach',
      gold: 0,
      inventory: [],
      questsCompleted: 0,
      bossesDefeated: 0,
      position: { x: 0, y: 0 },
      status: 'idle',
      createdAt: Date.now(),
      lastSeen: Date.now(),
    }
    this.stateManager.setPlayer(player)
    return player
  }

  getPlayer(): Player | null {
    return this.stateManager.getPlayer()
  }

  updatePlayer(updates: Partial<Player>): void {
    this.stateManager.updatePlayerStats(updates)
  }

  // Dungeon management
  enterDungeon(dungeonId: string): Dungeon | null {
    return this.dungeonSystem.enterDungeon(dungeonId)
  }

  exitDungeon(): void {
    this.dungeonSystem.exitDungeon()
  }

  getDungeons(): Dungeon[] {
    return this.dungeonSystem.getDungeons()
  }

  getCurrentDungeon(): Dungeon | null {
    return this.dungeonSystem.getCurrentDungeon()
  }

  getNextMonster(): Monster | null {
    return this.dungeonSystem.getNextMonster()
  }

  defeatMonster(): boolean {
    return this.dungeonSystem.defeatMonster()
  }

  defeatBoss(): boolean {
    return this.dungeonSystem.defeatBoss()
  }

  // Quest management
  getQuests(): Quest[] {
    return this.questSystem.getQuests()
  }

  getActiveQuest(): Quest | null {
    return this.questSystem.getActiveQuest()
  }

  setActiveQuest(questId: string): boolean {
    return this.questSystem.setActiveQuest(questId)
  }

  updateQuestProgress(questId: string, amount?: number): boolean {
    return this.questSystem.updateQuestProgress(questId, amount)
  }

  completeQuest(questId: string): number {
    return this.questSystem.completeQuest(questId)
  }

  // Combat
  attackMonster(monster: Monster): { damage: number; isCritical: boolean } {
    const player = this.getPlayer()
    if (!player) return { damage: 0, isCritical: false }

    const baseDamage = player.attack
    const variance = Math.floor(Math.random() * 10)
    const isCritical = Math.random() > 0.7
    const damage = (baseDamage + variance) * (isCritical ? 2 : 1)

    this.eventEmitter.emit('combat:damage', {
      damage,
      attacker: player.id,
      defender: monster.id,
    })

    return { damage, isCritical }
  }

  // Chat
  sendMessage(text: string, channel: 'world' | 'party' | 'guild' = 'world'): void {
    this.networkManager.sendChat(text, channel)
  }

  // Event system
  on<K extends keyof import('../types/events').EventMap>(
    event: K,
    handler: import('../types/events').EventHandler<K>
  ): () => void {
    return this.eventEmitter.on(event, handler)
  }

  emit<K extends keyof import('../types/events').EventMap>(
    event: K,
    data: import('../types/events').EventMap[K]
  ): void {
    this.eventEmitter.emit(event, data)
  }

  // Inventory
  addToInventory(itemName: string, quantity?: number): void {
    this.stateManager.addToInventory(itemName, quantity)
  }

  removeFromInventory(itemId: string, quantity?: number): boolean {
    return this.stateManager.removeFromInventory(itemId, quantity)
  }
}
