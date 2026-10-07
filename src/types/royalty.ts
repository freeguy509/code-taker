// Royalty and title system
export type Title = 'Commoner' | 'Knight' | 'Noble' | 'Captain' | 'Duke' | 'King' | 'Enforcer'

export type RoyaltyLevel = {
  title: Title
  canPK: boolean
  canBounty: boolean
  canExecute: boolean
  canPardon: boolean
  maxPKKills: number
  bountyReward: number
  jurisdiction: string[]
}

export const ROYALTY_LEVELS: Record<Title, RoyaltyLevel> = {
  Commoner: {
    title: 'Commoner',
    canPK: true,
    canBounty: false,
    canExecute: false,
    canPardon: false,
    maxPKKills: 999,
    bountyReward: 0,
    jurisdiction: [],
  },
  Knight: {
    title: 'Knight',
    canPK: true,
    canBounty: true,
    canExecute: false,
    canPardon: false,
    maxPKKills: 50,
    bountyReward: 100,
    jurisdiction: ['local'],
  },
  Noble: {
    title: 'Noble',
    canPK: true,
    canBounty: true,
    canExecute: true,
    canPardon: false,
    maxPKKills: 30,
    bountyReward: 250,
    jurisdiction: ['local', 'regional'],
  },
  Captain: {
    title: 'Knight Captain',
    canPK: true,
    canBounty: true,
    canExecute: true,
    canPardon: false,
    maxPKKills: 20,
    bountyReward: 300,
    jurisdiction: ['local', 'regional', 'national'],
  },
  Duke: {
    title: 'Duke',
    canPK: true,
    canBounty: true,
    canExecute: true,
    canPardon: true,
    maxPKKills: 10,
    bountyReward: 500,
    jurisdiction: ['regional', 'national', 'kingdom'],
  },
  King: {
    title: 'King',
    canPK: true,
    canBounty: true,
    canExecute: true,
    canPardon: true,
    maxPKKills: 5,
    bountyReward: 1000,
    jurisdiction: ['local', 'regional', 'national', 'kingdom'],
  },
  Enforcer: {
    title: 'Royal Enforcer',
    canPK: true,
    canBounty: true,
    canExecute: true,
    canPardon: false,
    maxPKKills: 0, // Unlimited
    bountyReward: 400,
    jurisdiction: ['local', 'regional', 'national', 'kingdom'],
  },
}

export type PKStatus = {
  isPK: boolean
  pkKills: number
  pkDeaths: number
  bountyActive: boolean
  bountyAmount: number
  bountyBy: string // who placed the bounty
  bountyReason: string
  isWanted: boolean
  lastPKTime: number
  pardonedAt: number | null
  title: Title
  faction: 'none' | 'royal' | 'outlaw' | 'bandit'
}

export type JusticeAction = {
  id: string
  type: 'bounty' | 'execute' | 'pardon' | 'arrest' | 'exile'
  target: string // player ID
  executor: string // who performed action (NPC or player ID)
  reason: string
  timestamp: number
  expiresAt: number
  rewards: number
}

export type NPC = {
  id: string
  name: string
  title: Title
  region: string
  role: 'Guard' | 'Captain' | 'Noble' | 'King' | 'Executioner' | 'Bounty Master'
  canEnforce: boolean
  baseHP: number
  attack: number
  defense: number
  level: number
  bountyList: string[] // player IDs with bounties
  jurisdiction: string[]
  lastAction: number
}
