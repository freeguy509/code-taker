# Realm Expansion and NPC Combat Integration

## What this module adds

- `src/types.ts` defines a formal optional equipment schema with named slots, rarity, and combat stats. Existing characters without equipment continue to load.
- `src/content/kingdom-technology.ts` describes five original kingdom visual identities and mixes medieval, murim, steampunk, biopunk, dieselpunk, and arcane technologies. It records race affinities as cultural patterns, not restrictions on character selection.
- The same catalog documents aura, mana, qi, energy, and faith as separate setting disciplines.
- `CombatGameApp.renderGame()` calls the existing game renderer first, then adds a kingdom/culture directory and duel buttons for named NPCs. Existing world map, chat, and inventory are retained.
- Practice duels reuse the combat engine and NPC combat profiles. Their modest rewards are explicitly described as practice rewards; they do not imply NPC death or change world lore.
- Equipment totals are read from `player.equipment` by slot, while the combat engine still accepts legacy array-shaped equipment.

## Equipment example

```ts
const player = {
  // ...existing player properties
  equipment: {
    mainHand: { id: 'wayfarer-blade', name: 'Wayfarer Blade', slot: 'mainHand', rarity: 'common', attack: 4, skillPower: 1 },
    chest: { id: 'patched-coat', name: 'Patched Traveler Coat', slot: 'chest', rarity: 'common', defense: 3 },
  },
  resources: { aura: 20, maxAura: 20, mana: 70, maxMana: 70, qi: 15, maxQi: 15, energy: 10, maxEnergy: 10, faith: 5, maxFaith: 5 },
}
```

## Current boundaries

The existing player skill engine still spends MP for combat abilities; the additional power pools are currently modeled and displayed when present, but class skills need a follow-up migration to consume the relevant pool. The browser prototype's random combat must move to a trusted server before multiplayer PvP or valuable shared rewards. Kingdom entries currently provide art direction and lore data rather than rendered 3D assets.
