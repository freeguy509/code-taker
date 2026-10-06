export type Race = 'Elf' | 'Demon' | 'Beastman' | 'Human' | 'Dwarf' | 'Angel' | 'Dragon'
export type ClassType = 'Mage' | 'Warrior' | 'Ranger' | 'Assassin' | 'Guardian' | 'Arcanist'
export type Screen = 'home' | 'character' | 'world' | 'game' | 'dungeon' | 'boss'
export type DungeonType = 'forest' | 'cave' | 'castle' | 'abyss'

export type Player = {
  name: string
  race: Race
  classType: ClassType
  level: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  region: 'Eldrin Reach' | 'Stoneheart' | 'Ironhaven' | 'Shadow Coast'
  gold: number
  experience: number
  inventory: string[]
  questsCompleted: number
  bossesDefeated: number
}

export type Quest = {
  id: string
  title: string
  description: string
  type: 'kill' | 'collect' | 'explore'
  target: number
  current: number
  reward: number
  completed: boolean
}

export type Monster = {
  id: string
  name: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  level: number
  drops: string[]
}

export type Dungeon = {
  id: string
  name: string
  type: DungeonType
  level: number
  monsters: Monster[]
  boss: Monster | null
  reward: number
  completed: boolean
}

export type ChatMessage = {
  id: string
  sender: string
  text: string
  timestamp: number
  type: 'player' | 'system' | 'event'
}
