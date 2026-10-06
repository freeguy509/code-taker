# Aethoria Game Architecture

## File Structure

```
src/
├── index.ts                 # Main exports
├── main.ts                  # App entry point
├── App.ts                   # Base app shell
├── AppV2.ts                 # Extended app with systems
├── styles.css               # Global styles
│
├── types/
│   ├── index.ts             # Core game types
│   └── events.ts            # Event system types
│
├── systems/
│   ├── game-controller.ts   # Central game logic controller
│   ├── state-manager.ts     # Player and game state management
│   └── network-manager.ts   # WebSocket communication
│
├── dungeon-system.ts        # Dungeon generation and progression
├── quest-system.ts          # Quest management and tracking
└── multiplayer.ts           # Legacy multiplayer (can be deprecated)
```

## Architecture Layers

### 1. **Presentation Layer** (UI)
- `App.ts` - Menu screens, character creation
- `AppV2.ts` - Game world, dungeons, bosses
- `styles.css` - All visual styling

### 2. **Game Logic Layer**
- `GameController` - Orchestrates all game systems
- `DungeonSystem` - Handles dungeon generation and combat
- `QuestSystem` - Manages quests and progression
- `StateManager` - Maintains game state

### 3. **Network Layer**
- `NetworkManager` - WebSocket communication
- Message queuing for offline play
- Auto-reconnect with exponential backoff
- Heartbeat/ping for connection health

### 4. **Data Layer**
- `types/index.ts` - All shared data structures
- Player, Monster, Quest, Dungeon schemas
- Network message types

### 5. **Event System**
- `EventEmitter` - Decoupled event communication
- Typed event handlers with `EventMap`
- Subscribe/unsubscribe pattern

## Data Flow

```
UI (App)
  ↓
GameController
  ↓
StateManager (game state)
NetworkManager (multiplayer)
DungeonSystem (dungeons)
QuestSystem (quests)
  ↓
EventEmitter (broadcasts changes)
  ↓
UI (re-renders)
```

## Multiplayer Architecture

### Client Side
1. Player connects to WebSocket server
2. `NetworkManager` maintains connection
3. State changes emit events
4. Events trigger network messages
5. Server broadcasts updates to all clients

### Server Side (WebSocket)
```
Cloudflare Worker / Durable Object
  ↓
WebSocket Pool (manages connections)
  ↓
Session State (shared world)
  ↓
Broadcast to all players
```

### Session Architecture
```
GameSession
├── players: Map<playerId, Player>
├── messages: ChatMessage[]
├── worldState: WorldState
└── isActive: boolean
```

## Message Flow

### Player Movement
```
UI click "Move"
  ↓
GameController.updatePlayer()
  ↓
StateManager updates local state
  ↓
EventEmitter: player:updated
  ↓
NetworkManager sends PlayerUpdateMessage
  ↓
Server broadcasts to all players
  ↓
Other clients receive update
  ↓
UI re-renders
```

### Combat
```
UI click "Attack"
  ↓
GameController.attackMonster()
  ↓
Calculate damage (critical check)
  ↓
EventEmitter: combat:damage
  ↓
StateManager updates monster HP
  ↓
NetworkManager sends CombatMessage
  ↓
Server validates and broadcasts
  ↓
All players see the attack
```

### Loot Distribution
```
Monster defeated
  ↓
DungeonSystem calculates drops
  ↓
EventEmitter: loot:obtained
  ↓
StateManager adds items to inventory
  ↓
NetworkManager sends LootMessage
  ↓
Server acknowledges and updates player stats
  ↓
UI updates inventory display
```

## Type Safety

All network messages are strongly typed:

```typescript
type NetworkMessage = 
  | PlayerJoinMessage
  | PlayerUpdateMessage
  | PlayerLeaveMessage
  | ChatMessage
  | CombatMessage
  | LootMessage
  | SnapshotMessage
  | ErrorMessage
```

Event handlers are type-safe:

```typescript
controller.on('combat:damage', ({ damage, attacker, defender }) => {
  // TypeScript knows the shape of this data
})
```

## Scalability Considerations

### 1000-Player Architecture

1. **Sharding by Region**
   - Each region gets its own Durable Object instance
   - Players in "Eldrin Reach" talk to one instance
   - Reduces per-instance player count

2. **State Synchronization**
   - Snapshots sent every 5 seconds
   - Partial updates for frequent changes
   - Client-side prediction for movement

3. **Message Broadcasting**
   ```
   Server receives message
   └─→ Validate
   └─→ Update state
   └─→ Broadcast to all clients in session
   ```

4. **Chat Channel Separation**
   - World chat (all 1000 players)
   - Party chat (4-5 players)
   - Guild chat (20-100 players)
   - System messages (server events)

## Connection Management

### Reconnection Strategy
```
Connection lost
  ↓
Wait 2 seconds
  ↓
Attempt 1 (fail)
  ↓
Wait 4 seconds
  ↓
Attempt 2 (fail)
  ↓
Wait 8 seconds
  ↓
Attempt 3 (success)
  ↓
Reconnected
```

### State Recovery
1. On reconnect, server sends full snapshot
2. Client merges with local state
3. Any conflicting changes favor server
4. Player resumes where they left off

## Deployment

### Cloudflare Pages
- Static site hosting
- Build: `npm run build`
- Output: `dist/`
- URL: `https://aethoria.pages.dev`

### Cloudflare Workers/Durable Objects
- WebSocket server
- Session management
- State broadcasting
- Message validation

## Performance Optimizations

1. **Client-Side**
   - Lazy load dungeons on demand
   - Cache player data locally
   - Debounce position updates

2. **Network**
   - Compress messages with gzip
   - Delta updates instead of full state
   - Message batching (up to 10ms)

3. **Server**
   - Durable Objects for persistence
   - In-memory state with periodic snapshots
   - Efficient message routing

## Security Considerations

1. **Combat Validation**
   - Server calculates damage, not client
   - Validate attack cooldowns
   - Prevent stat manipulation

2. **Loot Distribution**
   - Server assigns items
   - Verify drop rates server-side
   - Log all transactions

3. **Chat Moderation**
   - Filter inappropriate content
   - Rate limit messages
   - Log messages for moderation

4. **Session Security**
   - Validate session IDs
   - Timeout inactive players
   - Verify player ownership of actions
