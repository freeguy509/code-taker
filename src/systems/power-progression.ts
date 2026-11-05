import type { EquipmentItem, EquipmentSlot, Race } from '../types'
import type { CombatSkill, PowerSource } from '../systems/combat-engine'
import { POWER_DISCIPLINES, type RegionCode } from './kingdom-technology'

export type SkillArchetype = 'channeler'|'martial'|'precision'|'shadow'|'vowkeeper'|'hybrid'
export const CLASS_POWER_SOURCE:Record<string,PowerSource>={Mage:'mana',Warrior:'aura',Ranger:'energy',Assassin:'qi',Guardian:'faith',Arcanist:'mana'}
export function bindSkillToPower(skill:CombatSkill,source:PowerSource):CombatSkill{return{...skill,powerSource:source,resourceCost:skill.resourceCost??skill.manaCost}}
export function startingPools(race:Race,className:string):{aura:number;mana:number;qi:number;energy:number;faith:number;max:{aura:number;mana:number;qi:number;energy:number;faith:number}} {
 const favored:PowerSource[] = race==='Elf'?['mana','aura','faith']:race==='Demon'?['aura','energy','mana']:race==='Beastman'?['qi','aura','energy']:race==='Human'?['mana','energy','faith']:race==='Dwarf'?['qi','energy','aura']:race==='Angel'?['faith','mana','aura']:['aura','mana','energy']
 const primary=CLASS_POWER_SOURCE[className]||'mana',base={aura:35,mana:35,qi:35,energy:35,faith:35},max={...base}
 base[primary]+=30;max[primary]+=30
 for(const source of favored.slice(0,2)){base[source]+=10;max[source]+=10}
 return{...base,max}
}
export type PlayerRealmPreference={serverRegion:RegionCode;campaignRegion:RegionCode;allowLocaleSuggestion:boolean}
export function makeRealmPreference(serverRegion:RegionCode,campaignRegion:RegionCode=serverRegion):PlayerRealmPreference{return{serverRegion,campaignRegion,allowLocaleSuggestion:false}}
export function allEquipped(equipment?:Partial<Record<EquipmentSlot,EquipmentItem>>):EquipmentItem[]{return equipment?Object.values(equipment).filter((item):item is EquipmentItem=>!!item):[]}
export function resourceName(source:PowerSource):string{return POWER_DISCIPLINES.find((item)=>item.id===source)?.name||source}
