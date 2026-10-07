// Integration example for existing GameController
// Add to src/game/GameController.ts

import { RoyaltySystem } from './RoyaltySystem'
import { PKSystem } from './PKSystem'
import type { NPC } from '../types/royalty'

// Add these properties to GameController class
/*
  royalty = new RoyaltySystem(this.events)
  pkSystem = new PKSystem()
  enforcers: NPC[] = []
*/

// Add these methods to GameController class

/**
 * Enable PK mode for the player
 */
publicTogglePK(): boolean {
  const newStatus = this.pkSystem.togglePK(this.player())
  this.events.emit('pk:toggled', { playerId: this.player().id, isPK: newStatus })
  return newStatus
}

/**
 * Player attacks another player (PK)
 */
publicattackPlayer(target: any, damage: number): string {
  const p = this.player()
  const canAttack = this.pkSystem.canKill(p, target)

  if (!canAttack.allowed) {
    return canAttack.reason
  }

  // Deal damage
  target.hp = Math.max(0, target.hp - damage)

  // Record kill if target died
  if (target.hp === 0) {
    this.royalty.recordPKKill(p, target)

    // Check if killer should become wanted
    if (this.pkSystem.shouldBecomeWanted(p)) {
      const royaltyLevel = p.pkStatus?.title
      const npc = this.royalty.getNPCs()[0] // King

      this.royalty.placeBounty(
        target,
        Math.floor(p.pkStatus?.pkKills || 0) * 50,
        `Excessive PK killing: ${p.pkStatus?.pkKills} confirmed kills`,
        npc!
      )
    }
  }

  this.events.emit('pk:attack', {
    attacker: p.name,
    defender: target.name,
    damage,
    victimHP: target.hp,
  })

  return `You dealt ${damage} damage to ${target.name}.`
}

/**
 * Place a bounty on a player (requires authority)
 */
publicplaceBounty(targetId: string, amount: number, reason: string): string {
  const target = this.getPlayerById(targetId) // You need this method
  if (!target) return 'Player not found.'

  const p = this.player()
  const level = p.pkStatus?.title
  const canBounty = level === 'King' || level === 'Duke' || level === 'Captain' || level === 'Noble' || level === 'Knight'

  if (!canBounty) return 'You do not have authority to place bounties.'
  if (p.gold < amount) return 'Not enough gold.'

  p.gold -= amount
  const bounty = this.royalty.placeBounty(target, amount, reason, p)

  if (!bounty) return 'Failed to place bounty.'

  return `Bounty placed: ${amount} gold on ${target.name}. Reason: ${reason}`
}

/**
 * NPC executes a wanted player
 */
publicnpcExecute(targetId: string, npcId: string): string {
  const target = this.getPlayerById(targetId)
  const npc = this.royalty.getNPC(npcId)

  if (!target) return 'Player not found.'
  if (!npc) return 'NPC not found.'

  return this.royalty.executePlayer(target, npc)
}

/**
 * King/Duke pardons a player
 */
publicpardonPlayer(targetId: string): string {
  const target = this.getPlayerById(targetId)
  if (!target) return 'Player not found.'

  const p = this.player()
  const canPardon = p.pkStatus?.title === 'King' || p.pkStatus?.title === 'Duke'

  if (!canPardon) return 'Only Kings and Dukes can pardon.'

  return this.royalty.pardonPlayer(target, p)
}

/**
 * Get bounty info for a player
 */
publicgetBountyInfo(playerId: string): string {
  const player = this.getPlayerById(playerId)
  if (!player) return 'Player not found.'

  return this.royalty.getWantedInfo(player)
}

/**
 * Get PK status of a player
 */
publicgetPKInfo(playerId: string): string {
  const player = this.getPlayerById(playerId)
  if (!player) return 'Player not found.'

  return this.pkSystem.getPKInfo(player)
}

/**
 * Run NPC patrol (call every 60 seconds)
 */
publicnpcPatrol(): void {
  const p = this.player()
  const npcList = this.royalty.getNPCsByRegion(p.region)

  npcList.forEach((npc) => {
    if (this.royalty.shouldNPCEnforce(npc)) {
      const actions = this.royalty.npcPatrol(npc, [p]) // Pass all players in region
      actions.forEach((action) => {
        this.events.emit('royalty:npc_action', { message: action, npc: npc.name })
      })
    }
  })
}

/**
 * Get all NPCs for display
 */
publicgetNPCs(): any[] {
  return this.royalty.getNPCs().map((npc) => ({
    id: npc.id,
    name: npc.name,
    title: npc.title,
    role: npc.role,
    region: npc.region,
    bounties: npc.bountyList.length,
  }))
}

/**
 * Get active bounties
 */
publicgetActiveBounties(): any[] {
  return this.royalty.getActiveBounties().map((b) => ({
    targetId: b.target,
    amount: b.rewards,
    reason: b.reason,
    by: b.executor,
    expiresIn: Math.ceil((b.expiresAt - Date.now()) / (60 * 60 * 1000)) + ' hours',
  }))
}

/**
 * Claim a bounty (player kills wanted criminal)
 */
publicclaimBounty(targetId: string): number {
  const target = this.getPlayerById(targetId)
  if (!target) return 0

  const p = this.player()
  return this.royalty.claimBounty(target, p)
}
