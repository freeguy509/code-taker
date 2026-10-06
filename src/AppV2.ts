import { App as AppV1 } from './App'
import { DungeonSystem } from './dungeon-system'
import { QuestSystem } from './quest-system'
import { MultiplayerConnection } from './multiplayer'
import { Player, Screen, Quest, Dungeon, Monster } from './types'

export class GameApp extends AppV1 {
  protected dungeonSystem: DungeonSystem
  protected questSystem: QuestSystem
  protected multiplayer: MultiplayerConnection | null = null
  protected currentDungeon: Dungeon | null = null
  protected currentMonster: Monster | null = null
  protected dungeonHP: number = 0
  protected dungeonMaxHP: number = 0
  protected onlinePlayer: any = null

  constructor(root: HTMLElement) {
    super(root)
    this.dungeonSystem = new DungeonSystem()
    this.questSystem = new QuestSystem()
    this.setupMultiplayer()
  }

  private setupMultiplayer(): void {
    this.multiplayer = new MultiplayerConnection()
    this.multiplayer.onConnect(() => {
      console.log('Connected to multiplayer')
      this.addChatMessage('Connected to world server', 'system')
    })
    this.multiplayer.onDisconnect(() => {
      console.log('Disconnected from multiplayer')
      this.addChatMessage('Disconnected from server', 'system')
    })

    this.multiplayer.on('chat', (message: any) => {
      if (message.sender !== this.multiplayer?.getPlayerId()) {
        this.addChatMessage(`${message.sender}: ${message.text}`, 'player')
      }
    })
  }

  protected addChatMessage(text: string, type: 'system' | 'player' | 'event'): void {
    const el = this.root.querySelector('.chat-body')
    if (el) {
      const p = document.createElement('p')
      const label = type === 'system' ? 'System' : type === 'event' ? 'Quest' : 'Player'
      p.innerHTML = `<strong>${label}:</strong> ${text}`
      el.appendChild(p)
      el.scrollTop = el.scrollHeight
    }
  }

  protected setScreen(screen: Screen): void {
    ;(this as any).screen = screen
    this.render()
  }

  protected render(): void {
    const screen = (this as any).screen
    this.root.innerHTML = ''

    if (screen === 'home') {
      this.renderHome()
      return
    }

    if (screen === 'character') {
      this.renderCharacter()
      return
    }

    if (screen === 'world') {
      this.renderWorld()
      return
    }

    if (screen === 'game') {
      this.renderGame()
      return
    }

    if (screen === 'dungeon') {
      this.renderDungeon()
      return
    }

    if (screen === 'boss') {
      this.renderBoss()
      return
    }
  }

  protected renderHome(): void {
    const panel = (this as any).makePanel('AETHORIA', 'Eternal Realms • Browser MMORPG')
    const actions = (this as any).makeActions([
      { label: 'Create Character', onClick: () => this.setScreen('character') },
      { label: 'Login', onClick: () => this.setScreen('character') },
    ])
    panel.appendChild(actions)
    this.root.appendChild(panel)
  }

  protected renderCharacter(): void {
    const player = (this as any).player
    const panel = (this as any).makePanel('CHARACTER', 'Create your story')
    const nameField = (this as any).makeInput('Character Name', player.name, (value: string) => {
      player.name = value
    })
    const raceWrap = (this as any).makeChoiceGroup(
      'Race',
      ['Elf', 'Demon', 'Beastman', 'Human', 'Dwarf', 'Angel', 'Dragon'],
      player.race,
      (value: string) => {
        player.race = value
      }
    )
    const classWrap = (this as any).makeChoiceGroup(
      'Class',
      ['Mage', 'Warrior', 'Ranger', 'Assassin', 'Guardian', 'Arcanist'],
      player.classType,
      (value: string) => {
        player.classType = value
        ;(this as any).updatePlayerStats()
        this.render()
      }
    )
    const stats = document.createElement('div')
    stats.className = 'stats-box'
    stats.innerHTML = `
      <p>Level: ${player.level}</p>
      <p>HP: ${player.hp}</p>
      <p>MP: ${player.mp}</p>
      <p>Attack: ${player.attack}</p>
      <p>Defense: ${player.defense}</p>
    `
    const actions = (this as any).makeActions([
      { label: 'Continue to World', onClick: () => this.setScreen('world') },
      { label: 'Back', onClick: () => this.setScreen('home') },
    ])
    panel.appendChild(nameField)
    panel.appendChild(raceWrap)
    panel.appendChild(classWrap)
    panel.appendChild(stats)
    panel.appendChild(actions)
    this.root.appendChild(panel)
  }

  protected renderWorld(): void {
    const player = (this as any).player
    const panel = (this as any).makePanel('WORLD', 'Choose a region')
    const regionGrid = document.createElement('div')
    regionGrid.className = 'region-grid'
    const regions = ['Eldrin Reach', 'Stoneheart', 'Ironhaven', 'Shadow Coast']
    regions.forEach((region) => {
      const button = document.createElement('button')
      button.className = 'region-card'
      if (player.region === region) button.classList.add('active')
      button.textContent = region
      button.addEventListener('click', () => {
        player.region = region
        this.render()
      })
      regionGrid.appendChild(button)
    })
    const summary = document.createElement('div')
    summary.className = 'summary-box'
    summary.innerHTML = `
      <p>Player: ${player.name}</p>
      <p>Race: ${player.race}</p>
      <p>Class: ${player.classType}</p>
      <p>Region: ${player.region}</p>
    `
    const actions = (this as any).makeActions([
      { label: 'Enter World', onClick: () => this.enterWorld() },
      { label: 'Back', onClick: () => this.setScreen('character') },
    ])
    panel.appendChild(regionGrid)
    panel.appendChild(summary)
    panel.appendChild(actions)
    this.root.appendChild(panel)
  }

  private enterWorld(): void {
    if (this.multiplayer) {
      this.multiplayer.connect().catch((err) => {
        console.error('Failed to connect:', err)
        this.addChatMessage('Failed to connect to server', 'system')
      })
    }
    this.setScreen('game')
  }

  protected renderGame(): void {
    const player = (this as any).player
    const dungeons = this.dungeonSystem.getDungeons()
    const shell = document.createElement('div')
    shell.className = 'game-shell'

    const hud = document.createElement('div')
    hud.className = 'hud'

    const playerStats = document.createElement('div')
    playerStats.className = 'hud-panel'
    playerStats.innerHTML = `
      <div class="player-name">${player.name}</div>
      <div class="stats-row">
        <span>Lv ${player.level}</span>
        <span>HP ${player.hp}/${player.maxHp}</span>
        <span>MP ${player.mp}</span>
        <span>Gold: ${player.gold}</span>
      </div>
    `

    const activeQuest = this.questSystem.getActiveQuest()
    const quest = document.createElement('div')
    quest.className = 'hud-panel'
    quest.innerHTML = `
      <div class="quest-title">Quest</div>
      <div class="quest-text">${activeQuest?.title || 'No active quest'}</div>
      ${activeQuest ? `<div class="quest-progress">${activeQuest.current}/${activeQuest.target}</div>` : ''}
    `

    hud.appendChild(playerStats)
    hud.appendChild(quest)

    const worldMap = document.createElement('div')
    worldMap.className = 'world-map'

    const playerToken = document.createElement('div')
    playerToken.className = 'player-token'
    playerToken.textContent = '◆'

    worldMap.appendChild(playerToken)

    dungeons.forEach((dungeon, index) => {
      const marker = document.createElement('div')
      marker.className = `marker ${dungeon.completed ? 'completed' : ''}`
      marker.innerHTML = `
        <div class="marker-content">
          <div class="marker-title">${dungeon.name}</div>
          <div class="marker-level">Lv ${dungeon.level}</div>
        </div>
      `
      marker.style.left = `${20 + index * 25}%`
      marker.style.top = `${20 + (index % 2) * 40}%`
      marker.style.cursor = 'pointer'
      marker.addEventListener('click', () => this.enterDungeon(dungeon))
      worldMap.appendChild(marker)
    })

    const chat = document.createElement('div')
    chat.className = 'chat'
    chat.innerHTML = `
      <div class="chat-header">World Chat</div>
      <div class="chat-body"></div>
      <div class="chat-input">
        <input type="text" placeholder="Type to chat..." />
        <button>Send</button>
      </div>
    `

    const chatInput = chat.querySelector('input') as HTMLInputElement
    const chatButton = chat.querySelector('button') as HTMLButtonElement

    chatButton.addEventListener('click', () => {
      if (chatInput.value.trim() && this.multiplayer) {
        this.multiplayer.sendChat(chatInput.value)
        this.addChatMessage(`You: ${chatInput.value}`, 'player')
        chatInput.value = ''
      }
    })

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        chatButton.click()
      }
    })

    const inventory = document.createElement('div')
    inventory.className = 'inventory'
    inventory.innerHTML = `
      <h3>Inventory (${player.inventory.length})</h3>
      <div class="item-grid">${player.inventory.map((item) => `<div class="item">${item}</div>`).join('')}</div>
    `

    shell.appendChild(hud)
    shell.appendChild(worldMap)
    shell.appendChild(chat)
    shell.appendChild(inventory)
    this.root.appendChild(shell)
  }

  private enterDungeon(dungeon: Dungeon): void {
    const entered = this.dungeonSystem.enterDungeon(dungeon.id)
    if (entered) {
      this.currentDungeon = entered
      this.currentMonster = this.dungeonSystem.getNextMonster()
      if (this.currentMonster) {
        this.dungeonHP = this.currentMonster.hp
        this.dungeonMaxHP = this.currentMonster.maxHp
      }
      this.addChatMessage(`Entered dungeon: ${dungeon.name}`, 'event')
      this.setScreen('dungeon')
    }
  }

  protected renderDungeon(): void {
    if (!this.currentDungeon || !this.currentMonster) {
      this.setScreen('game')
      return
    }

    const player = (this as any).player
    const shell = document.createElement('div')
    shell.className = 'dungeon-shell'

    const header = document.createElement('div')
    header.className = 'dungeon-header'
    header.innerHTML = `
      <h2>${this.currentDungeon.name}</h2>
      <p>Floor ${this.dungeonSystem.getCurrentFloor() + 1} / ${this.currentDungeon.monsters.length}</p>
    `

    const arena = document.createElement('div')
    arena.className = 'dungeon-arena'

    const playerDisplay = document.createElement('div')
    playerDisplay.className = 'arena-player'
    playerDisplay.innerHTML = `
      <div class="arena-char">◆</div>
      <div class="arena-hp">${player.hp}/${player.maxHp}</div>
    `

    const monsterDisplay = document.createElement('div')
    monsterDisplay.className = 'arena-enemy'
    monsterDisplay.innerHTML = `
      <div class="arena-char">M</div>
      <div class="arena-name">${this.currentMonster.name}</div>
      <div class="arena-hp">${this.dungeonHP}/${this.dungeonMaxHP}</div>
      <div class="arena-bar">
        <div class="hp-bar" style="width: ${(this.dungeonHP / this.dungeonMaxHP) * 100}%"></div>
      </div>
    `

    arena.appendChild(playerDisplay)
    arena.appendChild(monsterDisplay)

    const controls = document.createElement('div')
    controls.className = 'dungeon-controls'

    const attackBtn = document.createElement('button')
    attackBtn.textContent = 'ATTACK'
    attackBtn.addEventListener('click', () => this.attackMonster())

    const defendBtn = document.createElement('button')
    defendBtn.textContent = 'DEFEND'
    defendBtn.addEventListener('click', () => this.defendAgainstMonster())

    const fleeBtn = document.createElement('button')
    fleeBtn.textContent = 'FLEE'
    fleeBtn.addEventListener('click', () => {
      this.dungeonSystem.exitDungeon()
      this.setScreen('game')
    })

    controls.appendChild(attackBtn)
    controls.appendChild(defendBtn)
    controls.appendChild(fleeBtn)

    shell.appendChild(header)
    shell.appendChild(arena)
    shell.appendChild(controls)

    this.root.appendChild(shell)
  }

  private attackMonster(): void {
    if (!this.currentMonster || !this.currentDungeon) return

    const player = (this as any).player
    const damage = player.attack + Math.floor(Math.random() * 10)
    this.dungeonHP -= damage

    this.addChatMessage(`You attack for ${damage} damage!`, 'event')

    if (this.dungeonHP <= 0) {
      this.defeatMonster()
      return
    }

    setTimeout(() => {
      const monsterDamage = this.currentMonster!.attack + Math.floor(Math.random() * 5)
      player.hp -= monsterDamage
      this.addChatMessage(`${this.currentMonster!.name} attacks for ${monsterDamage} damage!`, 'event')

      if (player.hp <= 0) {
        this.addChatMessage('You have been defeated!', 'event')
        player.hp = player.maxHp
        this.dungeonSystem.exitDungeon()
        this.setScreen('game')
      } else {
        this.render()
      }
    }, 500)
  }

  private defendAgainstMonster(): void {
    if (!this.currentMonster) return
    const player = (this as any).player
    const reduction = player.defense * 2
    const monsterDamage = Math.max(1, this.currentMonster.attack - reduction)
    player.hp -= monsterDamage
    this.addChatMessage(`You defend! ${this.currentMonster.name} deals ${monsterDamage} damage.`, 'event')

    if (player.hp <= 0) {
      this.addChatMessage('You have been defeated!', 'event')
      player.hp = player.maxHp
      this.dungeonSystem.exitDungeon()
      this.setScreen('game')
    } else {
      this.render()
    }
  }

  private defeatMonster(): void {
    if (!this.currentMonster || !this.currentDungeon) return

    const player = (this as any).player
    const reward = this.currentMonster.level * 20
    player.gold += reward
    player.experience += reward

    const drops = this.currentMonster.drops
    drops.forEach((item) => {
      if (Math.random() > 0.3) {
        player.inventory.push(item)
      }
    })

    this.addChatMessage(
      `Defeated ${this.currentMonster.name}! Earned ${reward} gold and items.`,
      'event'
    )

    const isBossFloor = this.dungeonSystem.getCurrentFloor() >= this.currentDungeon.monsters.length
    if (isBossFloor && this.currentDungeon.boss) {
      this.currentMonster = this.currentDungeon.boss
      this.dungeonHP = this.currentMonster.hp
      this.dungeonMaxHP = this.currentMonster.maxHp
      this.setScreen('boss')
    } else {
      this.dungeonSystem.defeatMonster()
      this.currentMonster = this.dungeonSystem.getNextMonster()
      if (this.currentMonster) {
        this.dungeonHP = this.currentMonster.hp
        this.dungeonMaxHP = this.currentMonster.maxHp
        this.render()
      }
    }
  }

  protected renderBoss(): void {
    if (!this.currentMonster || !this.currentDungeon) {
      this.setScreen('game')
      return
    }

    const player = (this as any).player
    const shell = document.createElement('div')
    shell.className = 'boss-shell'

    const header = document.createElement('div')
    header.className = 'boss-header'
    header.innerHTML = `
      <h2 style="color: #ff6b6b; text-transform: uppercase;">${this.currentMonster.name}</h2>
      <p>BOSS ENCOUNTER</p>
    `

    const arena = document.createElement('div')
    arena.className = 'boss-arena'

    const playerDisplay = document.createElement('div')
    playerDisplay.className = 'arena-player'
    playerDisplay.innerHTML = `
      <div class="arena-char">◆</div>
      <div class="arena-hp">${player.hp}/${player.maxHp}</div>
    `

    const bossDisplay = document.createElement('div')
    bossDisplay.className = 'arena-boss'
    bossDisplay.innerHTML = `
      <div class="arena-char" style="font-size: 48px; color: #ff5555;">⚔</div>
      <div class="arena-name" style="color: #ff6b6b;">${this.currentMonster.name}</div>
      <div class="arena-hp">${this.dungeonHP}/${this.dungeonMaxHP}</div>
      <div class="arena-bar">
        <div class="boss-hp-bar" style="width: ${(this.dungeonHP / this.dungeonMaxHP) * 100}%"></div>
      </div>
    `

    arena.appendChild(playerDisplay)
    arena.appendChild(bossDisplay)

    const controls = document.createElement('div')
    controls.className = 'boss-controls'

    const attackBtn = document.createElement('button')
    attackBtn.textContent = 'POWER ATTACK'
    attackBtn.addEventListener('click', () => this.bossPowerAttack())

    const defendBtn = document.createElement('button')
    defendBtn.textContent = 'DEFEND'
    defendBtn.addEventListener('click', () => this.defendAgainstBoss())

    const spellBtn = document.createElement('button')
    spellBtn.textContent = 'SPELL'
    spellBtn.addEventListener('click', () => this.castBossSpell())

    controls.appendChild(attackBtn)
    controls.appendChild(defendBtn)
    controls.appendChild(spellBtn)

    shell.appendChild(header)
    shell.appendChild(arena)
    shell.appendChild(controls)

    this.root.appendChild(shell)
  }

  private bossPowerAttack(): void {
    if (!this.currentMonster) return
    const player = (this as any).player
    const damage = player.attack * 2 + Math.floor(Math.random() * 20)
    this.dungeonHP -= damage

    this.addChatMessage(`POWER ATTACK! ${damage} damage!`, 'event')

    if (this.dungeonHP <= 0) {
      this.defeatBoss()
      return
    }

    setTimeout(() => {
      const bossDamage = this.currentMonster!.attack + Math.floor(Math.random() * 15)
      player.hp -= bossDamage
      this.addChatMessage(`${this.currentMonster!.name} retaliates for ${bossDamage} damage!`, 'event')

      if (player.hp <= 0) {
        this.addChatMessage('You have been defeated by the boss!', 'event')
        player.hp = player.maxHp
        this.dungeonSystem.exitDungeon()
        this.setScreen('game')
      } else {
        this.render()
      }
    }, 800)
  }

  private defendAgainstBoss(): void {
    if (!this.currentMonster) return
    const player = (this as any).player
    const reduction = player.defense * 3
    const bossDamage = Math.max(1, this.currentMonster.attack - reduction)
    player.hp -= bossDamage
    this.addChatMessage(`You brace for impact! Boss deals ${bossDamage} damage.`, 'event')

    if (player.hp <= 0) {
      this.addChatMessage('You have been defeated!', 'event')
      player.hp = player.maxHp
      this.dungeonSystem.exitDungeon()
      this.setScreen('game')
    } else {
      this.render()
    }
  }

  private castBossSpell(): void {
    if (!this.currentMonster) return
    const player = (this as any).player
    const damage = player.mp + Math.floor(Math.random() * 25)
    this.dungeonHP -= damage

    this.addChatMessage(`Spell cast! ${damage} damage!`, 'event')

    if (this.dungeonHP <= 0) {
      this.defeatBoss()
      return
    }

    setTimeout(() => {
      const bossDamage = this.currentMonster!.attack + Math.floor(Math.random() * 10)
      player.hp -= bossDamage
      this.addChatMessage(`${this.currentMonster!.name} counterattacks for ${bossDamage} damage!`, 'event')

      if (player.hp <= 0) {
        this.addChatMessage('You have been defeated!', 'event')
        player.hp = player.maxHp
        this.dungeonSystem.exitDungeon()
        this.setScreen('game')
      } else {
        this.render()
      }
    }, 600)
  }

  private defeatBoss(): void {
    if (!this.currentMonster || !this.currentDungeon) return

    const player = (this as any).player
    const reward = this.currentMonster.level * 100
    player.gold += reward
    player.level += 1
    player.maxHp += 20
    player.hp = player.maxHp
    player.attack += 5

    const drops = this.currentMonster.drops
    drops.forEach((item) => {
      player.inventory.push(item)
    })

    this.dungeonSystem.defeatBoss()
    this.addChatMessage(
      `YOU DEFEATED ${this.currentMonster.name}! Level up to ${player.level}! Earned ${reward} gold!`,
      'event'
    )

    this.questSystem.updateQuestProgress('quest-4', 1)
    const isQuestComplete = this.questSystem.getActiveQuest()?.completed
    if (isQuestComplete) {
      const reward = this.questSystem.completeQuest('quest-4')
      player.gold += reward
      this.addChatMessage(`Quest complete! Earned ${reward} gold!`, 'event')
    }

    this.dungeonSystem.exitDungeon()
    this.currentDungeon = null
    this.currentMonster = null

    setTimeout(() => {
      this.setScreen('game')
    }, 2000)
  }
}
