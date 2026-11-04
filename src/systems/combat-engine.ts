/**
 * Pure, defensive turn-based combat rules. Input values are copied and clamped;
 * the caller owns persistence and UI. In a multiplayer game, run this on the
 * server and never trust client-provided damage, skill cooldown, or RNG results.
 */

export type CombatSkill = {
  id: string
  name: string
  power: number
  manaCost: number
  cooldownTurns?: number
}

export type CombatWeapon = {
  name: string
  attack: number
  /** Optional flat bonus from an equipped weapon. */
  skillPower?: number
}

export type Combatant = {
  id: string
  name: string
  level: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
}

export type CombatPlayer = Combatant & {
  weapon?: CombatWeapon | null
  skills?: CombatSkill[]
}

export type CombatMonster = Combatant & {
  skills?: CombatSkill[]
  /** Keep low: monsters should flee only rarely, usually near defeat. */
  fleeChance?: number
}

export type CombatAction =
  | { type: 'attack' }
  | { type: 'skill'; skillId: string }
  | { type: 'defend' }
  | { type: 'run' }

export type CombatEvent = {
  type: 'player-hit' | 'monster-hit' | 'skill-used' | 'defended' | 'critical' | 'monster-fled' | 'player-fled' | 'victory' | 'defeat' | 'error'
  text: string
  damage?: number
}

export type CombatTurnResult = {
  player: CombatPlayer
  monster: CombatMonster
  events: CombatEvent[]
  outcome: 'ongoing' | 'victory' | 'defeat' | 'escaped' | 'monster-fled' | 'invalid'
  playerDamage: number
  monsterDamage: number
  turn: number
}

export type CombatOptions = {
  random?: () => number
  turn?: number
  monsterSkillChance?: number
  /** Defaults to 1%; applied only below 15% monster HP. */
  defaultFleeChance?: number
}

const MAX_STAT = 1_000_000
const MAX_LEVEL = 10_000
const clamp = (value: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min

function safeCombatant<T extends Combatant>(unit: T): T {
  const maxHp = clamp(unit.maxHp, 1, MAX_STAT)
  const maxMp = clamp(unit.maxMp, 0, MAX_STAT)
  return {
    ...unit,
    level: clamp(unit.level, 1, MAX_LEVEL),
    maxHp,
    hp: clamp(unit.hp, 0, maxHp),
    maxMp,
    mp: clamp(unit.mp, 0, maxMp),
    attack: clamp(unit.attack, 0, MAX_STAT),
    defense: clamp(unit.defense, 0, MAX_STAT),
  }
}

function roll(random: () => number): number {
  const value = random()
  return clamp(value, 0, 0.999999999)
}

/** Defense has diminishing returns; raw damage always has at least one point on a hit. */
function calculateDamage(raw: number, defense: number, random: () => number, variance = 0.12): { damage: number; critical: boolean } {
  const varied = raw * (1 - variance + roll(random) * variance * 2)
  const mitigated = varied * (100 / (100 + clamp(defense, 0, MAX_STAT)))
  const critical = roll(random) < 0.08
  return { damage: Math.max(1, Math.floor(mitigated * (critical ? 1.65 : 1))), critical }
}

function livingSkill(skills: CombatSkill[] | undefined, id: string): CombatSkill | undefined {
  return skills?.find((skill) => skill.id === id && Number.isFinite(skill.power) && skill.power > 0)
}

function buildResult(
  player: CombatPlayer,
  monster: CombatMonster,
  events: CombatEvent[],
  outcome: CombatTurnResult['outcome'],
  playerDamage: number,
  monsterDamage: number,
  turn: number,
): CombatTurnResult {
  return { player, monster, events, outcome, playerDamage, monsterDamage, turn }
}

/** Resolve one full player turn, including the monster's response if it survives. */
export function resolveCombatTurn(
  originalPlayer: CombatPlayer,
  originalMonster: CombatMonster,
  action: CombatAction,
  options: CombatOptions = {},
): CombatTurnResult {
  const random = options.random ?? Math.random
  const turn = Math.max(1, Math.floor(options.turn ?? 1))
  const player = safeCombatant(originalPlayer) as CombatPlayer
  const monster = safeCombatant(originalMonster) as CombatMonster
  player.weapon = originalPlayer.weapon ? {
    ...originalPlayer.weapon,
    attack: clamp(originalPlayer.weapon.attack, 0, MAX_STAT),
    skillPower: clamp(originalPlayer.weapon.skillPower ?? 0, 0, MAX_STAT),
  } : null

  if (player.hp <= 0 || monster.hp <= 0) {
    return buildResult(player, monster, [{ type: 'error', text: 'Combat is already over.' }], 'invalid', 0, 0, turn)
  }

  const events: CombatEvent[] = []
  let playerDamage = 0
  let monsterDamage = 0
  let defending = false

  if (action.type === 'run') {
    events.push({ type: 'player-fled', text: 'You escaped from the encounter.' })
    return buildResult(player, monster, events, 'escaped', 0, 0, turn)
  }

  if (action.type === 'defend') {
    defending = true
    events.push({ type: 'defended', text: 'You brace for the incoming attack.' })
  } else {
    let power = 0
    let skillName = ''
    if (action.type === 'skill') {
      const skill = livingSkill(player.skills, action.skillId)
      if (!skill) {
        return buildResult(player, monster, [{ type: 'error', text: 'That skill is not available.' }], 'invalid', 0, 0, turn)
      }
      const manaCost = clamp(skill.manaCost, 0, MAX_STAT)
      if (player.mp < manaCost) {
        return buildResult(player, monster, [{ type: 'error', text: 'Not enough mana for that skill.' }], 'invalid', 0, 0, turn)
      }
      player.mp -= manaCost
      power = clamp(skill.power, 0, MAX_STAT) + (player.weapon?.skillPower ?? 0)
      skillName = skill.name
      events.push({ type: 'skill-used', text: `You use ${skillName}.` })
    } else if (action.type !== 'attack') {
      return buildResult(player, monster, [{ type: 'error', text: 'Unknown combat action.' }], 'invalid', 0, 0, turn)
    }

    const weaponAttack = player.weapon?.attack ?? 0
    const base = player.attack + weaponAttack + power
    const hit = calculateDamage(base, monster.defense, random, action.type === 'skill' ? 0.08 : 0.12)
    monster.hp = Math.max(0, monster.hp - hit.damage)
    monsterDamage = hit.damage
    events.push({ type: 'player-hit', text: `You deal ${hit.damage} damage${skillName ? ` with ${skillName}` : ''}${player.weapon ? ` using ${player.weapon.name}` : ''}.`, damage: hit.damage })
    if (hit.critical) events.push({ type: 'critical', text: 'Critical hit!' })

    if (monster.hp <= 0) {
      events.push({ type: 'victory', text: `${monster.name} is defeated.` })
      return buildResult(player, monster, events, 'victory', 0, monsterDamage, turn)
    }
  }

  const configuredFlee = originalMonster.fleeChance
  const fleeChance = clamp(configuredFlee ?? options.defaultFleeChance ?? 0.01, 0, 0.05)
  if (monster.hp / monster.maxHp <= 0.15 && roll(random) < fleeChance) {
    events.push({ type: 'monster-fled', text: `${monster.name} flees the battle.` })
    return buildResult(player, monster, events, 'monster-fled', 0, monsterDamage, turn)
  }

  const monsterSkillChance = clamp(options.monsterSkillChance ?? 0.2, 0, 1)
  const usableMonsterSkills = (monster.skills ?? []).filter((skill) =>
    Number.isFinite(skill.power) && skill.power > 0 && monster.mp >= clamp(skill.manaCost, 0, MAX_STAT),
  )
  const useSkill = usableMonsterSkills.length > 0 && roll(random) < monsterSkillChance
  const monsterSkill = useSkill
    ? usableMonsterSkills[Math.floor(roll(random) * usableMonsterSkills.length)]
    : undefined
  const manaCost = monsterSkill ? clamp(monsterSkill.manaCost, 0, MAX_STAT) : 0
  if (monsterSkill) monster.mp = Math.max(0, monster.mp - manaCost)

  const rawMonsterAttack = monster.attack + (monsterSkill ? clamp(monsterSkill.power, 0, MAX_STAT) : 0)
  const hit = calculateDamage(rawMonsterAttack, player.defense * (defending ? 2 : 1), random)
  player.hp = Math.max(0, player.hp - hit.damage)
  playerDamage = hit.damage
  events.push({
    type: 'monster-hit',
    text: `${monster.name} ${monsterSkill ? `uses ${monsterSkill.name} and ` : ''}deals ${hit.damage} damage${defending ? ' (reduced by your defense)' : ''}.`,
    damage: hit.damage,
  })
  if (hit.critical) events.push({ type: 'critical', text: `${monster.name} lands a critical hit!` })

  if (player.hp <= 0) {
    events.push({ type: 'defeat', text: 'You have been defeated. The game should now apply its configured death and recovery rules.' })
    return buildResult(player, monster, events, 'defeat', playerDamage, monsterDamage, turn)
  }

  return buildResult(player, monster, events, 'ongoing', playerDamage, monsterDamage, turn)
}

/** A tiny stateful adapter prevents duplicate button submissions during animations. */
export class CombatSession {
  private locked = false
  private turn = 0
  private player: CombatPlayer
  private monster: CombatMonster

  constructor(player: CombatPlayer, monster: CombatMonster) {
    this.player = safeCombatant(player) as CombatPlayer
    this.monster = safeCombatant(monster) as CombatMonster
  }

  getSnapshot(): { player: CombatPlayer; monster: CombatMonster; turn: number; locked: boolean } {
    return { player: { ...this.player }, monster: { ...this.monster }, turn: this.turn, locked: this.locked }
  }

  takeTurn(action: CombatAction, options: Omit<CombatOptions, 'turn'> = {}): CombatTurnResult {
    if (this.locked) {
      return buildResult(this.player, this.monster, [{ type: 'error', text: 'Please wait for the current action to finish.' }], 'invalid', 0, 0, this.turn)
    }
    this.locked = true
    try {
      const result = resolveCombatTurn(this.player, this.monster, action, { ...options, turn: this.turn + 1 })
      if (result.outcome !== 'invalid') {
        this.player = result.player
        this.monster = result.monster
        this.turn = result.turn
      }
      return result
    } finally {
      this.locked = false
    }
  }
}
