export type PowerSource = 'aura' | 'mana' | 'qi' | 'energy' | 'faith'
export type PowerPools = Record<PowerSource, number> & { max: Record<PowerSource, number> }
export type CombatSkillEffect = 'damage' | 'heal' | 'guard'
export type CombatSkill = {
  id: string
  name: string
  power: number
  /** Legacy fallback cost; preferred resourceCost + powerSource define the pool. */
  manaCost: number
  powerSource?: PowerSource
  resourceCost?: number
  cooldownTurns?: number
  effect?: CombatSkillEffect
}
export type CombatGear = { id?: string; name: string; attack?: number; defense?: number; skillPower?: number; protectedFromDeathLoss?: boolean; bound?: boolean }
export type CombatWeapon = { name: string; attack: number; skillPower?: number }
export type Combatant = {
  id: string; name: string; level: number; hp: number; maxHp: number; mp: number; maxMp: number
  attack: number; defense: number; gear?: CombatGear[]; skills?: CombatSkill[]; powers?: PowerPools
  skillReadyAt?: Record<string, number>
}
export type CombatPlayer = Combatant & { weapon?: CombatWeapon | null }
export type CombatMonster = Combatant & { fleeChance?: number; isBoss?: boolean }
export type CombatAction = { type: 'attack' } | { type: 'skill'; skillId: string } | { type: 'defend' } | { type: 'run' }
export type CombatEvent = { type: 'player-hit'|'monster-hit'|'skill-used'|'skill-cooldown'|'healed'|'defended'|'critical'|'monster-fled'|'player-fled'|'victory'|'defeat'|'error'; text: string; damage?: number }
export type CombatTurnResult = { player: CombatPlayer; monster: CombatMonster; events: CombatEvent[]; outcome: 'ongoing'|'victory'|'defeat'|'escaped'|'monster-fled'|'invalid'; playerDamage: number; monsterDamage: number; turn: number }
export type CombatOptions = { random?: () => number; turn?: number; monsterSkillChance?: number; defaultFleeChance?: number }
const MAX=1_000_000
const SOURCES:PowerSource[]=['aura','mana','qi','energy','faith']
const clamp=(n:number,min:number,max:number):number=>Number.isFinite(n)?Math.min(max,Math.max(min,n)):min
const roll=(random:()=>number):number=>clamp(random(),0,.999999999)
function safe<T extends Combatant>(unit:T):T {
  const maxHp=clamp(unit.maxHp,1,MAX),maxMp=clamp(unit.maxMp,0,MAX)
  const powers=unit.powers?{aura:0,mana:0,qi:0,energy:0,faith:0,max:{aura:0,mana:0,qi:0,energy:0,faith:0},...unit.powers,max:{aura:0,mana:0,qi:0,energy:0,faith:0,...unit.powers.max}}:undefined
  if(powers)for(const source of SOURCES){powers[source]=clamp(powers[source],0,MAX);powers.max[source]=clamp(powers.max[source],0,MAX);powers[source]=Math.min(powers[source],powers.max[source])}
  return {...unit,level:clamp(unit.level,1,10000),hp:clamp(unit.hp,0,maxHp),maxHp,mp:clamp(unit.mp,0,maxMp),maxMp,attack:clamp(unit.attack,0,MAX),defense:clamp(unit.defense,0,MAX),powers,gear:(unit.gear||[]).map((g)=>({...g,attack:clamp(g.attack||0,0,MAX),defense:clamp(g.defense||0,0,MAX),skillPower:clamp(g.skillPower||0,0,MAX)})),skillReadyAt:{...(unit.skillReadyAt||{})},skills:(unit.skills||[]).map((s)=>({...s}))}
}
function gearTotal(unit:Combatant,key:'attack'|'defense'|'skillPower'):number{return(unit.gear||[]).reduce((sum,item)=>sum+clamp(item[key]||0,0,MAX),0)}
function damage(raw:number,defense:number,random:()=>number):{amount:number;critical:boolean}{const varied=raw*(.88+roll(random)*.24),mitigated=varied*(100/(100+clamp(defense,0,MAX))),critical=roll(random)<.08;return{amount:Math.max(1,Math.floor(mitigated*(critical?1.65:1))),critical}}
function result(player:CombatPlayer,monster:CombatMonster,events:CombatEvent[],outcome:CombatTurnResult['outcome'],playerDamage:number,monsterDamage:number,turn:number):CombatTurnResult{return{player,monster,events,outcome,playerDamage,monsterDamage,turn}}
function pay(unit:Combatant,skill:CombatSkill):boolean {
  const cost=clamp(skill.resourceCost??skill.manaCost,0,MAX),source=skill.powerSource
  if(source){if(!unit.powers||unit.powers[source]<cost)return false;unit.powers[source]-=cost;return true}
  if(unit.mp<cost)return false;unit.mp-=cost;return true
}
function skillReady(unit:Combatant,skill:CombatSkill,turn:number):boolean{return(unit.skillReadyAt?.[skill.id]||0)<=turn}
function spendCooldown(unit:Combatant,skill:CombatSkill,turn:number):void{const cd=Math.floor(clamp(skill.cooldownTurns||0,0,100));if(cd)unit.skillReadyAt![skill.id]=turn+cd}

/** Resolve a player action and the living opponent response as a single safe turn. */
export function resolveCombatTurn(inputPlayer:CombatPlayer,inputMonster:CombatMonster,action:CombatAction,options:CombatOptions={}):CombatTurnResult {
 const random=options.random||Math.random,turn=Math.max(1,Math.floor(options.turn||1)),player=safe(inputPlayer) as CombatPlayer,monster=safe(inputMonster) as CombatMonster
 if(!player.hp||!monster.hp)return result(player,monster,[{type:'error',text:'Combat is already over.'}],'invalid',0,0,turn)
 const events:CombatEvent[]=[];let playerDamage=0,monsterDamage=0,guarding=false
 if(action.type==='run')return result(player,monster,[{type:'player-fled',text:'You escaped from the encounter.'}],'escaped',0,0,turn)
 if(action.type==='defend'){guarding=true;events.push({type:'defended',text:'You brace for the incoming attack.'})}
 else {
  let chosen:CombatSkill|undefined
  if(action.type==='skill'){
   const readyAt=player.skillReadyAt?.[action.skillId]||0
   if(readyAt>turn)return result(player,monster,[{type:'skill-cooldown',text:`Skill is on cooldown for ${readyAt-turn} more turn(s).`}],'invalid',0,0,turn)
   chosen=player.skills?.find((s)=>s.id===action.skillId&&Number.isFinite(s.power)&&s.power>0)
   if(!chosen)return result(player,monster,[{type:'error',text:'That skill is not available.'}],'invalid',0,0,turn)
   if(!pay(player,chosen))return result(player,monster,[{type:'error',text:`Not enough ${chosen.powerSource||'mana'} for ${chosen.name}.`}],'invalid',0,0,turn)
   spendCooldown(player,chosen,turn)
   events.push({type:'skill-used',text:`${player.name} uses ${chosen.name}.`})
   if(chosen.effect==='heal'){const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.floor(chosen.power)));player.hp+=healed;events.push({type:'healed',text:`${player.name} recovers ${healed} health.`,damage:healed})}
   else if(chosen.effect==='guard')guarding=true
  }
  if(!chosen||chosen.effect==='damage'){
   const weapon=player.weapon,raw=player.attack+gearTotal(player,'attack')+(weapon?.attack||0)+(chosen?chosen.power+gearTotal(player,'skillPower')+(weapon?.skillPower||0):0)
   const hit=damage(raw,monster.defense+gearTotal(monster,'defense'),random);monster.hp=Math.max(0,monster.hp-hit.amount);monsterDamage=hit.amount
   events.push({type:'player-hit',text:`${player.name} deals ${hit.amount} damage to ${monster.name}${chosen?` with ${chosen.name}`:weapon?` with ${weapon.name}`:''}.`,damage:hit.amount});if(hit.critical)events.push({type:'critical',text:'Critical hit!'})
  }
  if(!monster.hp){events.push({type:'victory',text:`${monster.name} is defeated.`});return result(player,monster,events,'victory',0,monsterDamage,turn)}
 }
 const flee=clamp(monster.fleeChance??options.defaultFleeChance??.01,0,.05)
 if(!monster.isBoss&&monster.hp/monster.maxHp<=.15&&roll(random)<flee)return result(player,monster,[...events,{type:'monster-fled',text:`${monster.name} flees the battle.`}],'monster-fled',0,monsterDamage,turn)
 const usable=(monster.skills||[]).filter((s)=>skillReady(monster,s,turn)&&s.power>0&&(s.powerSource?!!monster.powers&&monster.powers[s.powerSource]>=clamp(s.resourceCost??s.manaCost,0,MAX):monster.mp>=clamp(s.manaCost,0,MAX)))
 const enemy=usable.length&&roll(random)<clamp(options.monsterSkillChance??.2,0,1)?usable[Math.floor(roll(random)*usable.length)]:undefined
 let enemyHeal=false
 if(enemy&&pay(monster,enemy)){spendCooldown(monster,enemy,turn);events.push({type:'skill-used',text:`${monster.name} uses ${enemy.name}.`});if(enemy.effect==='heal'){const healed=Math.min(monster.maxHp-monster.hp,Math.max(1,Math.floor(enemy.power)));monster.hp+=healed;enemyHeal=true;events.push({type:'healed',text:`${monster.name} restores ${healed} health.`})}else if(enemy.effect==='guard'){monster.defense+=Math.floor(enemy.power);events.push({type:'defended',text:`${monster.name} raises its defense.`})}}
 if(!enemyHeal){const raw=monster.attack+gearTotal(monster,'attack')+(enemy?.effect==='damage'?enemy.power:0),hit=damage(raw,player.defense+gearTotal(player,'defense')+(guarding?player.defense:0),random);player.hp=Math.max(0,player.hp-hit.amount);playerDamage=hit.amount;events.push({type:'monster-hit',text:`${monster.name}${enemy?.effect==='damage'?` uses ${enemy.name} and`:''} deals ${hit.amount} damage${guarding?' (guarded)':''}.`,damage:hit.amount});if(hit.critical)events.push({type:'critical',text:`${monster.name} lands a critical hit!`})}
 if(!player.hp){events.push({type:'defeat',text:`${player.name} has been defeated.`});return result(player,monster,events,'defeat',playerDamage,monsterDamage,turn)}
 return result(player,monster,events,'ongoing',playerDamage,monsterDamage,turn)
}
export class CombatSession {
 private locked=false;private turn=0;private player:CombatPlayer;private monster:CombatMonster
 constructor(player:CombatPlayer,monster:CombatMonster){this.player=safe(player) as CombatPlayer;this.monster=safe(monster) as CombatMonster}
 getSnapshot():{player:CombatPlayer;monster:CombatMonster;turn:number;locked:boolean}{return{player:safe(this.player) as CombatPlayer,monster:safe(this.monster) as CombatMonster,turn:this.turn,locked:this.locked}}
 takeTurn(action:CombatAction,options:Omit<CombatOptions,'turn'>={}):CombatTurnResult{if(this.locked)return result(this.player,this.monster,[{type:'error',text:'Please wait for the current action to finish.'}],'invalid',0,0,this.turn);this.locked=true;try{const next=this.turn+1,resolved=resolveCombatTurn(this.player,this.monster,action,{...options,turn:next});if(resolved.outcome!=='invalid'){this.player=resolved.player;this.monster=resolved.monster;this.turn=resolved.turn}return resolved}finally{this.locked=false}}
}
