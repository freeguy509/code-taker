/**
 * Turn-based combat rules shared by player-vs-monster and player-vs-NPC encounters.
 * In multiplayer, execute on a trusted server and persist returned state there.
 */
export type CombatSkillEffect = 'damage' | 'heal' | 'guard'
export type CombatSkill = {
  id: string
  name: string
  power: number
  manaCost: number
  cooldownTurns?: number
  effect?: CombatSkillEffect
}
export type CombatGear = {
  id?: string
  name: string
  attack?: number
  defense?: number
  skillPower?: number
  protectedFromDeathLoss?: boolean
  bound?: boolean
}
export type CombatWeapon = { name: string; attack: number; skillPower?: number }
export type Combatant = {
  id: string; name: string; level: number; hp: number; maxHp: number; mp: number; maxMp: number
  attack: number; defense: number; gear?: CombatGear[]; skills?: CombatSkill[]
  /** Absolute turn at which each skill becomes available again. */
  skillReadyAt?: Record<string, number>
}
export type CombatPlayer = Combatant & { weapon?: CombatWeapon | null }
export type CombatMonster = Combatant & { fleeChance?: number; isBoss?: boolean }
export type CombatAction = { type: 'attack' } | { type: 'skill'; skillId: string } | { type: 'defend' } | { type: 'run' }
export type CombatEvent = {
  type: 'player-hit'|'monster-hit'|'skill-used'|'skill-cooldown'|'healed'|'defended'|'critical'|'monster-fled'|'player-fled'|'victory'|'defeat'|'error'
  text: string; damage?: number
}
export type CombatTurnResult = {
  player: CombatPlayer; monster: CombatMonster; events: CombatEvent[]
  outcome: 'ongoing'|'victory'|'defeat'|'escaped'|'monster-fled'|'invalid'
  playerDamage: number; monsterDamage: number; turn: number
}
export type CombatOptions = { random?: () => number; turn?: number; monsterSkillChance?: number; defaultFleeChance?: number }
const MAX = 1_000_000
const clamp = (n: number, min: number, max: number): number => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
const roll = (random: () => number): number => clamp(random(), 0, 0.999999999)
function safe<T extends Combatant>(unit: T): T {
  const maxHp = clamp(unit.maxHp, 1, MAX), maxMp = clamp(unit.maxMp, 0, MAX)
  return { ...unit, level: clamp(unit.level, 1, 10_000), hp: clamp(unit.hp, 0, maxHp), maxHp,
    mp: clamp(unit.mp, 0, maxMp), maxMp, attack: clamp(unit.attack, 0, MAX), defense: clamp(unit.defense, 0, MAX),
    gear: (unit.gear || []).map((g) => ({ ...g, attack: clamp(g.attack || 0, 0, MAX), defense: clamp(g.defense || 0, 0, MAX), skillPower: clamp(g.skillPower || 0, 0, MAX) })),
    skillReadyAt: { ...(unit.skillReadyAt || {}) }, skills: (unit.skills || []).map((s) => ({ ...s })) }
}
function gearTotal(unit: Combatant, stat: 'attack'|'defense'|'skillPower'): number {
  return (unit.gear || []).reduce((total, item) => total + clamp(item[stat] || 0, 0, MAX), 0)
}
function damage(raw: number, defense: number, random: () => number): { amount: number; critical: boolean } {
  const varied = raw * (0.88 + roll(random) * 0.24)
  const mitigated = varied * (100 / (100 + clamp(defense, 0, MAX)))
  const critical = roll(random) < 0.08
  return { amount: Math.max(1, Math.floor(mitigated * (critical ? 1.65 : 1))), critical }
}
function result(player: CombatPlayer, monster: CombatMonster, events: CombatEvent[], outcome: CombatTurnResult['outcome'], playerDamage: number, monsterDamage: number, turn: number): CombatTurnResult {
  return { player, monster, events, outcome, playerDamage, monsterDamage, turn }
}
function activeSkill(unit: Combatant, id: string, turn: number): CombatSkill | undefined {
  if ((unit.skillReadyAt?.[id] || 0) > turn) return undefined
  return unit.skills?.find((skill) => skill.id === id && Number.isFinite(skill.power) && skill.power > 0)
}

/** Resolves one whole turn: player's action, possible enemy skill/response, then outcome. */
export function resolveCombatTurn(inputPlayer: CombatPlayer, inputMonster: CombatMonster, action: CombatAction, options: CombatOptions = {}): CombatTurnResult {
  const random = options.random || Math.random
  const turn = Math.max(1, Math.floor(options.turn || 1))
  const player = safe(inputPlayer) as CombatPlayer, monster = safe(inputMonster) as CombatMonster
  if (!player.hp || !monster.hp) return result(player, monster, [{ type:'error', text:'Combat is already over.' }], 'invalid', 0, 0, turn)
  const events: CombatEvent[] = []
  let playerDamage = 0, monsterDamage = 0, guarding = false
  if (action.type === 'run') return result(player, monster, [{ type:'player-fled', text:'You escaped from the encounter.' }], 'escaped', 0, 0, turn)
  if (action.type === 'defend') {
    guarding = true
    events.push({ type:'defended', text:'You brace for the incoming attack.' })
  } else {
    let skill: CombatSkill | undefined
    if (action.type === 'skill') {
      const readyAt = player.skillReadyAt?.[action.skillId] || 0
      if (readyAt > turn) return result(player, monster, [{ type:'skill-cooldown', text:`${player.skills?.find((s) => s.id === action.skillId)?.name || 'Skill'} is on cooldown for ${readyAt-turn} more turn(s).` }], 'invalid', 0, 0, turn)
      skill = activeSkill(player, action.skillId, turn)
      if (!skill) return result(player, monster, [{ type:'error', text:'That skill is not available.' }], 'invalid', 0, 0, turn)
      const cost = clamp(skill.manaCost, 0, MAX)
      if (player.mp < cost) return result(player, monster, [{ type:'error', text:'Not enough mana for that skill.' }], 'invalid', 0, 0, turn)
      player.mp -= cost
      const cooldown = Math.max(0, Math.floor(clamp(skill.cooldownTurns || 0, 0, 100)))
      if (cooldown) player.skillReadyAt![skill.id] = turn + cooldown
      events.push({ type:'skill-used', text:`${player.name} uses ${skill.name}${cooldown ? ` (cooldown ${cooldown} turns)` : ''}.` })
      if (skill.effect === 'heal') {
        const healed = Math.min(player.maxHp-player.hp, Math.max(1, Math.floor(skill.power)))
        player.hp += healed
        events.push({ type:'healed', text:`${player.name} recovers ${healed} health.`, damage:healed })
      } else if (skill.effect === 'guard') {
        guarding = true
      } else {
        const weaponBonus = (player.weapon?.skillPower || 0) + gearTotal(player, 'skillPower')
        const raw = player.attack + gearTotal(player, 'attack') + (player.weapon?.attack || 0) + skill.power + weaponBonus
        const hit = damage(raw, monster.defense + gearTotal(monster, 'defense'), random)
        monster.hp = Math.max(0, monster.hp-hit.amount); monsterDamage = hit.amount
        events.push({ type:'player-hit', text:`${player.name} deals ${hit.amount} damage to ${monster.name} with ${skill.name}.`, damage:hit.amount })
        if (hit.critical) events.push({ type:'critical', text:'Critical hit!' })
      }
    } else if (action.type === 'attack') {
      const raw = player.attack + gearTotal(player, 'attack') + (player.weapon?.attack || 0)
      const hit = damage(raw, monster.defense + gearTotal(monster, 'defense'), random)
      monster.hp = Math.max(0, monster.hp-hit.amount); monsterDamage = hit.amount
      events.push({ type:'player-hit', text:`${player.name} deals ${hit.amount} damage to ${monster.name}${player.weapon ? ` with ${player.weapon.name}` : ''}.`, damage:hit.amount })
      if (hit.critical) events.push({ type:'critical', text:'Critical hit!' })
    }
    if (!monster.hp) {
      events.push({ type:'victory', text:`${monster.name} is defeated.` })
      return result(player, monster, events, 'victory', 0, monsterDamage, turn)
    }
  }
  const fleeChance = clamp(monster.fleeChance ?? options.defaultFleeChance ?? 0.01, 0, 0.05)
  if (!monster.isBoss && monster.hp/monster.maxHp <= 0.15 && roll(random) < fleeChance) {
    events.push({ type:'monster-fled', text:`${monster.name} flees the battle.` })
    return result(player, monster, events, 'monster-fled', 0, monsterDamage, turn)
  }
  const usable = (monster.skills || []).filter((s) => (monster.skillReadyAt?.[s.id] || 0) <= turn && s.power > 0 && monster.mp >= s.manaCost)
  const enemySkill = usable.length && roll(random) < clamp(options.monsterSkillChance ?? 0.2, 0, 1) ? usable[Math.floor(roll(random)*usable.length)] : undefined
  if (enemySkill) {
    monster.mp -= clamp(enemySkill.manaCost, 0, MAX)
    const cooldown = Math.max(0, Math.floor(clamp(enemySkill.cooldownTurns || 0, 0, 100)))
    if (cooldown) monster.skillReadyAt![enemySkill.id] = turn+cooldown
    events.push({ type:'skill-used', text:`${monster.name} uses ${enemySkill.name}${cooldown ? ` (cooldown ${cooldown} turns)` : ''}.` })
    if (enemySkill.effect === 'heal') {
      const healed = Math.min(monster.maxHp-monster.hp, Math.max(1, Math.floor(enemySkill.power)))
      monster.hp += healed
      events.push({ type:'healed', text:`${monster.name} restores ${healed} health.`, damage:healed })
    } else if (enemySkill.effect === 'guard') {
      monster.defense += Math.floor(enemySkill.power)
      events.push({ type:'defended', text:`${monster.name} raises its defense.` })
    }
  }
  if (!enemySkill || enemySkill.effect !== 'heal') {
    const raw = monster.attack + gearTotal(monster, 'attack') + (enemySkill?.effect === 'damage' ? enemySkill.power : 0)
    const hit = damage(raw, player.defense + gearTotal(player, 'defense') + (guarding ? player.defense : 0), random)
    player.hp = Math.max(0, player.hp-hit.amount); playerDamage = hit.amount
    events.push({ type:'monster-hit', text:`${monster.name}${enemySkill?.effect === 'damage' ? ` uses ${enemySkill.name} and` : ''} deals ${hit.amount} damage${guarding ? ' (guarded)' : ''}.`, damage:hit.amount })
    if (hit.critical) events.push({ type:'critical', text:`${monster.name} lands a critical hit!` })
  }
  if (!player.hp) {
    events.push({ type:'defeat', text:`${player.name} has been defeated.` })
    return result(player, monster, events, 'defeat', playerDamage, monsterDamage, turn)
  }
  return result(player, monster, events, 'ongoing', playerDamage, monsterDamage, turn)
}

export class CombatSession {
  private locked = false
  private turn = 0
  private player: CombatPlayer
  private monster: CombatMonster
  constructor(player: CombatPlayer, monster: CombatMonster) { this.player=safe(player) as CombatPlayer; this.monster=safe(monster) as CombatMonster }
  getSnapshot(): { player: CombatPlayer; monster: CombatMonster; turn: number; locked: boolean } {
    return { player: safe(this.player) as CombatPlayer, monster: safe(this.monster) as CombatMonster, turn:this.turn, locked:this.locked }
  }
  takeTurn(action: CombatAction, options: Omit<CombatOptions,'turn'> = {}): CombatTurnResult {
    if (this.locked) return result(this.player,this.monster,[{type:'error',text:'Please wait for the current action to finish.'}],'invalid',0,0,this.turn)
    this.locked=true
    try {
      const next = this.turn+1
      const resolved=resolveCombatTurn(this.player,this.monster,action,{...options,turn:next})
      if (resolved.outcome!=='invalid') { this.player=resolved.player; this.monster=resolved.monster; this.turn=resolved.turn }
      return resolved
    } finally { this.locked=false }
  }
}
