import { Dungeon, Monster, Quest } from './types'

export class DungeonSystem {
  private dungeons: Map<string, Dungeon> = new Map()
  private currentDungeon: Dungeon | null = null
  private currentFloor: number = 0

  constructor() {
    this.generateDungeons()
  }

  private generateDungeons() {
    const dungeonConfigs = [
      {
        id: 'forest-1',
        name: 'Whispering Woods',
        type: 'forest' as const,
        level: 1-10,
        monsterCount: 80,
        bossName: 'Forest Guardian',
      },
      {
        id: 'cave-1',
        name: 'Shadowstone Cavern',
        type: 'cave' as const,
        level: 11-30,
        monsterCount: 100,
        bossName: 'Stone Colossus',
      },
      {
        id: 'castle-1',
        name: 'Ruins of Valorhold',
        type: 'castle' as const,
        level: 50-70,
        monsterCount: 190,
        bossName: 'Knight Commander',
      },
      {
        id: 'abyss-1',
        name: 'The Endless Abyss',
        type: 'abyss' as const,
        level: 80-100,
        monsterCount: 2500,
        bossName: 'Gorgath the Destroyer',
      },
    ]

    dungeonConfigs.forEach((config) => {
      const monsters: Monster[] = []
      for (let i = 0; i < config.monsterCount; i++) {
        monsters.push(this.createMonster(`${config.id}-m${i}`, config.level))
      }

      const boss = this.createBoss(`${config.id}-boss`, config.bossName, config.level)

      const dungeon: Dungeon = {
        id: config.id,
        name: config.name,
        type: config.type,
        level: config.level,
        monsters,
        boss,
        reward: config.level * 50,
        completed: false,
      }

      this.dungeons.set(config.id, dungeon)
    })
  }

  private createMonster(id: string, dungeonLevel: number): Monster {
    const names = [
      'Goblin Scout',
      'Orc Warrior',
      'Skeleton Guard',
      'Shadow Beast',
      'Fire Elemental',
      'Ice Wraith',
      'Dark Knight',
      'Demon Eye',
    ]
    const name = names[Math.floor(Math.random() * names.length)]
    const level = dungeonLevel + Math.floor(Math.random() * 3)
    const baseStat = level * 10

    return {
      id,
      name,
      hp: baseStat + Math.floor(Math.random() * 20),
      maxHp: baseStat + Math.floor(Math.random() * 20),
      attack: 8 + level * 2 + Math.floor(Math.random() * 5),
      defense: 2 + level,
      level,
      drops: this.getDrops(level),
    }
  }

  private createBoss(id: string, name: string, dungeonLevel: number): Monster {
    const level = dungeonLevel + 2
    const baseStat = level * 15

    return {
      id,
      name,
      hp: baseStat * 2,
      maxHp: baseStat * 2,
      attack: 12 + level * 3,
      defense: 4 + level * 2,
      level,
      drops: [`${name}'s Essence`, 'Legendary Weapon Shard', 'Boss Treasure Chest'],
    }
  }

  private getDrops(level: number): string[] {
    const drops = [
      'Iron Ore',
      'Crystal Shard',
      'Gold Coin',
      'Healing Potion',
      'Mana Stone',
      'Rare Gem',
    ]
    const count = Math.max(1, Math.floor(Math.random() * 2))
    const selected: string[] = []
    for (let i = 0; i < count; i++) {
      selected.push(drops[Math.floor(Math.random() * drops.length)])
    }
    return selected
  }

  getDungeons(): Dungeon[] {
    return Array.from(this.dungeons.values())
  }

  getDungeon(id: string): Dungeon | undefined {
    return this.dungeons.get(id)
  }

  enterDungeon(id: string): Dungeon | null {
    const dungeon = this.dungeons.get(id)
    if (dungeon) {
      this.currentDungeon = JSON.parse(JSON.stringify(dungeon))
      this.currentFloor = 0
      return this.currentDungeon
    }
    return null
  }

  getCurrentDungeon(): Dungeon | null {
    return this.currentDungeon
  }

  getCurrentFloor(): number {
    return this.currentFloor
  }

  getNextMonster(): Monster | null {
    if (!this.currentDungeon) return null
    if (this.currentFloor < this.currentDungeon.monsters.length) {
      return this.currentDungeon.monsters[this.currentFloor]
    }
    return this.currentDungeon.boss
  }

  defeatMonster(): boolean {
    if (!this.currentDungeon) return false
    if (this.currentFloor < this.currentDungeon.monsters.length) {
      this.currentFloor += 1
      return true
    }
    return false
  }

  defeatBoss(): boolean {
    if (!this.currentDungeon) return false
    this.currentDungeon.completed = true
    this.dungeons.set(this.currentDungeon.id, this.currentDungeon)
    return true
  }

  exitDungeon(): void {
    this.currentDungeon = null
    this.currentFloor = 0
  }
}
