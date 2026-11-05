import type { CombatGear, CombatSkill, CombatMonster } from './combat-engine'

export type CombatProfile = {
  id: string
  name: string
  role: 'player' | 'monster' | 'named-npc'
  skills: readonly CombatSkill[]
  gear?: readonly CombatGear[]
  fleeChance?: number
}

const skill = (id: string, name: string, power: number, manaCost: number, cooldownTurns: number, effect: CombatSkill['effect'] = 'damage'): CombatSkill => ({ id,name,power,manaCost,cooldownTurns,effect })

export const PLAYER_SKILLS: Record<string, readonly CombatSkill[]> = {
  Mage: [skill('arc-bolt','Arc Bolt',22,18,1),skill('nova','Astral Nova',58,42,3),skill('aegis','Prismatic Aegis',18,20,3,'guard')],
  Warrior: [skill('cleave','Crescent Cleave',28,14,1),skill('breaker','Armor Breaker',52,32,3),skill('last-stand','Last Stand',30,22,4,'guard')],
  Ranger: [skill('quickshot','Quickshot',24,12,1),skill('volley','Moonlit Volley',48,28,3),skill('field-kit','Field Dressing',24,18,3,'heal')],
  Assassin: [skill('shadow-cut','Shadow Cut',30,15,1),skill('nightfall','Nightfall',62,38,3),skill('vanish','Veil Step',20,18,3,'guard')],
  Guardian: [skill('shield-bash','Shield Bash',20,12,1),skill('radiant-wall','Radiant Wall',18,18,2,'guard'),skill('restoring-vow','Restoring Vow',32,28,4,'heal')],
  Arcanist: [skill('prism-shot','Prism Shot',24,16,1),skill('gravity-well','Gravity Well',56,36,3),skill('mana-mend','Mana Mend',28,22,3,'heal')],
}

const MONSTER_PROFILES: readonly CombatProfile[] = [
  { id:'goblin-scout', name:'Goblin Scout', role:'monster', fleeChance:.03, skills:[skill('dirty-trick','Dirty Trick',9,4,2)] },
  { id:'orc-warrior', name:'Orc Warrior', role:'monster', fleeChance:.005, skills:[skill('brutal-cleave','Brutal Cleave',18,10,3)] },
  { id:'skeleton-guard', name:'Skeleton Guard', role:'monster', fleeChance:0, skills:[skill('bone-ward','Bone Ward',12,8,3,'guard')] },
  { id:'shadow-beast', name:'Shadow Beast', role:'monster', fleeChance:.01, skills:[skill('dusk-pounce','Dusk Pounce',16,8,2)] },
  { id:'fire-elemental', name:'Fire Elemental', role:'monster', fleeChance:0, skills:[skill('cinder-burst','Cinder Burst',18,12,2)] },
  { id:'ice-wraith', name:'Ice Wraith', role:'monster', fleeChance:.01, skills:[skill('rime-bind','Rime Bind',13,9,2),skill('frost-renewal','Frost Renewal',18,15,4,'heal')] },
  { id:'dark-knight', name:'Dark Knight', role:'monster', fleeChance:0, skills:[skill('black-lance','Black Lance',20,12,2),skill('iron-oath','Iron Oath',15,10,3,'guard')] },
  { id:'demon-eye', name:'Demon Eye', role:'monster', fleeChance:.005, skills:[skill('void-glare','Void Glare',17,12,2)] },
  { id:'forest-guardian', name:'Forest Guardian', role:'monster', skills:[skill('root-snare','Root Snare',24,15,2),skill('bark-renewal','Bark Renewal',35,24,4,'heal')], fleeChance:0 },
  { id:'stone-colossus', name:'Stone Colossus', role:'monster', skills:[skill('seismic-fist','Seismic Fist',34,20,2),skill('granite-shell','Granite Shell',25,18,3,'guard')], fleeChance:0 },
  { id:'knight-commander', name:'Knight Commander', role:'monster', skills:[skill('commanding-strike','Commanding Strike',30,16,2),skill('rally','Rally',35,25,4,'heal')], fleeChance:0 },
  { id:'gorgath-the-destroyer', name:'Gorgath the Destroyer', role:'monster', skills:[skill('world-breaker','World Breaker',48,28,2),skill('abyssal-regeneration','Abyssal Regeneration',55,36,4,'heal'),skill('void-carapace','Void Carapace',30,24,3,'guard')], fleeChance:0 },
]

export const NAMED_NPC_PROFILES: readonly CombatProfile[] = [
  { id:'maerwynn-vale', name:'Queen Maerwynn Vale', role:'named-npc', skills:[skill('royal-decree','Royal Decree',22,18,3,'guard')] },
  { id:'thorne-ashvale', name:'Sir Thorne Ashvale', role:'named-npc', skills:[skill('bridgebreaker','Bridgebreaker',28,14,2),skill('hold-the-line','Hold the Line',20,12,3,'guard')] },
  { id:'valen-orr', name:'Duke Valen Orr', role:'named-npc', skills:[skill('silver-tongue','Silver Tongue',14,12,3),skill('courtly-feint','Courtly Feint',22,16,2)] },
  { id:'malachar-reed', name:'Malachar Reed', role:'named-npc', skills:[skill('quiet-arrest','Quiet Arrest',24,16,2),skill('measured-retreat','Measured Retreat',18,14,3,'heal')] },
  { id:'kess-emberglass', name:'Kess Emberglass', role:'named-npc', skills:[skill('evidence-chain','Evidence Chain',18,12,2),skill('official-seal','Official Seal',16,12,3,'guard')] },
  { id:'iona-starling', name:'Sister Iona Starling', role:'named-npc', skills:[skill('lantern-flare','Lantern Flare',18,12,2),skill('wayfarer-blessing','Wayfarer Blessing',30,22,3,'heal')] },
  { id:'torren-deepdelve', name:'Torren Deepdelve', role:'named-npc', skills:[skill('rune-hammer','Rune Hammer',26,15,2),skill('forgemaster-ward','Forgemaster Ward',20,16,3,'guard')] },
  { id:'sira-vel', name:'Sira Vel', role:'named-npc', skills:[skill('scale-wind','Scale Wind',28,18,2),skill('skyward-recovery','Skyward Recovery',26,20,3,'heal')] },
  { id:'nemi-rill', name:'Nemi Rill', role:'named-npc', skills:[skill('caravan-feint','Caravan Feint',20,12,2),skill('supply-cache','Supply Cache',22,18,3,'heal')] },
  { id:'theo-morrow', name:'Theo Morrow', role:'named-npc', skills:[skill('archival-hex','Archival Hex',22,17,2),skill('catalogued-ward','Catalogued Ward',17,13,3,'guard')] },
  { id:'rava-stormhollow', name:'Rava Stormhollow', role:'named-npc', skills:[skill('stormtrail-shot','Stormtrail Shot',26,16,2),skill('trail-rations','Trail Rations',20,15,3,'heal')] },
  { id:'orin-farstep', name:'Orin Farstep', role:'named-npc', skills:[skill('auctioneer-feint','Auctioneer’s Feint',20,14,2),skill('fair-deal','Fair Deal',18,16,3,'guard')] },
]

const fallback: CombatProfile = { id:'common-creature',name:'Unknown creature',role:'monster',fleeChance:.01,skills:[skill('basic-strike','Heavy Strike',12,8,3)] }
export function getCombatProfile(name: string, kind: 'monster'|'named-npc' = 'monster'): CombatProfile {
  const source = kind === 'named-npc' ? NAMED_NPC_PROFILES : MONSTER_PROFILES
  const normalized = name.trim().toLowerCase()
  return source.find((item) => item.name.toLowerCase() === normalized) || { ...fallback, name, role:kind }
}
export function createMonsterCombatant(input: { id:string; name:string; level:number; hp:number; maxHp:number; mp?:number; maxMp?:number; attack:number; defense:number }, boss = false): CombatMonster {
  const profile = getCombatProfile(input.name)
  return { ...input, mp:input.mp ?? (boss ? 100 : 40), maxMp:input.maxMp ?? (boss ? 100 : 40), skills:[...profile.skills], fleeChance:boss ? 0 : profile.fleeChance, isBoss:boss }
}
