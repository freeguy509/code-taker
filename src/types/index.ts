// Game state types
export type Race = 'Elf' | 'Demon' | 'Beastman' | 'Human' | 'Dwarf' | 'Angel' | 'Dragon'
export type ClassType = 'Mage' | 'Warrior' | 'Ranger' | 'Assassin' | 'Guardian' | 'Arcanist'
export type Screen = 'home' | 'character' | 'world' | 'game' | 'dungeon' | 'boss'
export type DungeonType = 'forest' | 'cave' | 'castle' | 'abyss'

// Player and character types
export type Player = {
  id: string
  name: string
  race: Race
  classType: ClassType
  level: number
  experience: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  region: 'Eldrin Reach' | 'Stoneheart' | 'Ironhaven' | 'Shadow Coast'
  gold: number
  inventory: InventoryItem[]
  questsCompleted: number
  bossesDefeated: number
  position: { x: number; y: number }
  status: 'idle' | 'exploring' | 'fighting' | 'dungeon' | 'boss'
  createdAt: number
  lastSeen: number
}

export type InventoryItem = {
  id: string
  name: string
  quantity: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  type: 'weapon' | 'armor' | 'potion' | 'material' | 'quest'
}

// Quest types
export type Quest = {
  id: string
  title: string
  description: string
  type: 'kill' | 'collect' | 'explore' | 'defeat_boss'
  target: number
  current: number
  reward: number
  difficulty: 'easy' | 'normal' | 'hard' | 'epic'
  completed: boolean
  region: string
}

// Monster and dungeon types
export type Monster = {
  id: string
  name: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  level: number
  experience: number
  drops: LootDrop[]
  type: 'normal' | 'elite' | 'boss'
}

export type LootDrop = {
  itemId: string
  itemName: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  dropRate: number // 0-100
}

export type Dungeon = {
  id: string
  name: string
  type: DungeonType
  level: number
  description: string
  monsters: Monster[]
  boss: Monster | null
  reward: number
  completed: boolean
  region: string
  difficulty: 'normal' | 'hard' | 'nightmare'
}

// Chat and communication types
export type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
  type: 'player' | 'system' | 'event' | 'raid' | 'guild'
  channel: 'world' | 'party' | 'guild' | 'system'
}

// Session and multiplayer types
export type GameSession = {
  id: string
  createdAt: number
  maxPlayers: number
  currentPlayers: number
  players: Map<string, Player>
  messages: ChatMessage[]
  worldState: WorldState
  isActive: boolean
}

export type WorldState = {
  time: number
  weather: 'clear' | 'rain' | 'storm' | 'fog'
  eventActive: boolean
  eventName: string
  activeMonsters: Monster[]
  activeBosses: Monster[]
  playersOnline: number
}

// Network message types
export type NetworkMessage = 
  | PlayerJoinMessage
  | PlayerUpdateMessage
  | PlayerLeaveMessage
  | ChatMessage
  | CombatMessage
  | LootMessage
  | SnapshotMessage
  | ErrorMessage

export type PlayerJoinMessage = {
  type: 'player_join'
  playerId: string
  playerName: string
  player: Player
  timestamp: number
}

export type PlayerUpdateMessage = {
  type: 'player_update'
  playerId: string
  player: Partial<Player>
  timestamp: number
}

export type PlayerLeaveMessage = {
  type: 'player_leave'
  playerId: string
  timestamp: number
}

export type CombatMessage = {
  type: 'combat'
  attacker: string
  defender: string
  damage: number
  isCritical: boolean
  timestamp: number
}

export type LootMessage = {
  type: 'loot'
  playerId: string
  items: InventoryItem[]
  gold: number
  timestamp: number
}

export type SnapshotMessage = {
  type: 'snapshot'
  sessionId: string
  players: Player[]
  messages: ChatMessage[]
  worldState: WorldState
  timestamp: number
}

export type ErrorMessage = {
  type: 'error'
  code: string
  message: string
  timestamp: number
}

// Connection types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

export type ConnectionState = {
  status: ConnectionStatus
  sessionId: string
  playerId: string
  ping: number
  lastMessage: number
  reconnectAttempts: number
}
