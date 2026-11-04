import type { ClassType, Player, Race, Screen } from './types'

type Action = { label: string; onClick: () => void }

/** Minimal shared shell required by the existing GameApp subclass. */
export class App {
  protected root: HTMLElement
  protected screen: Screen = 'home'
  protected player: Player

  constructor(root: HTMLElement) {
    this.root = root
    this.player = {
      id: `player-${Math.random().toString(36).slice(2, 10)}`,
      name: 'Aethor', race: 'Elf', classType: 'Mage', level: 1, experience: 0,
      hp: 90, maxHp: 90, mp: 140, maxMp: 140, attack: 18, defense: 8,
      region: 'Eldrin Reach', gold: 25, inventory: [], questsCompleted: 0,
      bossesDefeated: 0, position: { x: 0, y: 0 }, status: 'idle',
      createdAt: Date.now(), lastSeen: Date.now(),
    }
  }

  start(): void { this.render() }
  protected render(): void {}

  protected makePanel(title: string, subtitle: string): HTMLElement {
    const panel = document.createElement('section')
    panel.className = 'panel'
    panel.innerHTML = `<p class="eyebrow">AETHORIA · ETERNAL REALMS</p><h1>${this.escape(title)}</h1><p>${this.escape(subtitle)}</p>`
    return panel
  }

  protected makeActions(actions: Action[]): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'actions'
    actions.forEach(({ label, onClick }, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = index === 0 ? 'button button-primary' : 'button button-secondary'
      button.textContent = label
      button.addEventListener('click', onClick)
      wrap.appendChild(button)
    })
    return wrap
  }

  protected makeInput(labelText: string, value: string, onChange: (value: string) => void): HTMLElement {
    const label = document.createElement('label')
    label.className = 'field'
    label.textContent = labelText
    const input = document.createElement('input')
    input.value = value
    input.addEventListener('input', () => onChange(input.value))
    label.appendChild(input)
    return label
  }

  protected makeChoiceGroup(labelText: string, choices: string[], selected: string, onChange: (value: string) => void): HTMLElement {
    const group = document.createElement('fieldset')
    group.className = 'choice-group'
    const legend = document.createElement('legend')
    legend.textContent = labelText
    group.appendChild(legend)
    choices.forEach((choice) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `choice ${choice === selected ? 'selected' : ''}`
      button.textContent = choice
      button.setAttribute('aria-pressed', String(choice === selected))
      button.addEventListener('click', () => onChange(choice))
      group.appendChild(button)
    })
    return group
  }

  protected updatePlayerStats(): void {
    const stats: Record<ClassType, [number, number, number, number]> = {
      Mage: [90, 140, 18, 8], Warrior: [140, 40, 24, 18], Ranger: [100, 70, 22, 10],
      Assassin: [110, 60, 26, 9], Guardian: [160, 50, 18, 24], Arcanist: [120, 120, 20, 12],
    }
    const [hp, mp, attack, defense] = stats[this.player.classType]
    Object.assign(this.player, { hp, maxHp: hp, mp, maxMp: mp, attack, defense })
  }

  protected setPlayerIdentity(name: string, race: Race, classType: ClassType): void {
    Object.assign(this.player, { name, race, classType })
    this.updatePlayerStats()
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
  }
}
