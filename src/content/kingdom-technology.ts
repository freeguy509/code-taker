import type { EquipmentItem, EquipmentSlot } from '../types'

export type Technology = 'medieval' | 'murim' | 'steampunk' | 'biopunk' | 'dieselpunk' | 'arcane'
export type PowerSource = 'aura' | 'mana' | 'qi' | 'energy' | 'faith'
export type KingdomIdentity = {
  id: string
  name: string
  region: string
  visual: string
  technologies: readonly Technology[]
  signatureWeapons: readonly string[]
  magicTraditions: readonly string[]
  lore: string
}

/** Original setting identities: use as art direction, not real-world cultural caricatures. */
export const KINGDOM_IDENTITIES: readonly KingdomIdentity[] = [
  { id:'eldrin-reach',name:'Eldrin Reach',region:'Eldrin Reach',visual:'Medieval river citadels, blue ward-lights, carved bridges and old-growth gardens.',technologies:['medieval','arcane','biopunk'],signatureWeapons:['oathsteel longsword','living-bark bow','spellglass focus'],magicTraditions:['mana sigils','faith shrines','root-bond craft'],lore:'The river courts preserve old roads and negotiate with the living forests that grew around their ruins.' },
  { id:'stoneheart',name:'Stoneheart Holds',region:'Stoneheart',visual:'Mountain keeps, brass liftworks, rune furnaces and pressure-driven workshops.',technologies:['medieval','steampunk','murim'],signatureWeapons:['rune maul','steam-driven polearm','qi-forged saber'],magicTraditions:['qi discipline','rune smithing','forge auras'],lore:'The hold-clans combine breath disciplines with precision machinery, and judge a craft by how safely it serves a community.' },
  { id:'ironhaven',name:'Ironhaven Compact',region:'Ironhaven',visual:'Fortified harbor walls, soot-dark rail lines, signal towers and arc-powered shipyards.',technologies:['medieval','steampunk','dieselpunk','arcane'],signatureWeapons:['storm rifle','gear sabre','arc-lance'],magicTraditions:['energy cells','mana engines','harbor blessings'],lore:'Merchant councils maintain a fragile compact between dock guilds, rail barons and neighborhood assemblies.' },
  { id:'shadow-coast',name:'Shadow Coast Freeholds',region:'Shadow Coast',visual:'Tide-worn forts, bioluminescent reefs, salvaged engines and lantern-lit marsh routes.',technologies:['medieval','biopunk','dieselpunk'],signatureWeapons:['reefglass trident','pressure harpoon','lantern pistol'],magicTraditions:['tide mana','beast pacts','wayfarer faith'],lore:'Independent coastal communities salvage carefully, share storm warnings and distrust any power that cannot be repaired locally.' },
  { id:'glasswood-court',name:'Glasswood Court',region:'Eldrin Reach',visual:'Living timber halls, luminous leaves and delicate bio-arcane instruments.',technologies:['medieval','biopunk','arcane'],signatureWeapons:['thornbow','seedglass wand','silksteel rapier'],magicTraditions:['mana weaving','aura forms','old-root rites'],lore:'Court scholars and forest stewards disagree about whether the woods are a realm, a neighbor, or both.' },
]

export type RaceTechnologyAffinity = { race: Race; favored: readonly Technology[]; practicedPowers: readonly PowerSource[]; lore: string }
export const RACE_TECH_AFFINITIES: Record<Race, RaceTechnologyAffinity> = {
  Elf:{race:'Elf',favored:['biopunk','arcane','medieval'],practicedPowers:['mana','aura','faith'],lore:'Many elven communities cultivate responsive living materials, while traditions vary by region.'},
  Demon:{race:'Demon',favored:['dieselpunk','arcane','steampunk'],practicedPowers:['aura','energy','mana'],lore:'Demon lineages are diverse; some workshops specialize in heat-resistant alloys and disciplined aura control.'},
  Beastman:{race:'Beastman',favored:['biopunk','murim','medieval'],practicedPowers:['qi','aura','energy'],lore:'Beastman peoples include many distinct cultures, with strong traditions of fieldcraft and body discipline.'},
  Human:{race:'Human',favored:['medieval','steampunk','dieselpunk'],practicedPowers:['mana','energy','faith'],lore:'Human kingdoms adapt technologies quickly through guilds, trade and local invention.'},
  Dwarf:{race:'Dwarf',favored:['steampunk','murim','medieval'],practicedPowers:['qi','energy','aura'],lore:'Dwarven holds prize maintainable machines, careful stonework and long apprenticeship lineages.'},
  Angel:{race:'Angel',favored:['arcane','medieval','biopunk'],practicedPowers:['faith','mana','aura'],lore:'Angel communities are not a single church; their luminous arts draw from varied vows and schools.'},
  Dragon:{race:'Dragon',favored:['arcane','dieselpunk','biopunk'],practicedPowers:['aura','mana','energy'],lore:'Dragon societies differ widely, pairing ancient personal disciplines with experimental craft.'},
}

export type PowerDiscipline = { id: PowerSource; name: string; use: string; recovery: string }
export const POWER_DISCIPLINES: readonly PowerDiscipline[] = [
  {id:'aura',name:'Aura',use:'Personal presence, reinforcement and protective techniques.',recovery:'Rest and controlled breathing.'},
  {id:'mana',name:'Mana',use:'Spellcasting, enchantments and arcane devices.',recovery:'Rest, mana wells and potions.'},
  {id:'qi',name:'Qi',use:'Internal discipline for movement, precision and body techniques.',recovery:'Meditation and safe training.'},
  {id:'energy',name:'Energy',use:'Powered weapons, engines and technological abilities.',recovery:'Charged cells, generators and maintenance.'},
  {id:'faith',name:'Faith',use:'Voluntary vows, communal rites and supportive blessings.',recovery:'Reflection and community service; never requires a real-world religion.'},
]

export const STARTING_GEAR: readonly EquipmentItem[] = [
  {id:'wayfarer-blade',name:'Wayfarer Blade',slot:'mainHand',rarity:'common',attack:4,skillPower:1},
  {id:'patched-coat',name:'Patched Traveler Coat',slot:'chest',rarity:'common',defense:3},
]

export function equipmentTotals(equipment: Partial<Record<EquipmentSlot,EquipmentItem>>): {attack:number;defense:number;skillPower:number} {
  return Object.values(equipment).reduce((total,item)=>{
    if(!item)return total
    total.attack+=Math.max(0,item.attack||0);total.defense+=Math.max(0,item.defense||0);total.skillPower+=Math.max(0,item.skillPower||0)
    return total
  },{attack:0,defense:0,skillPower:0})
}
