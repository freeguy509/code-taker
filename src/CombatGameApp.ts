import { App as AppV1 } from './App'
import { GameApp } from './AppV2'
import { CombatSession, type CombatMonster, type CombatPlayer } from './systems/combat-engine'
import { applyDeathPenalty } from './systems/realm-progression'
import type { Monster, Screen } from './types'

/**
 * Combat-wired application. It inherits the existing world, quest, inventory,
 * dungeon generation and reward flows, while replacing only the encounter UI and
 * routing all encounter actions through CombatSession.
 */
export class CombatGameApp extends GameApp {
  private encounter: CombatSession | null = null
  private encounterMonsterId: string | null = null
  private encounterLocked = false
  private encounterFinished = false
  private bossPhase = 0
  private combatLog: string[] = []

  protected renderDungeon(): void {
    this.renderCombatEncounter(false)
  }

  protected renderBoss(): void {
    this.renderCombatEncounter(true)
  }

  private renderCombatEncounter(isBoss: boolean): void {
    if (!this.currentDungeon || !this.currentMonster) {
      this.setScreen('game')
      return
    }

    const player = this.player as any
    const monster = this.currentMonster as Monster
    this.ensureEncounter(player, monster, isBoss)
    const snapshot = this.encounter!.getSnapshot()
    const phaseLabel = isBoss ? ` · Phase ${Math.max(1, this.bossPhase)}` : ''
    const shell = document.createElement('main')
    shell.className = `combat-shell ${isBoss ? 'combat-boss' : ''}`
    shell.innerHTML = `
      <header class="combat-header">
        <div>
          <p class="combat-eyebrow">${isBoss ? 'BOSS ENCOUNTER' : 'DUNGEON ENCOUNTER'}${phaseLabel}</p>
          <h1>${this.escapeCombatText(monster.name)}</h1>
          <p>${this.escapeCombatText(this.currentDungeon.name)} · Floor ${this.dungeonSystem.getCurrentFloor() + 1}</p>
        </div>
        <button type="button" class="combat-back" data-action="run">Run</button>
      </header>
      <section class="combat-arena" aria-label="Battle status">
        <article class="combatant-card player-card">
          <div class="combat-avatar" aria-hidden="true">◆</div>
          <h2>${this.escapeCombatText(player.name)}</h2>
          <p>Level ${player.level}</p>
          <div class="combat-meter-label"><span>Health</span><span>${player.hp} / ${player.maxHp}</span></div>
          <div class="combat-meter"><span class="player-health" style="width:${this.percent(player.hp, player.maxHp)}%"></span></div>
          <div class="combat-meter-label"><span>Mana</span><span>${player.mp} / ${player.maxMp}</span></div>
          <div class="combat-meter"><span class="player-mana" style="width:${this.percent(player.mp, player.maxMp)}%"></span></div>
        </article>
        <div class="combat-divider" aria-hidden="true">VS</div>
        <article class="combatant-card monster-card">
          <div class="combat-avatar monster-avatar" aria-hidden="true">${isBoss ? '♜' : 'M'}</div>
          <h2>${this.escapeCombatText(monster.name)}</h2>
          <p>Level ${monster.level}${isBoss ? ` · Phase ${Math.max(1, this.bossPhase)}` : ''}</p>
          <div class="combat-meter-label"><span>Health</span><span>${snapshot.monster.hp} / ${snapshot.monster.maxHp}</span></div>
          <div class="combat-meter"><span class="monster-health" style="width:${this.percent(snapshot.monster.hp, snapshot.monster.maxHp)}%"></span></div>
          ${isBoss ? '<p class="boss-warning">The creature gathers power as the battle turns.</p>' : ''}
        </article>
      </section>
      <section class="combat-controls" aria-label="Combat actions">
        <button type="button" class="combat-action primary" data-action="attack">Attack</button>
        <button type="button" class="combat-action" data-action="skill">Signature skill · 20 MP</button>
        <button type="button" class="combat-action" data-action="defend">Defend</button>
        <button type="button" class="combat-action danger" data-action="run">Run away</button>
      </section>
      <section class="combat-log" aria-live="polite" aria-label="Battle log">
        <h2>Battle log</h2>
        <ol>${this.combatLog.slice(-6).map((line) => `<li>${this.escapeCombatText(line)}</li>`).join('') || '<li>The encounter begins. Choose your action.</li>'}</ol>
      </section>
      <p class="combat-hint">Weapon bonuses apply when equipped gear provides combat stats. This prototype's legacy inventory stores item names only.</p>
    `
    this.root.replaceChildren(shell)

    shell.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      const action = button.dataset.action
      button.disabled = this.encounterLocked || this.encounterFinished ||
        (action === 'skill' && snapshot.player.mp < 20)
      button.addEventListener('click', () => {
        if (action === 'attack') this.performAction({ type: 'attack' })
        else if (action === 'skill') this.performAction({ type: 'skill', skillId: 'signature' })
        else if (action === 'defend') this.performAction({ type: 'defend' })
        else if (action === 'run') this.performAction({ type: 'run' })
      })
    })
  }

  private ensureEncounter(player: any, source: Monster, isBoss: boolean): void {
    if (this.encounter && this.encounterMonsterId === source.id) return
    this.encounterMonsterId = source.id
    this.encounterFinished = false
    this.encounterLocked = false
    this.bossPhase = isBoss ? 1 : 0
    this.combatLog = [`${source.name} blocks your path.`]
    this.encounter = new CombatSession(this.toCombatPlayer(player), this.toCombatMonster(source, isBoss, this.bossPhase))
  }

  private toCombatPlayer(player: any): CombatPlayer {
    const attack = this.safeStat(player.attack, 1)
    return {
      id: String(player.id || 'hero'),
      name: String(player.name || 'Adventurer'),
      level: this.safeStat(player.level, 1),
      hp: this.safeStat(player.hp, 1),
      maxHp: this.safeStat(player.maxHp, 1),
      mp: this.safeStat(player.mp, 0),
      maxMp: this.safeStat(player.maxMp, 0),
      attack,
      defense: this.safeStat(player.defense, 0),
      weapon: { name: 'Equipped weapon', attack: 0 },
      skills: [{ id: 'signature', name: `${String(player.classType || 'Adventurer')} technique`, power: Math.max(1, Math.floor(attack * 1.5)), manaCost: 20 }],
    }
  }

  private toCombatMonster(source: Monster, isBoss: boolean, phase: number): CombatMonster {
    const monster: CombatMonster = {
      id: source.id,
      name: source.name,
      level: this.safeStat(source.level, 1),
      hp: this.safeStat(source.hp, 1),
      maxHp: this.safeStat(source.maxHp, 1),
      mp: isBoss ? 100 : 0,
      maxMp: isBoss ? 100 : 0,
      attack: this.safeStat(source.attack, 1) * (isBoss && phase > 1 ? 1 + (phase - 1) * 0.12 : 1),
      defense: this.safeStat(source.defense, 0),
      fleeChance: isBoss ? 0 : 0.01,
      skills: isBoss && phase > 1
        ? [{ id: `boss-phase-${phase}`, name: phase === 2 ? 'Ruinous Pulse' : 'Cataclysmic Surge', power: Math.floor(source.attack * (phase === 2 ? 0.65 : 0.95)), manaCost: 10 }]
        : [],
    }
    return monster
  }

  private performAction(action: { type: 'attack' | 'defend' | 'run' } | { type: 'skill'; skillId: string }): void {
    if (!this.encounter || !this.currentMonster || this.encounterLocked || this.encounterFinished) return
    this.encounterLocked = true
    try {
      const isBoss = (this.screen as Screen) === 'boss'
      const result = this.encounter.takeTurn(action, { monsterSkillChance: isBoss ? 0.3 : 0.18 })
      if (result.outcome === 'invalid') {
        this.combatLog.push(result.events.map((event) => event.text).join(' '))
        this.renderCombatEncounter(isBoss)
        return
      }

      const player = this.player as any
      player.hp = result.player.hp
      player.mp = result.player.mp
      this.currentMonster.hp = result.monster.hp
      this.dungeonHP = result.monster.hp
      this.dungeonMaxHP = result.monster.maxHp
      this.combatLog.push(...result.events.map((event) => event.text))

      if (isBoss && result.outcome === 'ongoing') this.updateBossPhase(result.monster)
      if (result.outcome === 'victory') {
        this.encounterFinished = true
        this.combatLog.push(`${this.currentMonster.name} is defeated. Rewards are being resolved.`)
        this.renderCombatEncounter(isBoss)
        window.setTimeout(() => this.resolveVictory(isBoss), 500)
        return
      }
      if (result.outcome === 'defeat') {
        this.encounterFinished = true
        this.resolveDeath()
        return
      }
      if (result.outcome === 'escaped' || result.outcome === 'monster-fled') {
        this.encounterFinished = true
        this.addChatMessage(result.outcome === 'escaped' ? 'You fled the encounter. No kill reward was granted.' : `${this.currentMonster.name} fled. No kill reward was granted.`, 'event')
        this.cleanupEncounter()
        this.dungeonSystem.exitDungeon()
        this.currentDungeon = null
        this.currentMonster = null
        this.setScreen('game')
        return
      }
      this.renderCombatEncounter(isBoss)
    } catch (error) {
      console.error('Combat action recovered from an unexpected error:', error)
      this.combatLog.push('The action failed safely. Your current encounter state was preserved; try again.')
      this.renderCombatEncounter((this.screen as Screen) === 'boss')
    } finally {
      this.encounterLocked = false
    }
  }

  private updateBossPhase(monster: CombatMonster): void {
    const ratio = monster.hp / Math.max(1, monster.maxHp)
    const nextPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1
    if (nextPhase <= this.bossPhase) return
    this.bossPhase = nextPhase
    this.combatLog.push(nextPhase === 2
      ? `${monster.name} enters phase two and unleashes a stronger skill!`
      : `${monster.name} enters its final phase. A powerful attack is coming!`)
    // Rebuild with the phase skill while preserving current combatant health/mana.
    const playerSnapshot = this.encounter!.getSnapshot().player
    this.encounter = new CombatSession(playerSnapshot, this.toCombatMonster(this.currentMonster!, true, nextPhase))
  }

  private resolveVictory(isBoss: boolean): void {
    if (!this.currentMonster || !this.currentDungeon) return
    this.cleanupEncounter()
    // Keep the existing reward, loot, floor advancement, quest, and boss progression.
    if (isBoss) (this as any).defeatBoss()
    else (this as any).defeatMonster()
  }

  private resolveDeath(): void {
    const player = this.player as any
    // Legacy inventory has names only and no equipped-item model. Do not delete
    // arbitrary inventory. Apply the level/XP/gold portion and preserve all items.
    const penalty = applyDeathPenalty({
      level: this.safeStat(player.level, 1),
      experience: this.safeStat(player.experience, 0),
      equipment: [],
      gold: this.safeStat(player.gold, 0),
    })
    player.level = penalty.levelAfter
    player.experience = penalty.experienceAfter
    player.gold = penalty.goldAfter
    player.hp = Math.max(1, Math.ceil(this.safeStat(player.maxHp, 1) * 0.5))
    this.combatLog.push(penalty.message)
    this.addChatMessage(penalty.message, 'event')
    this.cleanupEncounter()
    this.dungeonSystem.exitDungeon()
    this.currentDungeon = null
    this.currentMonster = null
    this.setScreen('game')
  }

  private cleanupEncounter(): void {
    this.encounter = null
    this.encounterMonsterId = null
    this.encounterFinished = true
    this.encounterLocked = false
    this.bossPhase = 0
  }

  private percent(value: number, max: number): number {
    return Math.max(0, Math.min(100, (this.safeStat(value, 0) / Math.max(1, this.safeStat(max, 1))) * 100))
  }

  private safeStat(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1_000_000, value)) : fallback
  }

  private escapeCombatText(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]!)
  }
}
