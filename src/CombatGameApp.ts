/* NPC Duel directory and visual/race/culture showcase layered onto existing world screen. */
import { GameApp } from './AppV2'
import { CombatSession, type CombatAction, type CombatMonster, type CombatPlayer, type CombatSkill, type CombatGear } from './systems/combat-engine'
import { applyDeathPenalty } from './systems/realm-progression'
import { createMonsterCombatant, getCombatProfile, NAMED_NPC_PROFILES, PLAYER_SKILLS } from './systems/combat-profiles'
import { KINGDOM_IDENTITIES, POWER_DISCIPLINES, RACE_TECH_AFFINITIES, equipmentTotals } from './content/kingdom-technology'
import type { EquipmentItem, EquipmentSlot, Monster, Screen } from './types'

export class CombatGameApp extends GameApp {
  private encounter: CombatSession|null=null; private encounterMonsterId:string|null=null; private encounterLocked=false; private encounterFinished=false
  private bossPhase=0; private encounterKind:'monster'|'named-npc'='monster'; private combatLog:string[]=[]; private rewardDialogOpen=false
  protected renderDungeon():void{this.renderCombatEncounter(false)}
  protected renderBoss():void{this.renderCombatEncounter(true)}

  /** Adds clickable named NPCs to the existing game world without replacing its map, chat, or inventory. */
  protected renderGame():void {
    super.renderGame()
    const shell=this.root.querySelector<HTMLElement>('.game-shell'); if(!shell)return
    const lore=document.createElement('section');lore.className='realm-directory'
    lore.innerHTML=`<div class="realm-directory-heading"><div><p class="combat-eyebrow">AETHORIA · CULTURES & CRAFT</p><h2>Kingdoms of the Living Realm</h2></div></div>
      <div class="kingdom-grid">${KINGDOM_IDENTITIES.map((kingdom)=>`<article class="kingdom-card"><h3>${this.escapeCombatText(kingdom.name)}</h3><p>${this.escapeCombatText(kingdom.visual)}</p><small>${kingdom.technologies.join(' · ')}</small><p>${this.escapeCombatText(kingdom.lore)}</p></article>`).join('')}</div>
      <div class="power-strip"><strong>Five disciplines:</strong> ${POWER_DISCIPLINES.map((power)=>`<span title="${this.escapeCombatText(power.use)}">${this.escapeCombatText(power.name)}</span>`).join('')}</div>
      <h2>Meet the named characters</h2><p class="realm-note">These are optional practice duels, not mandatory story outcomes.</p>
      <div class="npc-duel-grid">${NAMED_NPC_PROFILES.map((npc)=>`<button type="button" class="npc-duel-card" data-npc="${this.escapeCombatText(npc.id)}"><strong>${this.escapeCombatText(npc.name)}</strong><span>${npc.skills.map((skill)=>this.escapeCombatText(skill.name)).join(' · ')}</span><small>Begin practice duel</small></button>`).join('')}</div>`
    shell.appendChild(lore)
    lore.querySelectorAll<HTMLButtonElement>('[data-npc]').forEach((button)=>button.addEventListener('click',()=>this.beginNamedNpcEncounter(button.dataset.npc!)))
  }

  beginNamedNpcEncounter(profileId:string):void {
    const profile=NAMED_NPC_PROFILES.find((item)=>item.id===profileId)
    if(!profile){this.addChatMessage('That character is not available for a duel.','system');return}
    const level=Math.max(1,(this.player as any).level||1)
    const source:Monster={id:profile.id,name:profile.name,hp:120+level*12,maxHp:120+level*12,attack:18+level*2,defense:10+level,level,drops:[]}
    this.currentMonster=source;this.currentDungeon={id:`npc-${profile.id}`,name:`Practice duel · ${profile.name}`,type:'castle',level,monsters:[source],boss:null,reward:0,completed:false}
    this.encounterKind='named-npc';this.cleanupEncounter();this.setScreen('dungeon')
  }

  private renderCombatEncounter(isBoss:boolean):void {
    if(!this.currentDungeon||!this.currentMonster){this.setScreen('game');return}
    const player=this.player as any,source=this.currentMonster;this.ensureEncounter(player,source,isBoss)
    const snapshot=this.encounter!.getSnapshot(),fighter=snapshot.player
    const skills=(fighter.skills||[]).map((skill)=>{const remaining=Math.max(0,(fighter.skillReadyAt?.[skill.id]||0)-snapshot.turn-1),disabled=this.encounterLocked||this.encounterFinished||remaining>0||fighter.mp<skill.manaCost
      return `<button type="button" class="combat-action skill-action" data-skill="${this.escapeCombatText(skill.id)}" ${disabled?'disabled':''}><span>${this.escapeCombatText(skill.name)}</span><small>${remaining?`Cooldown · ${remaining} turn(s)`:`MP ${skill.manaCost} · CD ${skill.cooldownTurns||0}`}</small></button>`}).join('')
    const meters=this.renderPowerMeters(player)
    const shell=document.createElement('main');shell.className=`combat-shell ${isBoss?'combat-boss':''}`
    shell.innerHTML=`<header class="combat-header"><div><p class="combat-eyebrow">${this.encounterKind==='named-npc'?'NAMED CHARACTER PRACTICE DUEL':isBoss?'BOSS ENCOUNTER':'DUNGEON ENCOUNTER'}${isBoss?` · Phase ${this.bossPhase}`:''}</p><h1>${this.escapeCombatText(source.name)}</h1><p>${this.escapeCombatText(this.currentDungeon.name)} · Turn ${snapshot.turn+1}</p></div><button class="combat-back" data-action="run">Run</button></header>
    <section class="combat-arena"><article class="combatant-card"><div class="combat-avatar">◆</div><h2>${this.escapeCombatText(player.name)}</h2><p>Level ${player.level}</p><div class="combat-meter-label"><span>Health</span><span>${fighter.hp}/${fighter.maxHp}</span></div><div class="combat-meter"><span class="player-health" style="width:${this.percent(fighter.hp,fighter.maxHp)}%"></span></div><div class="combat-meter-label"><span>Mana</span><span>${fighter.mp}/${fighter.maxMp}</span></div><div class="combat-meter"><span class="player-mana" style="width:${this.percent(fighter.mp,fighter.maxMp)}%"></span></div>${meters}</article><div class="combat-divider">VS</div><article class="combatant-card"><div class="combat-avatar monster-avatar">${isBoss?'♜':this.encounterKind==='named-npc'?'✦':'M'}</div><h2>${this.escapeCombatText(source.name)}</h2><p>Level ${snapshot.monster.level}${isBoss?` · Phase ${this.bossPhase}`:''}</p><div class="combat-meter-label"><span>Health</span><span>${snapshot.monster.hp}/${snapshot.monster.maxHp}</span></div><div class="combat-meter"><span class="monster-health" style="width:${this.percent(snapshot.monster.hp,snapshot.monster.maxHp)}%"></span></div>${isBoss?'<p class="boss-warning">The boss changes tactics as health falls.</p>':''}</article></section>
    <section class="combat-equipment"><strong>Equipped:</strong> ${this.equipmentSummary(player)}</section><section class="combat-controls"><button class="combat-action primary" data-action="attack">Attack</button>${skills}<button class="combat-action" data-action="defend">Defend</button><button class="combat-action danger" data-action="run">Run away</button></section>
    <section class="combat-log" aria-live="polite"><h2>Battle log</h2><ol>${this.combatLog.slice(-8).map((line)=>`<li>${this.escapeCombatText(line)}</li>`).join('')||'<li>Choose an action.</li>'}</ol></section>`
    this.root.replaceChildren(shell)
    shell.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button)=>button.addEventListener('click',()=>{if(button.dataset.action==='attack')this.performAction({type:'attack'});else if(button.dataset.action==='defend')this.performAction({type:'defend'});else this.performAction({type:'run'})}))
    shell.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach((button)=>button.addEventListener('click',()=>this.performAction({type:'skill',skillId:button.dataset.skill!})))
  }
  private renderPowerMeters(player:any):string {const resources=player.resources;if(!resources)return ''
    return `<div class="other-power-meters">${(['aura','qi','energy','faith'] as const).map((key)=>`<div class="combat-meter-label"><span>${key.toUpperCase()}</span><span>${this.safeStat(resources[key],0)}/${this.safeStat(resources[`max${key[0].toUpperCase()+key.slice(1)}`],0)}</span></div><div class="combat-meter"><span class="power-meter-${key}" style="width:${this.percent(resources[key],resources[`max${key[0].toUpperCase()+key.slice(1)}`])}%"></span></div>`).join('')}</div>`}
  private ensureEncounter(player:any,source:Monster,isBoss:boolean):void {if(this.encounter&&this.encounterMonsterId===source.id)return
    this.encounterMonsterId=source.id;this.encounterFinished=false;this.encounterLocked=false;this.bossPhase=isBoss?1:0;this.combatLog=[`${source.name} enters the encounter.`]
    this.encounter=new CombatSession(this.toCombatPlayer(player),this.encounterKind==='named-npc'?this.toNamedNpc(source):this.toCombatMonster(source,isBoss,this.bossPhase))}
  private toCombatPlayer(player:any):CombatPlayer {const skills:readonly CombatSkill[]=PLAYER_SKILLS[String(player.classType)]||PLAYER_SKILLS.Mage,gear=this.readGear(player),weapon=player.equipment?.mainHand
    return {id:String(player.id||'hero'),name:String(player.name||'Adventurer'),level:this.safeStat(player.level,1),hp:this.safeStat(player.hp,1),maxHp:this.safeStat(player.maxHp,1),mp:this.safeStat(player.mp,0),maxMp:this.safeStat(player.maxMp,0),attack:this.safeStat(player.attack,1),defense:this.safeStat(player.defense,0),gear,weapon:weapon?{name:weapon.name,attack:weapon.attack||0,skillPower:weapon.skillPower||0}:null,skills:skills.map((item)=>({...item}))}}
  private readGear(player:any):CombatGear[]{const equipped=player.equipment&&typeof player.equipment==='object'&&!Array.isArray(player.equipment)?Object.values(player.equipment):Array.isArray(player.equipment)?player.equipment:Array.isArray(player.equippedGear)?player.equippedGear:[]
    return equipped.filter((item:any)=>item&&typeof item==='object').map((item:any)=>({id:String(item.id||''),name:String(item.name||'Equipped gear'),attack:this.safeStat(item.attack??item.stats?.attack,0),defense:this.safeStat(item.defense??item.stats?.defense,0),skillPower:this.safeStat(item.skillPower??item.stats?.skillPower,0),protectedFromDeathLoss:!!item.protectedFromDeathLoss,bound:!!item.bound}))}
  private toCombatMonster(source:Monster,isBoss:boolean,phase:number):CombatMonster {const enemy=createMonsterCombatant({id:source.id,name:source.name,level:source.level,hp:source.hp,maxHp:source.maxHp,attack:source.attack,defense:source.defense},isBoss);if(isBoss&&phase>1)enemy.attack=Math.floor(enemy.attack*(1+(phase-1)*.12));return enemy}
  private toNamedNpc(source:Monster):CombatMonster {const profile=getCombatProfile(source.name,'named-npc');return{id:source.id,name:source.name,level:source.level,hp:source.hp,maxHp:source.maxHp,mp:80,maxMp:80,attack:source.attack,defense:source.defense,skills:[...profile.skills],fleeChance:0}}
  private performAction(action:CombatAction):void {if(!this.encounter||!this.currentMonster||this.encounterLocked||this.encounterFinished)return;this.encounterLocked=true
    try{const boss=(this.screen as Screen)==='boss',turn=this.encounter.takeTurn(action,{monsterSkillChance:boss?.34:.22});if(turn.outcome==='invalid'){this.combatLog.push(...turn.events.map((e)=>e.text));this.renderCombatEncounter(boss);return}
      const player=this.player as any;player.hp=turn.player.hp;player.mp=turn.player.mp;this.currentMonster.hp=turn.monster.hp;this.currentMonster.maxHp=turn.monster.maxHp;this.combatLog.push(...turn.events.map((e)=>e.text))
      if(boss&&turn.outcome==='ongoing')this.updateBossPhase(turn.monster)
      if(turn.outcome==='victory'){this.encounterFinished=true;this.renderCombatEncounter(boss);window.setTimeout(()=>this.resolveVictory(boss),450);return}
      if(turn.outcome==='defeat'){this.encounterFinished=true;this.resolveDeath();return}
      if(turn.outcome==='escaped'||turn.outcome==='monster-fled'){this.encounterFinished=true;this.showRewardPopup('Encounter ended',turn.outcome==='escaped'?'You escaped safely. No kill reward was granted.':`${this.currentMonster.name} fled. No kill reward was granted.`,()=>this.exitEncounter());return}
      this.renderCombatEncounter(boss)
    }catch(error){console.error('Combat recovered from unexpected action failure:',error);this.combatLog.push('Action failed safely; battle state was preserved.');this.renderCombatEncounter((this.screen as Screen)==='boss')}finally{this.encounterLocked=false}}
  private updateBossPhase(monster:CombatMonster):void {const ratio=monster.hp/Math.max(1,monster.maxHp),next=ratio<=.33?3:ratio<=.66?2:1;if(next<=this.bossPhase)return;this.bossPhase=next;this.combatLog.push(`${monster.name} enters phase ${next} and changes tactics.`);const player=this.encounter!.getSnapshot().player,enemy=this.toCombatMonster(this.currentMonster!,true,next);enemy.hp=monster.hp;enemy.mp=monster.mp;enemy.skillReadyAt=monster.skillReadyAt;this.encounter=new CombatSession(player,enemy)}
  private resolveVictory(boss:boolean):void {if(!this.currentMonster||!this.currentDungeon)return;const name=this.currentMonster.name,player=this.player as any,beforeGold=player.gold||0,beforeXp=player.experience||0,beforeItems=player.inventory?.length||0;this.cleanupEncounter()
    if(this.encounterKind==='named-npc'){const xp=this.currentMonster.level*15,gold=this.currentMonster.level*10;player.experience=(player.experience||0)+xp;player.gold=(player.gold||0)+gold;this.showRewardPopup('Practice duel complete',`${name}: +${xp} XP, +${gold} gold. This is a sparring reward; story status is unchanged.`,()=>{this.currentDungeon=null;this.currentMonster=null;this.encounterKind='monster';this.setScreen('game')});return}
    if(boss)(this as any).defeatBoss();else (this as any).defeatMonster();window.setTimeout(()=>this.showRewardPopup(boss?'Boss defeated':'Victory',`${name} defeated · +${Math.max(0,(player.gold||0)-beforeGold)} gold · +${Math.max(0,(player.experience||0)-beforeXp)} XP · ${Math.max(0,(player.inventory?.length||0)-beforeItems)} item(s).`,()=>{}),0)}
  private resolveDeath():void {const player=this.player as any,equipment=this.readGear(player),penalty=applyDeathPenalty({level:this.safeStat(player.level,1),experience:this.safeStat(player.experience,0),equipment,gold:this.safeStat(player.gold,0)});player.level=penalty.levelAfter;player.experience=penalty.experienceAfter;player.gold=penalty.goldAfter;player.hp=Math.max(1,Math.ceil(this.safeStat(player.maxHp,1)*.5));if(penalty.recoveredEquipment){player.deathCache=[...(player.deathCache||[]),penalty.recoveredEquipment];if(player.equipment&&!Array.isArray(player.equipment)){const slot=Object.keys(player.equipment).find((key)=>player.equipment[key as EquipmentSlot]?.id===penalty.recoveredEquipment!.id) as EquipmentSlot|undefined;if(slot)delete player.equipment[slot]}else if(Array.isArray(player.equipment))player.equipment=player.equipment.filter((item:any)=>item.id!==penalty.recoveredEquipment!.id)}this.cleanupEncounter();this.showRewardPopup('Defeated',penalty.message,()=>this.exitEncounter())}
  private exitEncounter():void {this.dungeonSystem.exitDungeon();this.currentDungeon=null;this.currentMonster=null;this.encounterKind='monster';this.cleanupEncounter();this.setScreen('game')}
  private showRewardPopup(title:string,message:string,onClose:()=>void):void {if(this.rewardDialogOpen)return;this.rewardDialogOpen=true;const overlay=document.createElement('div');overlay.className='reward-overlay';overlay.innerHTML=`<section class="reward-dialog" role="dialog" aria-modal="true" aria-labelledby="reward-title"><p class="combat-eyebrow">AETHORIA · REALM UPDATE</p><h2 id="reward-title">${this.escapeCombatText(title)}</h2><p>${this.escapeCombatText(message)}</p><button class="combat-action primary" type="button" data-close>Continue</button></section>`;this.root.appendChild(overlay);overlay.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click',()=>{overlay.remove();this.rewardDialogOpen=false;onClose()})}
  private cleanupEncounter():void {this.encounter=null;this.encounterMonsterId=null;this.encounterFinished=true;this.encounterLocked=false;this.bossPhase=0}
  private equipmentSummary(player:any):string {const gear=this.readGear(player),total=equipmentTotals(player.equipment||{});return gear.length?`${gear.map((item)=>`${this.escapeCombatText(item.name)} (ATK +${item.attack||0}, DEF +${item.defense||0})`).join(' · ')} · Total bonuses ATK +${total.attack}, DEF +${total.defense}`:'No stat-bearing equipment equipped'}
  private percent(value:number,max:number):number{return Math.max(0,Math.min(100,this.safeStat(value,0)/Math.max(1,this.safeStat(max,1))*100))}
  private safeStat(value:unknown,fallback:number):number{return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1_000_000,value)):fallback}
  private escapeCombatText(value:string):string{return value.replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
}
