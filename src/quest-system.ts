import { Quest } from './types'

export class QuestSystem {
  private quests: Quest[] = []
  private activeQuestId: string | null = null

  constructor() {
    this.initializeQuests()
  }

  private initializeQuests() {
    this.quests = [
      {
        id: 'quest-1',
        title: 'Defeat Forest Slimes',
        description: 'Defeat 10 slimes in the Whispering Woods',
        type: 'kill',
        target: 10,
        current: 0,
        reward: 100,
        completed: false,
      },
      {
        id: 'quest-2',
        title: 'Collect Crystal Shards',
        description: 'Gather 5 crystal shards for the mage guild',
        type: 'collect',
        target: 5,
        current: 0,
        reward: 150,
        completed: false,
      },
      {
        id: 'quest-3',
        title: 'Explore the Cavern',
        description: 'Reach the deepest chamber of Shadowstone Cavern',
        type: 'explore',
        target: 1,
        current: 0,
        reward: 200,
        completed: false,
      },
      {
        id: 'quest-4',
        title: 'Defeat the Boss',
        description: 'Defeat the Forest Guardian',
        type: 'kill',
        target: 1,
        current: 0,
        reward: 300,
        completed: false,
      },
    ]

    this.activeQuestId = 'quest-1'
  }

  getQuests(): Quest[] {
    return this.quests
  }

  getActiveQuest(): Quest | null {
    if (!this.activeQuestId) return null
    return this.quests.find((q) => q.id === this.activeQuestId) || null
  }

  setActiveQuest(questId: string): boolean {
    const quest = this.quests.find((q) => q.id === questId)
    if (quest && !quest.completed) {
      this.activeQuestId = questId
      return true
    }
    return false
  }

  updateQuestProgress(questId: string, amount: number = 1): boolean {
    const quest = this.quests.find((q) => q.id === questId)
    if (quest && !quest.completed) {
      quest.current += amount
      if (quest.current >= quest.target) {
        quest.current = quest.target
        quest.completed = true
        return true
      }
      return false
    }
    return false
  }

  completeQuest(questId: string): number {
    const quest = this.quests.find((q) => q.id === questId)
    if (quest && !quest.completed) {
      quest.completed = true
      return quest.reward
    }
    return 0
  }

  getProgress(questId: string): { current: number; target: number } | null {
    const quest = this.quests.find((q) => q.id === questId)
    if (quest) {
      return { current: quest.current, target: quest.target }
    }
    return null
  }
}
