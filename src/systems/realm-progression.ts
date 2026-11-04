/**
 * Server-authoritative building blocks for faith, world milestones, death recovery,
 * and a future real-money shop. These are deliberately independent of UI and the
 * current legacy Player shape so they can be integrated behind the game controller.
 */

export type FaithId = 'dawn-concord' | 'hearth-covenant' | 'veiled-path' | 'tide-choir' | 'old-roots' | 'free-lanterns'

export type Faith = {
  id: FaithId
  name: string
  teachings: string
  blessing: string
}

export const FAITHS: readonly Faith[] = [
  { id: 'dawn-concord', name: 'The Dawn Concord', teachings: 'Hope, renewal, and keeping promises.', blessing: 'A small recovery bonus after resting at a shrine.' },
  { id: 'hearth-covenant', name: 'The Hearth Covenant', teachings: 'Hospitality, kinship, and care for travelers.', blessing: 'A modest warmth and morale bonus in settlements.' },
  { id: 'veiled-path', name: 'The Veiled Path', teachings: 'Patience, privacy, and knowledge earned carefully.', blessing: 'A brief exploration hint when examining a ruin.' },
  { id: 'tide-choir', name: 'The Tide Choir', teachings: 'Change, balance, and respect for the sea.', blessing: 'A small travel-supply bonus near coastal wayhouses.' },
  { id: 'old-roots', name: 'The Old Roots', teachings: 'Stewardship, memory, and living in balance with nature.', blessing: 'A modest gathering bonus in wild regions.' },
  { id: 'free-lanterns', name: 'The Free Lanterns', teachings: 'Freedom of conscience and aid without expectation.', blessing: 'A small reputation bonus for helping other players.' },
]

export type FaithProfile = {
  faithId: FaithId | null
  devotion: number
  standing: number
  lastWorshipAt: number | null
}

export function createFaithProfile(faithId: FaithId | null = null): FaithProfile {
  return { faithId, devotion: 0, standing: 0, lastWorshipAt: null }
}

/** Worship is optional, cannot be used to attack another faith, and is cooldown-limited. */
export function worship(profile: FaithProfile, faithId: FaithId, now = Date.now()): FaithProfile {
  const cooldownMs = 60 * 60 * 1000
  if (profile.lastWorshipAt !== null && now - profile.lastWorshipAt < cooldownMs) return profile
  return {
    faithId,
    devotion: Math.min(100, profile.devotion + 1),
    standing: Math.min(100, profile.standing + 1),
    lastWorshipAt: now,
  }
}

export type DefeatTarget = {
  id: string
  name: string
  kind: 'boss' | 'named-npc'
  region: string
}

export type WorldEvent = {
  id: string
  dedupeKey: string
  title: string
  description: string
  region: string
  targetId: string
  triggeredAt: number
  expiresAt: number
  reward: { gold: number; reputation: number; itemId?: string }
  status: 'active' | 'ended'
}

/**
 * In-memory prototype event registry. Persist completedKeys and events on the
 * authoritative server before using this across restarts or multiple servers.
 * Call this only after the server validates the boss/NPC defeat.
 */
export class WorldMilestoneSystem {
  private completedKeys = new Set<string>()
  private events: WorldEvent[] = []

  triggerDefeat(
    target: DefeatTarget,
    contributors: string[],
    now = Date.now(),
  ): WorldEvent | null {
    if (!contributors.length) return null
    const dedupeKey = `${target.kind}:${target.id}`
    if (this.completedKeys.has(dedupeKey)) return null

    this.completedKeys.add(dedupeKey)
    const title = target.kind === 'boss'
      ? `${target.name} has fallen`
      : `${target.name} has been defeated`
    const event: WorldEvent = {
      id: `milestone-${target.id}-${now}`,
      dedupeKey,
      title,
      description: target.kind === 'boss'
        ? `Word spreads from ${target.region}: ${target.name} has fallen. The realm reacts to the change in power.`
        : `The named figure ${target.name} has been defeated in ${target.region}. Their allies and rivals respond.`,
      region: target.region,
      targetId: target.id,
      triggeredAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      reward: { gold: target.kind === 'boss' ? 100 : 40, reputation: target.kind === 'boss' ? 10 : 4 },
      status: 'active',
    }
    this.events.push(event)
    return event
  }

  getActiveEvents(now = Date.now()): WorldEvent[] {
    this.events = this.events.map((event) => event.expiresAt <= now && event.status === 'active'
      ? { ...event, status: 'ended' }
      : event)
    return this.events.filter((event) => event.status === 'active')
  }

  /** Include this state in your database snapshot for exactly-once event behavior. */
  exportState(): { completedKeys: string[]; events: WorldEvent[] } {
    return { completedKeys: [...this.completedKeys], events: this.events.map((event) => ({ ...event })) }
  }

  restoreState(state: { completedKeys: string[]; events: WorldEvent[] }): void {
    this.completedKeys = new Set(state.completedKeys)
    this.events = state.events.map((event) => ({ ...event }))
  }
}

export type EquipmentPiece = {
  id: string
  name: string
  slot: string
  /** Items bought with real money or granted as account entitlements must never be dropped. */
  protectedFromDeathLoss?: boolean
  /** Optional flag for items that are already bound to the character. */
  bound?: boolean
}

export type DeathState = {
  level: number
  experience: number
  equipment: EquipmentPiece[]
  gold: number
}

export type DeathPenaltyResult = {
  levelBefore: number
  levelAfter: number
  experienceAfter: number
  goldAfter: number
  recoveredEquipment: EquipmentPiece | null
  message: string
}

/**
 * Death costs: at most one level (never below level 1), 10% carried gold, and
 * one eligible equipped item goes to a recoverable death cache. No item is
 * permanently destroyed here. Real-money/account-bound items are excluded.
 */
export function applyDeathPenalty(state: DeathState, random = Math.random): DeathPenaltyResult {
  const levelAfter = Math.max(1, state.level - 1)
  const goldLoss = Math.floor(Math.max(0, state.gold) * 0.1)
  const eligible = state.equipment.filter((item) => !item.protectedFromDeathLoss && !item.bound)
  const recoveredEquipment = eligible.length
    ? eligible[Math.floor(Math.max(0, Math.min(0.999999999, random())) * eligible.length)]
    : null

  return {
    levelBefore: state.level,
    levelAfter,
    experienceAfter: 0,
    goldAfter: Math.max(0, state.gold - goldLoss),
    recoveredEquipment,
    message: recoveredEquipment
      ? `Defeat cost one level (if above level 1), some carried gold, and ${recoveredEquipment.name} is in your recoverable death cache.`
      : 'Defeat cost one level (if above level 1) and some carried gold. No eligible equipment was lost.',
  }
}

export type StoreProduct = {
  id: string
  name: string
  kind: 'cosmetic' | 'convenience'
  /** Keep monetization cosmetic-only in the initial 16+ audience design. */
  grants: readonly string[]
  priceMinor: number
  currency: string
}

export const STORE_PRODUCTS: readonly StoreProduct[] = [
  { id: 'outfit-starlit', name: 'Starlit Wayfarer Outfit', kind: 'cosmetic', grants: ['cosmetic:outfit-starlit'], priceMinor: 399, currency: 'USD' },
  { id: 'mount-moonhart', name: 'Moonhart Mount Appearance', kind: 'cosmetic', grants: ['cosmetic:mount-moonhart'], priceMinor: 599, currency: 'USD' },
  { id: 'emote-dawn-salute', name: 'Dawn Salute', kind: 'cosmetic', grants: ['cosmetic:emote-dawn-salute'], priceMinor: 199, currency: 'USD' },
]

export type VerifiedPayment = {
  providerTransactionId: string
  accountId: string
  productId: string
  verifiedAt: number
}

/**
 * Payment provider integration point. Implement on a trusted server using the
 * selected provider's official SDK/webhook signature verification. Never accept
 * a client-supplied "paid" flag, price, or grant list as proof of purchase.
 */
export interface PaymentVerifier {
  verifyProviderTransaction(providerPayload: unknown): Promise<VerifiedPayment | null>
}

export type EntitlementStore = {
  hasTransaction(providerTransactionId: string): Promise<boolean>
  grant(accountId: string, productId: string): Promise<void>
}

/** Idempotent grant routine; call only after provider verification succeeds. */
export async function grantVerifiedPurchase(
  providerPayload: unknown,
  verifier: PaymentVerifier,
  entitlements: EntitlementStore,
): Promise<{ granted: boolean; reason: string }> {
  const receipt = await verifier.verifyProviderTransaction(providerPayload)
  if (!receipt) return { granted: false, reason: 'Payment could not be verified.' }
  if (!STORE_PRODUCTS.some((product) => product.id === receipt.productId)) {
    return { granted: false, reason: 'Unknown store product.' }
  }
  if (await entitlements.hasTransaction(receipt.providerTransactionId)) {
    return { granted: false, reason: 'This transaction was already processed.' }
  }
  await entitlements.grant(receipt.accountId, receipt.productId)
  return { granted: true, reason: 'Verified cosmetic entitlement granted.' }
}

export const MONETIZATION_GUARDRAILS = [
  'No real-money loot boxes, paid random rolls, or paid Godly/Mystical weapon chances.',
  'Show the total price and currency before purchase; no premium currency obscures cost.',
  'Use a real payment provider and server-side receipt verification; never process card data in the game client.',
  'Apply age, guardian-consent, tax, refund, privacy, and regional rules through the chosen provider and legal review before launch.',
  'Keep purchased cosmetics account-bound and exempt from death drops; publish refund and account recovery policies.',
] as const
