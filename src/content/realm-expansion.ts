import type { Race } from '../types'

export type ClassRarity = 'common' | 'uncommon' | 'rare' | 'mythic'
export type ClassBalance = 'challenging' | 'niche' | 'standard' | 'strong' | 'lucky'
export type SubclassPath = { name: string; focus: string }
export type Profession = {
  id: string
  name: string
  rarity: ClassRarity
  balance: ClassBalance
  role: string
  paths: readonly SubclassPath[]
}

// 50 base classes. Each class has 4–6 distinct specialization paths.
// Rarity is a progression unlock, not a promise of superior power.
const rawProfessions = [
  ['vanguard', 'Vanguard', 'common', 'standard', 'Front-line protector', ['Bulwark: shield walls', 'Duelist: single-target pressure', 'Banneret: team leadership', 'Ironheart: endurance']],
  ['spellblade', 'Spellblade', 'uncommon', 'strong', 'Melee and spell hybrid', ['Runesword: weapon enchantments', 'Dawnbound: radiant strikes', 'Frostedge: control', 'Stormbrand: mobile damage', 'Wardblade: defensive magic']],
  ['wayfinder', 'Wayfinder', 'common', 'standard', 'Scout and navigator', ['Trailwarden: travel support', 'Beastfriend: companion tactics', 'Pathfinder: exploration', 'Longshot: ranged attacks']],
  ['shade', 'Shade', 'uncommon', 'niche', 'Stealth and disruption', ['Nightstep: stealth', 'Veilknife: ambush', 'Hexbreaker: anti-magic', 'Phantom: evasion']],
  ['warden', 'Warden', 'common', 'strong', 'Guardian of allies', ['Oathshield: defense', 'Thornkeeper: area control', 'Lifeguard: recovery', 'Sentinel: threat control', 'Stonewall: damage reduction']],
  ['arcanist', 'Arcanist', 'uncommon', 'standard', 'Flexible spell scholar', ['Prism: elemental variety', 'Glyphwright: prepared spells', 'Starreader: ranged magic', 'Nullsinger: disruption']],
  ['mender', 'Mender', 'common', 'niche', 'Healer and support', ['Field medic: quick recovery', 'Herbalist: remedies', 'Mercy hand: group healing', 'Soulkeeper: protective wards']],
  ['runesmith', 'Runesmith', 'rare', 'lucky', 'Crafting and rune magic', ['Forge sage: gear crafting', 'Glyph armorer: armor', 'Sigil carver: weapons', 'Relic tuner: artifacts', 'Master of marks: versatile runes']],
  ['stormcaller', 'Stormcaller', 'uncommon', 'strong', 'Weather and lightning mage', ['Thunderhead: burst magic', 'Rainweaver: support', 'Gale dancer: mobility', 'Tempest: area magic']],
  ['beastkeeper', 'Beastkeeper', 'common', 'challenging', 'Companion-focused adventurer', ['Houndmaster: tracking', 'Skybond: flying companion', 'Wildheart: beast forms', 'Pack guide: group utility']],
  ['luminant', 'Luminant', 'rare', 'strong', 'Radiant spellcaster', ['Sunward: offense', 'Dawnshield: defense', 'Beacon: healing', 'Halo: control', 'Daybreak: hybrid magic']],
  ['gravekeeper', 'Gravekeeper', 'rare', 'niche', 'Spirit and memorial magic', ['Ancestor voice: spirit counsel', 'Pallbearer: protection', 'Grave ward: area defense', 'Lantern bearer: spirit tracking']],
  ['duelist', 'Duelist', 'common', 'strong', 'Precision weapon specialist', ['Riposte: counterattacks', 'Blade dance: mobility', 'Pistolier: ranged sidearm', 'Challenge: focused duels']],
  ['alchemist', 'Alchemist', 'uncommon', 'lucky', 'Potions and transmutation', ['Distiller: potions', 'Bombardier: area tools', 'Transmuter: material crafting', 'Toxicologist: status effects', 'Elixir savant: rare mixtures']],
  ['frostweaver', 'Frostweaver', 'uncommon', 'standard', 'Ice and control magic', ['Glacier: defense', 'Rime: slowing', 'Snowveil: concealment', 'Whiteout: area control']],
  ['flamebound', 'Flamebound', 'common', 'strong', 'Fire magic and close combat', ['Cinder: ranged fire', 'Ashguard: defensive heat', 'Phoenix: recovery', 'Forgefire: weapon infusion']],
  ['tidecaller', 'Tidecaller', 'uncommon', 'niche', 'Water magic and navigation', ['Tide: control', 'Undertow: displacement', 'Rain: support', 'Deepcurrent: exploration']],
  ['earthshaper', 'Earthshaper', 'common', 'standard', 'Stone and terrain magic', ['Quarry: heavy strikes', 'Rampart: fortification', 'Faultline: disruption', 'Greenstone: nature support']],
  ['windrider', 'Windrider', 'uncommon', 'strong', 'Air magic and movement', ['Sky dancer: evasion', 'Gale lancer: charges', 'Cloudstep: traversal', 'Whirlwind: area attacks']],
  ['songweaver', 'Songweaver', 'rare', 'lucky', 'Music-based support magic', ['Balladeer: morale', 'Dirge: weakening', 'Cantor: healing', 'Echo: spell mimicry', 'Maestro: party support']],
  ['dreamwalker', 'Dreamwalker', 'rare', 'niche', 'Illusion and perception', ['Mirage: decoys', 'Lucid: focus', 'Nightmare: control', 'Somnium: exploration']],
  ['chronist', 'Chronist', 'mythic', 'lucky', 'Rare time-bending specialist', ['Second hand: cooldowns', 'Refrain: repeat a recent action', 'Stillpoint: control', 'Fast-forward: ally tempo']],
  ['riftstrider', 'Riftstrider', 'mythic', 'strong', 'Portal and space magic', ['Gatekeeper: group travel', 'Blinkblade: combat mobility', 'Farwalker: exploration', 'Riftguard: defensive portals', 'Way between: support']],
  ['hexer', 'Hexer', 'uncommon', 'niche', 'Curses and debuffs', ['Jinx: misfortune', 'Witchmark: target focus', 'Bane: weakening', 'Curseweaver: area debuffs']],
  ['oracle', 'Oracle', 'rare', 'lucky', 'Prophecy and foresight', ['Augur: scouting', 'Fatebinder: ally support', 'Star omen: ranged magic', 'Truthseeker: reveal', 'Seer: flexible foresight']],
  ['tinker', 'Tinker', 'common', 'challenging', 'Devices and improvised tools', ['Clockwork: constructs', 'Trapwright: traps', 'Field engineer: repairs', 'Scrap genius: salvage']],
  ['gunslinger', 'Gunslinger', 'uncommon', 'standard', 'Ranged weapon specialist', ['Deadeye: precision', 'Quickdraw: tempo', 'Trickshot: utility shots', 'Powder captain: area pressure']],
  ['spearwarden', 'Spearwarden', 'common', 'standard', 'Reach-weapon defender', ['Phalanx: group defense', 'Lancer: charges', 'Dragoon: leaps', 'Reedguard: counterplay']],
  ['shieldbearer', 'Shieldbearer', 'common', 'challenging', 'Dedicated defensive fighter', ['Tower shield: protection', 'Shield rush: disruption', 'Aegis: ally cover', 'Last stand: survival']],
  ['martial-adept', 'Martial Adept', 'common', 'strong', 'Unarmed combatant', ['Open palm: control', 'Stone fist: power', 'Flowing step: evasion', 'Quiet mind: focus']],
  ['monk', 'Monk', 'uncommon', 'niche', 'Disciplined mystic', ['Stillwater: calm support', 'Iron body: defense', 'Hundred steps: mobility', 'Inner flame: energy strikes']],
  ['dreadknight', 'Dreadknight', 'rare', 'strong', 'Dark oath warrior', ['Night oath: pressure', 'Graveguard: defense', 'Ruin rider: mobility', 'Oathbreaker: risk and reward']],
  ['oathkeeper', 'Oathkeeper', 'uncommon', 'standard', 'Vow-bound champion', ['Vow of shelter: protection', 'Vow of truth: revelation', 'Vow of justice: pursuit', 'Vow of mercy: recovery']],
  ['wildspeaker', 'Wildspeaker', 'uncommon', 'lucky', 'Nature magic and communication', ['Grove voice: healing', 'Thorn call: control', 'Rootwarden: defense', 'Green path: travel', 'Beast tongue: companion support']],
  ['spirit-dancer', 'Spirit Dancer', 'rare', 'niche', 'Mobile spirit channeler', ['Ancestor dance: support', 'Flame dance: offense', 'Mask dance: deception', 'Rain dance: recovery']],
  ['scout', 'Scout', 'common', 'standard', 'Reconnaissance and survival', ['Lookout: detection', 'Path cutter: travel', 'Skirmisher: hit and run', 'Forager: supplies']],
  ['saboteur', 'Saboteur', 'uncommon', 'challenging', 'Traps and objective play', ['Demolitionist: structures', 'Disarmer: counter-traps', 'Infiltrator: stealth', 'Powder rat: improvised tools']],
  ['battlemage', 'Battlemage', 'uncommon', 'strong', 'Combat-focused spellcaster', ['War caster: close magic', 'Siegebreaker: heavy spells', 'Spellguard: defense', 'Arc lance: ranged damage']],
  ['bloodweaver', 'Bloodweaver', 'rare', 'niche', 'High-risk vitality magic', ['Red thread: ally link', 'Sanguine ward: defense', 'Vital surge: recovery', 'Crimson art: risky offense']],
  ['voidtouched', 'Voidtouched', 'mythic', 'lucky', 'Uncommon void-channeler', ['Eclipse: concealment', 'Abyssal gate: portals', 'Hollow star: ranged magic', 'Night sea: control', 'Edge of nothing: high-risk power']],
  ['starforged', 'Starforged', 'mythic', 'strong', 'Celestial weapon adept', ['Comet: charges', 'Pulsar: ranged bursts', 'Orbit: defense', 'Nova: area power']],
  ['bannerlord', 'Bannerlord', 'rare', 'lucky', 'Tactical leader', ['War banner: morale', 'Quartermaster: supplies', 'Marshal: formations', 'Standard of dawn: protection', 'Field command: coordination']],
  ['beastform', 'Beastform', 'uncommon', 'standard', 'Shapeshifting fighter', ['Wolf: pursuit', 'Bear: durability', 'Raven: scouting', 'Lynx: precision']],
  ['dungeon-delver', 'Dungeon Delver', 'common', 'challenging', 'Trap and ruin specialist', ['Relic finder: exploration', 'Lockbreaker: mechanisms', 'Torchbearer: team safety', 'Crypt runner: evasion']],
  ['relic-hunter', 'Relic Hunter', 'uncommon', 'lucky', 'Artifact recovery expert', ['Appraiser: identify loot', 'Vault seeker: hidden paths', 'Curse tender: safe handling', 'Antiquarian: lore', 'Fortune seeker: rare finds']],
  ['wayfarer', 'Wayfarer', 'common', 'challenging', 'Long-distance traveler', ['Caravan hand: logistics', 'Camp keeper: rest', 'Road singer: morale', 'Border guide: safe passage']],
  ['merchant-adept', 'Merchant Adept', 'common', 'niche', 'Trade and negotiation', ['Broker: prices', 'Factor: bulk trade', 'Auctioneer: bidding', 'Silver tongue: diplomacy']],
  ['citadel-engineer', 'Citadel Engineer', 'rare', 'strong', 'Fortification and siege craft', ['Wallwright: defenses', 'Siege engineer: structures', 'Bridge maker: logistics', 'Golemwright: constructs', 'Quartermaster: fort supplies']],
  ['fate-touched', 'Fate-Touched', 'mythic', 'lucky', 'Unpredictable rare talent', ['Lucky break: chance effects', 'Unwritten: adaptive skills', 'Fortune wheel: risk and reward', 'Threadcutter: fate disruption']],
  ['reaver', 'Reaver', 'common', 'strong', 'Aggressive frontline combatant', ['Ravager: pressure', 'Bloodrider: pursuit', 'Breaker: armor impact', 'Harrier: disruption']],
  ['peasant-hero', 'Peasant Hero', 'common', 'challenging', 'Untrained local turned adventurer', ['Pitchfork: improvised arms', 'Hearthguard: protect neighbors', 'Lucky survivor: escapes', 'Village champion: morale']],
] as const

export const PROFESSIONS: readonly Profession[] = rawProfessions.map(([id, name, rarity, balance, role, paths]) => ({
  id,
  name,
  rarity,
  balance,
  role,
  paths: paths.map((entry) => {
    const [pathName, focus] = entry.split(': ')
    return { name: pathName, focus }
  }),
}))

if (PROFESSIONS.length !== 50) {
  throw new Error(`Expected 50 professions; found ${PROFESSIONS.length}.`)
}

export type RealmSite = {
  id: string
  name: string
  kind: 'kingdom' | 'city' | 'frontier' | 'ruin' | 'dungeon'
  region: string
  recommendedLevel: number
  journeyDaysFromEldrin: number
  lore: string
}

export const REALM_SITES: readonly RealmSite[] = [
  { id: 'eldrin', name: 'Eldrin Reach', kind: 'kingdom', region: 'Eldrin Reach', recommendedLevel: 1, journeyDaysFromEldrin: 0, lore: 'A river kingdom whose old roads still follow the foundations of a vanished empire.' },
  { id: 'stoneheart', name: 'Stoneheart Hold', kind: 'city', region: 'Stoneheart', recommendedLevel: 8, journeyDaysFromEldrin: 3, lore: 'A mountain city built around a deep forge and a stubborn council of guilds.' },
  { id: 'ironhaven', name: 'Ironhaven', kind: 'kingdom', region: 'Ironhaven', recommendedLevel: 12, journeyDaysFromEldrin: 6, lore: 'A fortified port where shipwrights and nobles contest control of the western trade.' },
  { id: 'shadow-coast', name: 'Shadow Coast', kind: 'frontier', region: 'Shadow Coast', recommendedLevel: 18, journeyDaysFromEldrin: 9, lore: 'A stormy coast of lighthouse hamlets, wrecks, and disputed fishing waters.' },
  { id: 'glasswood', name: 'The Glasswood', kind: 'frontier', region: 'Eldrin Reach', recommendedLevel: 5, journeyDaysFromEldrin: 2, lore: 'A silver-leaved forest where echoes sometimes arrive before their speakers.' },
  { id: 'old-king-road', name: 'Old King Road', kind: 'frontier', region: 'Eldrin Reach', recommendedLevel: 4, journeyDaysFromEldrin: 1, lore: 'A broken imperial highway still marked by weather-worn mile stones.' },
  { id: 'sunken-archive', name: 'Sunken Archive', kind: 'ruin', region: 'Eldrin Reach', recommendedLevel: 10, journeyDaysFromEldrin: 3, lore: 'A half-submerged library whose catalog records books that were never written.' },
  { id: 'cinder-vault', name: 'Cinder Vault', kind: 'ruin', region: 'Stoneheart', recommendedLevel: 16, journeyDaysFromEldrin: 5, lore: 'An ash-sealed armory left behind after the Forgebound succession.' },
  { id: 'moonwell-sanctum', name: 'Moonwell Sanctum', kind: 'ruin', region: 'Eldrin Reach', recommendedLevel: 14, journeyDaysFromEldrin: 4, lore: 'A sanctuary whose dry basin reflects a different sky each night.' },
  { id: 'thunderhead-observatory', name: 'Thunderhead Observatory', kind: 'ruin', region: 'Stoneheart', recommendedLevel: 22, journeyDaysFromEldrin: 7, lore: 'A mountaintop observatory abandoned after its final astronomer predicted two moons.' },
  { id: 'salt-crown-catacombs', name: 'Salt-Crown Catacombs', kind: 'dungeon', region: 'Shadow Coast', recommendedLevel: 24, journeyDaysFromEldrin: 9, lore: 'Tidal tunnels beneath the tombs of an exiled maritime dynasty.' },
  { id: 'emberfall-crypt', name: 'Emberfall Crypt', kind: 'dungeon', region: 'Stoneheart', recommendedLevel: 20, journeyDaysFromEldrin: 6, lore: 'A sealed necropolis where the memorial braziers still burn without fuel.' },
  { id: 'rootmaze', name: 'The Rootmaze', kind: 'dungeon', region: 'Eldrin Reach', recommendedLevel: 13, journeyDaysFromEldrin: 4, lore: 'A living labyrinth that grows around the names carved into its oldest trees.' },
  { id: 'drowned-basilica', name: 'Drowned Basilica', kind: 'ruin', region: 'Shadow Coast', recommendedLevel: 27, journeyDaysFromEldrin: 11, lore: 'A bell tower visible only when the tide draws back from the black reef.' },
  { id: 'sable-foundry', name: 'Sable Foundry', kind: 'dungeon', region: 'Ironhaven', recommendedLevel: 29, journeyDaysFromEldrin: 8, lore: 'A decommissioned war foundry whose machinery continues to stamp unfamiliar crests.' },
  { id: 'crownless-palace', name: 'Crownless Palace', kind: 'ruin', region: 'Ironhaven', recommendedLevel: 32, journeyDaysFromEldrin: 8, lore: 'The empty palace of a ruler whose name was deliberately removed from every record.' },
  { id: 'frostmere-watch', name: 'Frostmere Watch', kind: 'frontier', region: 'Stoneheart', recommendedLevel: 17, journeyDaysFromEldrin: 5, lore: 'A remote watch station where travelers leave messages for people not yet born.' },
  { id: 'whispering-march', name: 'Whispering March', kind: 'frontier', region: 'Shadow Coast', recommendedLevel: 21, journeyDaysFromEldrin: 10, lore: 'A broad marshland whose fog carries fragments of old court debates.' },
  { id: 'ashen-library', name: 'Ashen Library', kind: 'ruin', region: 'Ironhaven', recommendedLevel: 25, journeyDaysFromEldrin: 7, lore: 'A charred archive protected by librarians who refuse to admit the fire happened.' },
  { id: 'starfall-crater', name: 'Starfall Crater', kind: 'dungeon', region: 'Stoneheart', recommendedLevel: 35, journeyDaysFromEldrin: 8, lore: 'A vast impact basin where compasses point toward the oldest nearby memory.' },
]

export const WEAPON_GRADES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient', 'Mystical', 'Godly'] as const
export type WeaponGrade = (typeof WEAPON_GRADES)[number]
export const MYSTICAL_ACQUISITION = ['server-run auction', 'scheduled rare world event'] as const
// 0.0000000001% = 1e-12 probability. Resolve only on a trusted server, per eligible Ancient-ruin reward roll.
export const GODLY_RUIN_DROP_CHANCE = 1e-12

export type LoreCharacter = { id: string; name: string; race: Race; role: string; home: string; biography: string }
export const LORE_CHARACTERS: readonly LoreCharacter[] = [
  { id: 'aldric-vale', name: 'Queen Maerwynn Vale', race: 'Human', role: 'Crowned steward', home: 'Eldrin Reach', biography: 'She took the crown after negotiating a truce among the river guilds, and keeps a second chair empty for the communities not represented at court.' },
  { id: 'thorne-ash', name: 'Sir Thorne Ashvale', race: 'Dwarf', role: 'Knight captain', home: 'Stoneheart Hold', biography: 'A former bridge-builder who measures leadership by whether the supply carts reach the villages before winter.' },
  { id: 'valen-orr', name: 'Duke Valen Orr', race: 'Elf', role: 'Noble envoy', home: 'Ironhaven', biography: 'An exacting diplomat collecting versions of the same old treaty from every family that signed it.' },
  { id: 'malachar-reed', name: 'Malachar Reed', race: 'Beastman', role: 'Royal investigator', home: 'Shadow Coast', biography: 'A patient investigator who prefers a repaired feud to a public punishment.' },
  { id: 'kess-ember', name: 'Kess Emberglass', race: 'Demon', role: 'Bounty registrar', home: 'Eldrin Reach', biography: 'A meticulous clerk who insists every bounty include evidence, an expiry date, and an appeal route.' },
  { id: 'sister-iona', name: 'Sister Iona Starling', race: 'Angel', role: 'Wayhouse keeper', home: 'Old King Road', biography: 'She maintains free shelters along the old road and records the stories travelers trade for a warm meal.' },
  { id: 'torren-deep', name: 'Torren Deepdelve', race: 'Dwarf', role: 'Master runesmith', home: 'Stoneheart Hold', biography: 'He studies the Cinder Vault’s marks and believes its makers were trying to preserve tools, not weapons.' },
  { id: 'sira-vel', name: 'Sira Vel', race: 'Dragon', role: 'Ruin cartographer', home: 'Glasswood', biography: 'A careful mapmaker whose charts show safe routes and openly mark places she has not verified.' },
  { id: 'nemi-rill', name: 'Nemi Rill', race: 'Human', role: 'Caravan organizer', home: 'Ironhaven', biography: 'She built a cooperative road network after losing a season’s cargo to avoidable toll disputes.' },
  { id: 'theo-morrow', name: 'Theo Morrow', race: 'Elf', role: 'Archive apprentice', home: 'Sunken Archive', biography: 'He searches the flooded stacks for the names of people omitted from the official histories.' },
  { id: 'rava-storm', name: 'Rava Stormhollow', race: 'Beastman', role: 'Frontier guide', home: 'Frostmere Watch', biography: 'A renowned guide who teaches travelers to read weather and leave the trail better marked than they found it.' },
  { id: 'orin-far', name: 'Orin Farstep', race: 'Demon', role: 'Auction mediator', home: 'Ironhaven', biography: 'He enforces transparent bids and refuses private offers on relics whose provenance is unknown.' },
]

// Positive numbers mean mutual affinity; negative numbers mean historic tension, not a restriction on characters.
export const RACE_RELATIONS: Record<Race, Partial<Record<Race, number>>> = {
  Elf: { Elf: 20, Demon: -10, Beastman: 5, Human: 10, Dwarf: -5, Angel: 10, Dragon: 0 },
  Demon: { Elf: -10, Demon: 20, Beastman: 5, Human: 0, Dwarf: 0, Angel: -15, Dragon: 10 },
  Beastman: { Elf: 5, Demon: 5, Beastman: 20, Human: 5, Dwarf: 5, Angel: 0, Dragon: 5 },
  Human: { Elf: 10, Demon: 0, Beastman: 5, Human: 15, Dwarf: 10, Angel: 5, Dragon: 0 },
  Dwarf: { Elf: -5, Demon: 0, Beastman: 5, Human: 10, Dwarf: 20, Angel: 5, Dragon: 5 },
  Angel: { Elf: 10, Demon: -15, Beastman: 0, Human: 5, Dwarf: 5, Angel: 20, Dragon: 5 },
  Dragon: { Elf: 0, Demon: 10, Beastman: 5, Human: 0, Dwarf: 5, Angel: 5, Dragon: 20 },
}

export type RelationStanding = { score: number; status: 'hostile' | 'wary' | 'neutral' | 'friendly' | 'allied' }
export function getRaceRelation(a: Race, b: Race, reputation = 0): RelationStanding {
  const base = RACE_RELATIONS[a]?.[b] ?? 0
  const score = Math.max(-100, Math.min(100, base + reputation))
  const status = score <= -50 ? 'hostile' : score <= -16 ? 'wary' : score < 16 ? 'neutral' : score < 50 ? 'friendly' : 'allied'
  return { score, status }
}

export type RouteEdge = { from: string; to: string; days: number; road: boolean }
export const ROAD_NETWORK: readonly RouteEdge[] = [
  { from: 'eldrin', to: 'glasswood', days: 2, road: false },
  { from: 'eldrin', to: 'old-king-road', days: 1, road: true },
  { from: 'old-king-road', to: 'stoneheart', days: 2, road: true },
  { from: 'stoneheart', to: 'frostmere-watch', days: 2, road: false },
  { from: 'stoneheart', to: 'ironhaven', days: 3, road: true },
  { from: 'ironhaven', to: 'shadow-coast', days: 3, road: true },
  { from: 'glasswood', to: 'moonwell-sanctum', days: 2, road: false },
  { from: 'glasswood', to: 'rootmaze', days: 2, road: false },
  { from: 'stoneheart', to: 'cinder-vault', days: 2, road: false },
  { from: 'stoneheart', to: 'thunderhead-observatory', days: 3, road: false },
  { from: 'ironhaven', to: 'crownless-palace', days: 2, road: true },
  { from: 'ironhaven', to: 'ashen-library', days: 2, road: false },
  { from: 'shadow-coast', to: 'drowned-basilica', days: 2, road: false },
  { from: 'shadow-coast', to: 'salt-crown-catacombs', days: 2, road: false },
  { from: 'shadow-coast', to: 'whispering-march', days: 2, road: false },
  { from: 'ironhaven', to: 'sable-foundry', days: 1, road: true },
  { from: 'stoneheart', to: 'starfall-crater', days: 4, road: false },
  { from: 'eldrin', to: 'sunken-archive', days: 2, road: false },
  { from: 'ironhaven', to: 'sunken-archive', days: 4, road: true },
]

export type TravelEstimate = { days: number; route: string[]; description: string }
export function estimateTravel(from: string, to: string, options: { roadBonus?: boolean; weatherMultiplier?: number } = {}): TravelEstimate | null {
  if (from === to) return { days: 0, route: [from], description: 'You are already there.' }
  const distance = new Map<string, number>([[from, 0]])
  const previous = new Map<string, string>()
  const remaining = new Set([from, ...ROAD_NETWORK.flatMap((edge) => [edge.from, edge.to])])
  while (remaining.size) {
    let current: string | undefined
    for (const node of remaining) {
      if (distance.has(node) && (current === undefined || distance.get(node)! < distance.get(current)!)) current = node
    }
    if (!current) break
    if (current === to) break
    remaining.delete(current)
    for (const edge of ROAD_NETWORK) {
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null
      if (!next || !remaining.has(next)) continue
      const roadFactor = options.roadBonus && edge.road ? 0.8 : 1
      const cost = edge.days * roadFactor
      const candidate = distance.get(current)! + cost
      if (candidate < (distance.get(next) ?? Infinity)) {
        distance.set(next, candidate)
        previous.set(next, current)
      }
    }
  }
  if (!distance.has(to)) return null
  const route = [to]
  while (route[0] !== from) {
    const parent = previous.get(route[0])
    if (!parent) return null
    route.unshift(parent)
  }
  const days = Math.max(1, Math.ceil(distance.get(to)! * Math.max(1, options.weatherMultiplier ?? 1)))
  return { days, route, description: `${days} in-game day${days === 1 ? '' : 's'} via ${route.join(' → ')}` }
}

export const CONTENT_RATING = {
  targetAudience: '16+',
  guidance: ['fantasy conflict', 'peril', 'loss and grief', 'political tension'],
  boundaries: 'Keep violence non-graphic; avoid explicit sexual content and use clear content warnings for heavier themes.',
} as const
