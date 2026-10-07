import type { NPC, PKStatus, JusticeAction, Title, RoyaltyLevel, ROYALTY_LEVELS } from '../types/royalty'
import type { Player } from '../types'
import { EventEmitter } from '../types/events'

export class RoyaltySystem {
  private npcs: Map<string, NPC> = new Map()
  private justiceLog: JusticeAction[] = []
  private bounties: Map<string, JusticeAction> = new Map()
  private eventEmitter: EventEmitter

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
    this.initializeNPCs()
  }

  private initializeNPCs(): void {
    const npcs: NPC[] = [
      {
        id: 'npc-king-eldrin',
        name: 'King Aldric of Eldrin',
        title: 'King',
        region: 'Eldrin Reach',
        role: 'King',
        canEnforce: true,
        baseHP: 500,
        attack: 45,
        defense: 30,
        level: 20,
        bountyList: [],
        jurisdiction: ['local', 'regional', 'national', 'kingdom'],
        lastAction: 0,
      },
      {
        id: 'npc-captain-stoneheart',
        name: 'Captain Garrett of Stoneheart',
        title: 'Captain',
        region: 'Stoneheart',
        role: 'Captain',
        canEnforce: true,
        baseHP: 350,
        attack: 40,
        defense: 25,
        level: 18,
        bountyList: [],
        jurisdiction: ['local', 'regional', 'national'],
        lastAction: 0,
      },
      {
        id: 'npc-noble-ironhaven',
        name: 'Lord Valen of Ironhaven',
        title: 'Duke',
        region: 'Ironhaven',
        role: 'Noble',
        canEnforce: true,
        baseHP: 300,
        attack: 38,
        defense: 23,
        level: 17,
        bountyList: [],
        jurisdiction: ['regional', 'national', 'kingdom'],
        lastAction: 0,
      },
      {
        id: 'npc-executioner-shadow',
        name: 'Malachar the Executioner',
        title: 'Enforcer',
        region: 'Shadow Coast',
        role: 'Executioner',
        canEnforce: true,
        baseHP: 400,
        attack: 50,
        defense: 20,
        level: 19,
        bountyList: [],
        jurisdiction: ['local', 'regional', 'national', 'kingdom'],
        lastAction: 0,
      },
      {
        id: 'npc-guard-eldrin-1',
        name: 'Sir Thorne',
        title: 'Knight',
        region: 'Eldrin Reach',
        role: 'Guard',
        canEnforce: true,
        baseHP: 120,
        attack: 20,
        defense: 15,
        level: 10,
        bountyList: [],
        jurisdiction: ['local'],
        lastAction: 0,
      },
      {
        id: 'npc-bounty-master',
        name: 'Kessler the Bounty Master',
        title: 'Noble',
        region: 'Eldrin Reach',
        role: 'Bounty Master',
        canEnforce: false,
        baseHP: 100,
        attack: 15,
        defense: 10,
        level: 12,
        bountyList: [],
        jurisdiction: ['local', 'regional'],
        lastAction: 0,
      },
    ]

    npcs.forEach((npc) => this.npcs.set(npc.id, npc))
  }

  getNPCs(): NPC[] {
    return Array.from(this.npcs.values())
  }

  getNPC(id: string): NPC | null {
    return this.npcs.get(id) || null
  }

  getNPCsByRegion(region: string): NPC[] {
    return Array.from(this.npcs.values()).filter((npc) => npc.region === region)
  }

  // Check if player can PK another player
  canPlayerPK(attacker: Player, defender: Player, royaltyLevels: Record<Title, RoyaltyLevel>): boolean {
    if (!attacker.pkStatus?.isPK) return false
    if (attacker.id === defender.id) return false
    if (defender.pkStatus?.isWanted) return true // Wanted players can always be attacked
    if (attacker.pkStatus.title === 'King' || attacker.pkStatus.title === 'Enforcer') return true
    return true // Default allow PK
  }

  // Place a bounty on a player
  placeBounty(
    target: Player,
    amount: number,
    reason: string,
    executor: NPC | Player
  ): JusticeAction | null {
    if (amount < 50) return null
    if (amount > 5000) amount = 5000 // Cap bounty

    const action: JusticeAction = {
      id: `bounty-${Date.now()}`,
      type: 'bounty',
      target: target.id,
      executor: executor.id,
      reason,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      rewards: amount,
    }

    this.bounties.set(target.id, action)
    this.justiceLog.push(action)

    if (target.pkStatus) {
      target.pkStatus.bountyActive = true
      target.pkStatus.bountyAmount = amount
      target.pkStatus.bountyBy = executor.name || 'Unknown'
      target.pkStatus.isWanted = true
    }

    this.eventEmitter.emit('royalty:bounty_placed', {
      targetId: target.id,
      amount,
      reason,
      executor: executor.name || 'Unknown',
    })

    return action
  }

  // Execute a wanted criminal
  executePlayer(target: Player, executor: NPC): string {
    if (!executor.canEnforce) return 'This NPC cannot enforce justice.'
    if (!target.pkStatus?.isWanted) return 'Player is not wanted.'

    target.hp = 0
    target.pkStatus.pkDeaths += 1
    target.pkStatus.isWanted = false

    // Reward executor
    const reward = target.pkStatus.bountyAmount || 100

    const action: JusticeAction = {
      id: `execute-${Date.now()}`,
      type: 'execute',
      target: target.id,
      executor: executor.id,
      reason: `Execution of wanted criminal: ${target.name}`,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour cooldown
      rewards: reward,
    }

    this.justiceLog.push(action)
    this.bounties.delete(target.id)

    this.eventEmitter.emit('royalty:player_executed', {
      targetId: target.id,
      executor: executor.name,
      reward,
    })

    return `${executor.name} has executed ${target.name}. Bounty cleared.`
  }

  // Pardon a player (only King/Duke)
  pardonPlayer(target: Player, executor: NPC | Player): string {
    if (!target.pkStatus?.isWanted) return 'Player is not wanted.'

    const title = (executor as NPC).title || (executor as Player).pkStatus?.title
    const canPardon = title === 'King' || title === 'Duke'

    if (!canPardon) return 'Only Kings and Dukes can pardon.'

    target.pkStatus.isWanted = false
    target.pkStatus.bountyActive = false
    target.pkStatus.bountyAmount = 0
    target.pkStatus.pardonedAt = Date.now()

    const action: JusticeAction = {
      id: `pardon-${Date.now()}`,
      type: 'pardon',
      target: target.id,
      executor: executor.id,
      reason: `Player pardoned by ${executor.name || 'Unknown'}`,
      timestamp: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      rewards: 0,
    }

    this.justiceLog.push(action)
    this.bounties.delete(target.id)

    this.eventEmitter.emit('royalty:player_pardoned', {
      targetId: target.id,
      executor: executor.name || 'Unknown',
    })

    return `${target.name} has been pardoned by ${executor.name || 'Unknown'}.`
  }

  // Get bounty on a player
  getBounty(playerId: string): JusticeAction | null {
    return this.bounties.get(playerId) || null
  }

  // Get all active bounties
  getActiveBounties(): JusticeAction[] {
    const now = Date.now()
    return Array.from(this.bounties.values()).filter((b) => b.expiresAt > now)
  }

  // Claim bounty (player kills wanted player)
  claimBounty(target: Player, claimer: Player): number {
    const bounty = this.getBounty(target.id)
    if (!bounty) return 0

    const reward = bounty.rewards
    claimer.gold += reward
    this.bounties.delete(target.id)

    const action: JusticeAction = {
      id: `claimed-${Date.now()}`,
      type: 'bounty',
      target: target.id,
      executor: claimer.id,
      reason: `Bounty claimed by ${claimer.name}`,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
      rewards: reward,
    }

    this.justiceLog.push(action)

    this.eventEmitter.emit('royalty:bounty_claimed', {
      claimer: claimer.name,
      target: target.name,
      reward,
    })

    return reward
  }

  // Get justice log
  getJusticeLog(limit: number = 50): JusticeAction[] {
    return this.justiceLog.slice(-limit)
  }

  // Check if NPC should patrol and enforce
  shouldNPCEnforce(npc: NPC): boolean {
    if (!npc.canEnforce) return false
    if (npc.bountyList.length === 0) return false
    const timeSinceLastAction = Date.now() - npc.lastAction
    return timeSinceLastAction > 60000 // Enforce every 60 seconds
  }

  // NPC patrol behavior
  npcPatrol(npc: NPC, playersInRegion: Player[]): string[] {
    const actions: string[] = []
    npc.lastAction = Date.now()

    // Look for wanted players
    playersInRegion.forEach((player) => {
      if (player.pkStatus?.isWanted) {
        actions.push(`${npc.name} is searching for ${player.name}...`)

        // Random chance to find and execute
        if (Math.random() > 0.6) {
          const msg = this.executePlayer(player, npc)
          actions.push(msg)
        }
      }
    })

    return actions
  }

  // Track PK kill
  recordPKKill(killer: Player, victim: Player): void {
    if (killer.pkStatus) {
      killer.pkStatus.pkKills += 1
      killer.pkStatus.lastPKTime = Date.now()
    }
    if (victim.pkStatus) {
      victim.pkStatus.pkDeaths += 1
    }
  }

  // Check if player should be marked wanted based on PK kills
  checkWantedStatus(player: Player, royaltyLevels: Record<Title, RoyaltyLevel>): boolean {
    if (!player.pkStatus) return false

    const level = royaltyLevels[player.pkStatus.title]
    if (!level) return false

    const maxKills = level.maxPKKills
    if (maxKills === 0) return false // Enforcers can kill freely

    return player.pkStatus.pkKills > maxKills
  }

  // Get player's wanted status info
  getWantedInfo(player: Player): string {
    if (!player.pkStatus?.isWanted) return 'Not wanted.'

    const bounty = this.getBounty(player.id)
    if (!bounty) return 'Wanted status active.'

    const daysLeft = Math.ceil((bounty.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
    return `WANTED: ${bounty.rewards} gold bounty. ${daysLeft} days remaining.`
  }
}
