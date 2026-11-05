import { GameApp } from './AppV2'
import { CombatSession, type CombatAction, type CombatMonster, type CombatPlayer, type CombatSkill, type CombatGear } from './systems/combat-engine'
import { applyDeathPenalty } from './systems/realm-progression'
import { createMonsterCombatant, getCombatProfile, NAMED_NPC_PROFILES, PLAYER_SKILLS } from './systems/combat-profiles'
import type { Monster, Screen } from './types'

export class CombatGameApp extends GameApp {
  private encounter: CombatSession | null = null
  private encounterMonsterId: string | null = null
  private encounterLocked = false
  private encounterFinished = false
  private bossPhase = 0
  private encounterKind: 'monster'|'named-npc' = 'monster'
  private combatLog: string[] = []
  private rewardDialogOpen = false

  protected renderDungeon(): void { this.renderCombatEncounter(false) }
  protected renderBoss(): void { this.renderCombatEncounter(true) }

  /** Public hook for a future NPC dialogue/duel interaction. It reuses the same battle engine and UI. */
  beginNamedNpcEncounter(profileId: string): void {
    const profile = NAMED_NPC_PROFILES.find((item) => item.id === profileId)
    if (!profile) { this.addChatMessage('That character is not available for a duel.', 'system'); return }
    const source: Monster = { id:profile.id,name:profile.name,hp:120,maxHp:120,attack:18,defense:10,level:Math.max(1,(this.player as any).level),drops:[] }
    this.currentMonster = source
    this.currentDungeon = { id:`npc-${profile.id}`,name:`Encounter: ${profile.name}`,type:'castle',level:source.level,monsters:[source],boss:null,reward:0,completed:false } as any
    this.encounterKind='named-npc'
    this.cleanupEncounter()
    this.setScreen('dungeon')
  }

  private renderCombatEncounter(isBoss: boolean): void {
    if (!this.currentDungeon || !this.currentMonster) { this.setScreen('game'); return }
    const player = this.player as any, source = this.currentMonster as Monster
    this.ensureEncounter(player,source,isBoss)
    const snapshot=this.encounter!.getSnapshot(), combatPlayer=snapshot.player
    const shell=document.createElement('main'); shell.className=`combat-shell ${isBoss?'combat-boss':''}`
    const skills=(combatPlayer.skills||[]).map((skill) => {
      const readyAt=combatPlayer.skillReadyAt?.[skill.id]||0, remaining=Math.max(0,readyAt-snapshot.turn-1)
      const disabled=this.encounterLocked||this.encounterFinished||remaining>0||combatPlayer.mp<skill.manaCost
      return `<button type="button" class="combat-action skill-action" data-skill="${this.escapeCombatText(skill.id)}" ${disabled?'disabled':''}>
        <span>${this.escapeCombatText(skill.name)}</span><small>${remaining?`Cooldown · ${remaining} turn(s)`: `MP ${skill.manaCost} · CD ${skill.cooldownTurns||0}`}</small></button>`
    }).join('')
    const phase=isBoss?` · Phase ${Math.max(1,this.bossPhase)}`:''
    shell.innerHTML=`
      <header class="combat-header"><div><p class="combat-eyebrow">${this.encounterKind==='named-npc'?'NAMED CHARACTER DUEL':isBoss?'BOSS ENCOUNTER':'DUNGEON ENCOUNTER'}${phase}</p>
      <h1>${this.escapeCombatText(source.name)}</h1><p>${this.escapeCombatText(this.currentDungeon.name)} · Turn ${snapshot.turn+1}</p></div>
      <button type="button" class="combat-back" data-action="run">Run</button></header>
      <section class="combat-arena" aria-label="Battle status">
        <article class="combatant-card player-card"><div class="combat-avatar" aria-hidden="true">◆</div><h2>${this.escapeCombatText(player.name)}</h2><p>Level ${player.level}</p>
          <div class="combat-meter-label"><span>Health</span><span>${snapshot.player.hp} / ${snapshot.player.maxHp}</span></div><div class="combat-meter"><span class="player-health" style="width:${this.percent(snapshot.player.hp,snapshot.player.maxHp)}%"></span></div>
          <div class="combat-meter-label"><span>Mana</span><span>${snapshot.player.mp} / ${snapshot.player.maxMp}</span></div><div class="combat-meter"><span class="player-mana" style="width:${this.percent(snapshot.player.mp,snapshot.player.maxMp)}%"></span></div></article>
        <div class="combat-divider" aria-hidden="true">VS</div>
        <article class="combatant-card monster-card"><div class="combat-avatar monster-avatar" aria-hidden="true">${isBoss?'♜':this.encounterKind==='named-npc'?'✦':'M'}</div><h2>${this.escapeCombatText(source.name)}</h2>
          <p>Level ${snapshot.monster.level}${isBoss?` · Phase ${this.bossPhase}`:''}</p>
          <div class="combat-meter-label"><span>Health</span><span>${snapshot.monster.hp} / ${snapshot.monster.maxHp}</span></div><div class="combat-meter"><span class="monster-health" style="width:${this.percent(snapshot.monster.hp,snapshot.monster.maxHp)}%"></span></div>
          ${isBoss?'<p class="boss-warning">The boss changes tactics as its health falls.</p>':''}</article>
      </section>
      <section class="combat-equipment"><strong>Equipped:</strong> ${this.equipmentSummary(player)}</section>
      <section class="combat-controls" aria-label="Combat actions"><button type="button" class="combat-action primary" data-action="attack">Attack</button>${skills}
        <button type="button" class="combat-action" data-action="defend">Defend</button><button type="button" class="combat-action danger" data-action="run">Run away</button></section>
      <section class="combat-log" aria-live="polite" aria-label="Battle log"><h2>Battle log</h2><ol>${this.combatLog.slice(-8).map((line)=>`<li>${this.escapeCombatText(line)}</li>`).join('')||'<li>The encounter begins. Choose your action.</li>'}</ol></section>`
    this.root.replaceChildren(shell)
    shell.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button)=>button.addEventListener('click',()=>{
      if(button.dataset.action==='attack')this.performAction({type:'attack'})
      else if(button.dataset.action==='defend')this.performAction({type:'defend'})
      else if(button.dataset.action==='run')this.performAction({type:'run'})
    }))
    shell.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach((button)=>button.addEventListener('click',()=>this.performAction({type:'skill',skillId:button.dataset.skill!})))
  }

  private ensureEncounter(player: any, source: Monster, isBoss: boolean): void {
    if(this.encounter&&this.encounterMonsterId===source.id)return
    this.encounterMonsterId=source.id;this.encounterFinished=false;this.encounterLocked=false;this.bossPhase=isBoss?1:0
    const converted=this.toCombatPlayer(player), enemy=this.encounterKind==='named-npc'?this.toNamedNpc(source):this.toCombatMonster(source,isBoss,this.bossPhase)
    this.combatLog=[`${source.name} enters the encounter.`];this.encounter=new CombatSession(converted,enemy)
  }

  private toCombatPlayer(player:any):CombatPlayer {
    const classSkills:readonly CombatSkill[]=PLAYER_SKILLS[String(player.classType)]||PLAYER_SKILLS.Mage
    const gear=this.readGear(player)
    const weapon=gear.find((item)=>item.attack)
    return {id:String(player.id||'hero'),name:String(player.name||'Adventurer'),level:this.safeStat(player.level,1),hp:this.safeStat(player.hp,1),maxHp:this.safeStat(player.maxHp,1),
      mp:this.safeStat(player.mp,0),maxMp:this.safeStat(player.maxMp,0),attack:this.safeStat(player.attack,1),defense:this.safeStat(player.defense,0),gear,
      weapon:weapon?{name:weapon.name,attack:weapon.attack||0,skillPower:weapon.skillPower||0}:null,skills:classSkills.map((skill)=>({...skill}))}
  }
  private readGear(player:any):CombatGear[] {
    const source=Array.isArray(player.equipment)?player.equipment:Array.isArray(player.equippedGear)?player.equippedGear:[]
    return source.filter((item:any)=>item&&typeof item==='object').map((item:any)=>({id:String(item.id||''),name:String(item.name||'Equipped gear'),attack:this.safeStat(item.attack??item.stats?.attack,0),defense:this.safeStat(item.defense??item.stats?.defense,0),skillPower:this.safeStat(item.skillPower??item.stats?.skillPower,0),protectedFromDeathLoss:!!item.protectedFromDeathLoss,bound:!!item.bound}))
  }
  private toCombatMonster(source:Monster,isBoss:boolean,phase:number):CombatMonster {
    const enemy=createMonsterCombatant({id:source.id,name:source.name,level:source.level,hp:source.hp,maxHp:source.maxHp,attack:source.attack,defense:source.defense},isBoss)
    if(isBoss&&phase>1)enemy.attack=Math.floor(enemy.attack*(1+(phase-1)*.12))
    return enemy
  }
  private toNamedNpc(source:Monster):CombatMonster {
    const profile=getCombatProfile(source.name,'named-npc')
    return {id:source.id,name:source.name,level:source.level,hp:source.hp,maxHp:source.maxHp,mp:80,maxMp:80,attack:source.attack,defense:source.defense,skills:[...profile.skills],fleeChance:0}
  }

  private performAction(action:CombatAction):void {
    if(!this.encounter||!this.currentMonster||this.encounterLocked||this.encounterFinished)return
    this.encounterLocked=true
    try {
      const isBoss=(this.screen as Screen)==='boss', resolved=this.encounter.takeTurn(action,{monsterSkillChance:isBoss?.34:.22})
      if(resolved.outcome==='invalid') { this.combatLog.push(...resolved.events.map((e)=>e.text));this.renderCombatEncounter(isBoss);return }
      const player=this.player as any;player.hp=resolved.player.hp;player.mp=resolved.player.mp
      if(Array.isArray(player.equipment)){player.equipment=resolved.player.gear||player.equipment}
      this.currentMonster.hp=resolved.monster.hp;this.currentMonster.maxHp=resolved.monster.maxHp;this.currentMonster.attack=resolved.monster.attack;this.currentMonster.defense=resolved.monster.defense
      this.combatLog.push(...resolved.events.map((e)=>e.text))
      if(isBoss&&resolved.outcome==='ongoing')this.updateBossPhase(resolved.monster)
      if(resolved.outcome==='victory'){this.encounterFinished=true;this.renderCombatEncounter(isBoss);window.setTimeout(()=>this.resolveVictory(isBoss),450);return}
      if(resolved.outcome==='defeat'){this.encounterFinished=true;this.resolveDeath();return}
      if(resolved.outcome==='escaped'||resolved.outcome==='monster-fled'){
        this.encounterFinished=true;this.combatLog.push(resolved.outcome==='escaped'?'You escaped. No kill reward was granted.':`${this.currentMonster.name} fled. No kill reward was granted.`)
        this.showRewardPopup('Encounter ended',resolved.outcome==='escaped'?'You escaped safely. No defeat rewards were granted.':`${this.currentMonster.name} fled; the encounter ended without a kill reward.`,()=>this.exitEncounter());return
      }
      this.renderCombatEncounter(isBoss)
    } catch(error) {
      console.error('Encounter recovered from action error:',error);this.combatLog.push('That action failed safely; battle state was preserved.');this.renderCombatEncounter((this.screen as Screen)==='boss')
    } finally {this.encounterLocked=false}
  }

  private updateBossPhase(monster:CombatMonster):void {
    const ratio=monster.hp/Math.max(1,monster.maxHp),next=ratio<=.33?3:ratio<=.66?2:1
    if(next<=this.bossPhase)return
    this.bossPhase=next;this.combatLog.push(next===2?`${monster.name} enters phase two and unlocks a new ability!`:`${monster.name} enters its final phase!`)
    const playerSnapshot=this.encounter!.getSnapshot().player, nextMonster=this.toCombatMonster(this.currentMonster!,true,next)
    nextMonster.hp=monster.hp;nextMonster.mp=monster.mp;nextMonster.skillReadyAt=monster.skillReadyAt
    // Keep player cooldowns and turn count across phase transition by resuming with snapshot state.
    this.encounter=new CombatSession(playerSnapshot,nextMonster)
  }
  private resolveVictory(isBoss:boolean):void {
    if(!this.currentMonster||!this.currentDungeon)return
    const name=this.currentMonster.name,player=this.player as any,beforeGold=player.gold,beforeXp=player.experience,beforeItems=Array.isArray(player.inventory)?player.inventory.length:0
    this.cleanupEncounter()
    if(this.encounterKind==='named-npc'){
      player.experience=(player.experience||0)+this.currentMonster.level*15;player.gold=(player.gold||0)+this.currentMonster.level*10
      const text=`${name} was defeated. +${this.currentMonster.level*15} experience · +${this.currentMonster.level*10} gold.`
      this.showRewardPopup('Duel victory',text,()=>{this.currentDungeon=null;this.currentMonster=null;this.encounterKind='monster';this.setScreen('game')});return
    }
    if(isBoss)(this as any).defeatBoss();else (this as any).defeatMonster()
    window.setTimeout(()=>{
      const gainedGold=Math.max(0,(player.gold||0)-beforeGold),gainedXp=Math.max(0,(player.experience||0)-beforeXp),items=Math.max(0,(player.inventory?.length||0)-beforeItems)
      this.showRewardPopup(isBoss?'Boss defeated':'Victory',`${name} defeated · +${gainedGold} gold · +${gainedXp} XP · ${items} item(s) added.`,()=>{})
    },0)
  }
  private resolveDeath():void {
    const player=this.player as any, equipment=this.readGear(player)
    const penalty=applyDeathPenalty({level:this.safeStat(player.level,1),experience:this.safeStat(player.experience,0),equipment,gold:this.safeStat(player.gold,0)})
    player.level=penalty.levelAfter;player.experience=penalty.experienceAfter;player.gold=penalty.goldAfter;player.hp=Math.max(1,Math.ceil(this.safeStat(player.maxHp,1)*.5))
    if(penalty.recoveredEquipment){player.deathCache=[...(player.deathCache||[]),penalty.recoveredEquipment];player.equipment=(player.equipment||[]).filter((item:any)=>item.id!==penalty.recoveredEquipment!.id)}
    this.cleanupEncounter();this.showRewardPopup('Defeated',penalty.message,()=>this.exitEncounter())
  }
  private exitEncounter():void {this.dungeonSystem.exitDungeon();this.currentDungeon=null;this.currentMonster=null;this.encounterKind='monster';this.cleanupEncounter();this.setScreen('game')}
  private showRewardPopup(title:string,message:string,onClose:()=>void):void {
    if(this.rewardDialogOpen)return;this.rewardDialogOpen=true
    const overlay=document.createElement('div');overlay.className='reward-overlay';overlay.innerHTML=`<section class="reward-dialog" role="dialog" aria-modal="true" aria-labelledby="reward-title"><p class="combat-eyebrow">AETHORIA · REALM UPDATE</p><h2 id="reward-title">${this.escapeCombatText(title)}</h2><p>${this.escapeCombatText(message)}</p><button class="combat-action primary" type="button" data-close>Continue</button></section>`
    this.root.appendChild(overlay);overlay.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click',()=>{overlay.remove();this.rewardDialogOpen=false;onClose()})
  }
  private cleanupEncounter():void {this.encounter=null;this.encounterMonsterId=null;this.encounterFinished=true;this.encounterLocked=false;this.bossPhase=0}
  private equipmentSummary(player:any):string {const gear=this.readGear(player);return gear.length?gear.map((item)=>`${this.escapeCombatText(item.name)} (ATK +${item.attack||0}, DEF +${item.defense||0})`).join(' · '):'No stat-bearing equipment equipped'}
  private percent(value:number,max:number):number{return Math.max(0,Math.min(100,this.safeStat(value,0)/Math.max(1,this.safeStat(max,1))*100))}
  private safeStat(value:unknown,fallback:number):number{return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1_000_000,value)):fallback}
  private escapeCombatText(value:string):string{return value.replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
}
