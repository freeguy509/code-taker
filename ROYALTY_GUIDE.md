# PK and Royalty System Integration Guide

## Overview

Aethoria now includes a complete Player Killer (PK) system with royalty hierarchy, NPCs who enforce the law, and bounty mechanics.

## Core Systems

### 1. **RoyaltySystem** (`src/game/RoyaltySystem.ts`)
- Manages NPCs (King, Captain, Duke, Executioner, Guards, Bounty Master)
- Places and manages bounties
- Executes wanted players
- Pardons criminals
- Handles justice actions

### 2. **PKSystem** (`src/game/PKSystem.ts`)
- Manages player PK status
- Tracks kills/deaths ratio
- Determines reputation levels
- Checks wanted status

### 3. **Royalty Titles** (`src/types/royalty.ts`)
```
Commoner → Knight → Noble → Captain → Duke → King
                                      └→ Enforcer (unlimited power)
```

## NPCs in the World

### Main Enforcers
- **King Aldric of Eldrin** (Level 20)
  - Title: King
  - Jurisdiction: All regions
  - Can execute, pardon, place bounties
  - Strongest NPC

- **Captain Garrett of Stoneheart** (Level 18)
  - Title: Knight Captain
  - Jurisdiction: Local, Regional, National
  - Can execute, place bounties
  - Patrols major cities

- **Lord Valen of Ironhaven** (Level 17)
  - Title: Duke
  - Jurisdiction: Regional, National, Kingdom
  - Can execute, pardon, place bounties
  - Governs Ironhaven region

- **Malachar the Executioner** (Level 19)
  - Title: Enforcer (Royal Enforcer)
  - Jurisdiction: All regions
  - Can execute anyone
  - Hunts the most dangerous criminals

### Support NPCs
- **Sir Thorne** (Level 10, Guard)
  - Local patrol in Eldrin Reach
  - Can execute within jurisdiction

- **Kessler the Bounty Master** (Level 12, Noble)
  - Manages bounty board
  - Cannot directly execute
  - Coordinates bounty hunters

## Game Mechanics

### PK Mode
```typescript
controller.togglePK()  // Enable/disable PK
```
- When enabled, player can attack others
- Shows "PK ON" status in HUD
- Can be toggled anytime

### Combat System
```typescript
controller.attackPlayer(target, damage)  // Attack another player
```
- Only works in PK mode
- Victim can defend or flee
- Kill is recorded and counted

### Bounty System
```typescript
controller.placeBounty(targetId, amount, reason)  // Place bounty
controller.claimBounty(targetId)  // Claim reward for killing wanted player
```
- Requires authority (Knight+)
- Costs gold
- Bounty expires after 7 days
- Reward goes to whoever kills the criminal

### Wanted Status
- Player becomes wanted after exceeding kill limit for their title
- Commoners: Can kill freely (faction = outlaw)
- Knights: Max 50 kills
- Nobles: Max 30 kills
- Captains: Max 20 kills
- Dukes: Max 10 kills
- Kings: Max 5 kills (very restrictive)
- Enforcers: Unlimited kills

### NPC Patrol
```typescript
controller.npcPatrol()  // Run patrol AI (call every 60 seconds)
```
- NPCs search their jurisdiction for wanted players
- Random chance to find and execute
- Clears bounty on execution
- Players get system message about capture

### Pardon System
```typescript
controller.pardonPlayer(targetId)  // King/Duke only
```
- Only Kings and Dukes can pardon
- Removes wanted status
- Grants 24-hour immunity from PK
- Recorded in justice log

## Integration Steps

### 1. Update GameController
```typescript
import { RoyaltySystem } from './RoyaltySystem'
import { PKSystem } from './PKSystem'

export class GameController {
  royalty = new RoyaltySystem(this.events)
  pkSystem = new PKSystem()
  // ... rest of class
}
```

### 2. Add PK UI to GameScreen
```typescript
import { PKHud } from '../ui/PKHud'

// In GameScreen render method:
PKHud.renderPlayerStatus(player, statusContainer)
PKHud.renderNPCList(controller.getNPCs(), npcContainer)
PKHud.renderBountyBoard(controller.getActiveBounties(), bountyContainer)
```

### 3. Add CSS
```css
/* Add styles from src/ui/PKHud.ts */
```

### 4. Add Event Listeners
```typescript
controller.events.on('pk:toggled', ({ isPK }) => {
  console.log('PK mode:', isPK)
})

controller.events.on('royalty:bounty_placed', ({ amount, reason }) => {
  console.log(`Bounty placed: ${amount}G for ${reason}`)
})

controller.events.on('royalty:player_executed', ({ reward }) => {
  console.log(`Criminal executed! Reward: ${reward}G`)
})
```

## Gameplay Loop

```
1. Player enables PK mode
   ↓
2. Player attacks another player
   ↓
3. If player has too many kills:
   a. Become wanted
   b. Bounty placed by NPCs
   ↓
4. Other players or NPCs can:
   a. Hunt and kill wanted player
   b. Claim bounty reward
   ↓
5. King/Duke can pardon or NPC can execute
   ↓
6. Wanted status clears, immunity granted
```

## Balance Notes

- **High-level titles** (King, Captain) have strict kill limits to prevent tyranny
- **Commoners** can kill freely but become wanted quickly
- **Enforcers** are elite units with no restrictions
- **Bounties** scale with reputation (more kills = higher bounty)
- **Pardon immunity** prevents constant harassment
- **NPC patrols** create danger for criminals
- **Justice log** tracks all actions for accountability

## Future Expansions

- Guild-based justice systems
- Player kingdoms and alliances
- War mechanics and territory control
- Faction reputation (Royal vs. Outlaw)
- Prison system for capture mechanics
- Criminal hideouts and safe zones
- Wanted poster system
- Leaderboards (most wanted, deadliest knight, etc.)

---

**The PK system creates player-driven conflict while NPCs maintain order and consequences.**
