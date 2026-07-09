# Catan Rules → Game Engine Design

**Date:** 2026-07-03
**Status:** Approved (pending final spec review)

## Purpose

Define how the rules of Catan translate into `packages/game-engine`'s Command → Event → GameState model (ADR-0005), for a peer-to-peer, turn-based, friends-only desktop game (ADR-0002, ADR-0003) where every peer independently validates and reconstructs game state (ADR-0004, ADR-0006).

This is the design for the **first version** of the engine only. It intentionally excludes expansions and a couple of base-game mechanics called out below.

## Scope

- **Base Catan only** — no Seafarers, Cities & Knights, or other expansions. Extensibility for expansions is not designed for up front; it will be addressed if/when an expansion is actually undertaken.
- **3–4 players.** The 2-player variant (with its extra house rules) is out of scope.
- **Bank/port trades only.** Player-to-player trade negotiation (offer/counter-offer/accept across peers) is deferred — it's a materially more complex multi-party sub-protocol than anything else in the engine and isn't needed for a playable base game.

## Trust model

- **Every peer validates every Command/Event independently**, running the same deterministic engine logic, rather than trusting the Coordinator's events blindly. Validation cost is negligible (board has ~54 vertices / ~72 edges, a handful of commands per turn) — the real latency cost in this architecture is network round-trip, not local computation. This also makes Coordinator handoff (ADR-0003) trivial: any peer already has full rule knowledge loaded.
- **Randomness (dice rolls, dev-card draws) is Coordinator-declared, not independently derived.** The Coordinator generates the value locally and broadcasts it as a fact inside the event (e.g. `DiceRolled{ die1, die2 }`); other peers validate that a roll/draw was *legal to happen now*, not the randomness itself. This mirrors physical Catan (one roller, everyone else observes) and is consistent with the friends-only trust model (ADR-0002). A cryptographic commit-reveal shared-seed scheme was considered and rejected as unnecessary complexity for a non-adversarial setting.

## Hidden information

Catan hides each player's exact resource/dev-card hand from opponents (who see only counts). This must not be enforced by the UI (ADR-0009: "UI renders state, UI never owns state, UI never contains game rules").

**Design:** the Game Engine holds full true state internally (needed for independent validation per the trust model above) and exposes a projection function:

```
getStateView(state: GameState, viewingPlayerId: PlayerId): PlayerView
```

`PlayerView` contains the viewing player's own hand in full, opponents' hands as counts only, and the dev card deck as a count only. **`game-ui` only ever renders `PlayerView`**, never raw `GameState` — this keeps hidden-information enforcement entirely inside the engine, where the rule belongs.

This layering holds across the other consumers in ADR-0004/ADR-0010:
- **Protocol/networking** carry full-fidelity Commands/Events only (ADR-0006 requires this for peers to reconstruct true state) — no redaction logic at this layer, no "who can see what" concerns.
- **Replay/Debug tooling** consume the engine's raw `GameState` directly (they want full visibility); `game-ui` is simply the one consumer that opts into the redacted view. No new engine surface is needed beyond the single projection function — satisfies ADR-0010's "must support future tools without modifying the Game Engine."

Resource *production* specifically needs no real secrecy mechanism at all: it's a deterministic function of public board state (settlement/city positions, hex layout) and the publicly-broadcast dice roll, so every peer's engine computes it identically regardless of the projection.

## Board representation

Modeled as a graph, not a grid, since Catan's board isn't rectangular:

- **Hex** — one of 19 tiles: `resource: WOOD | BRICK | SHEEP | WHEAT | ORE | DESERT`, `number: 2-12 | null` (desert has none). Addressed by axial/cube hex coordinates.
- **Vertex** — intersection of up to 3 hexes; settlements/cities go here. Has a stable ID, knows its adjacent hexes (for production) and adjacent vertices (for the distance rule).
- **Edge** — a side between two adjacent vertices; roads go here. Knows its two endpoint vertices (for connectivity and longest-road calculation).
- **Port** — attached to specific perimeter edges; 3:1 generic or 2:1 for one specific resource.

The board's graph topology is fixed, generated once at game setup from the randomized hex/number/port layout, and never changes afterward — only vertex/edge *occupancy* changes during play.

## GameState shape

```
GameState {
  phase: Phase                     // see Turn/Phase State Machine
  turnNumber: int
  currentPlayerId: PlayerId
  setupOrder?: PlayerId[]          // snake order during SETUP phases only

  board: {
    hexes: Hex[]                   // fixed after generation
    vertices: Vertex[]             // fixed topology; occupancy lives on each vertex
    edges: Edge[]                  // fixed topology; occupancy lives on each edge
    robberHexId: HexId
  }

  players: Record<PlayerId, PlayerState>   // hand (exact), VPs, pieces remaining
  bank: { resources: Record<ResourceType, int>, devCards: DevCard[] }  // devCards = shuffled deck; only length is public via PlayerView

  longestRoad: { holder: PlayerId | null, length: int }
  largestArmy: { holder: PlayerId | null, count: int }

  pendingDiscards?: PlayerId[]     // players who owe a discard after a 7, before robber moves
  pendingRobberSteal?: { targets: PlayerId[] }  // after robber placed, before steal resolved

  winner: PlayerId | null
}
```

Longest Road and Largest Army are stored as engine-recalculated fields (not derived ad hoc by consumers) so the recalculation rule lives in exactly one place.

## Turn / Phase state machine

```
SETUP_SETTLEMENT (round 1, snake order 1→N)
   → SETUP_ROAD (round 1)
      → [next player, or when round 1 done] SETUP_SETTLEMENT (round 2, snake order N→1)
         → SETUP_ROAD (round 2)
            → [last player's second road] ROLL  (normal play begins)

ROLL (current player must roll)
   → if roll == 7:  DISCARD (any player with >7 cards) → MOVE_ROBBER → STEAL → MAIN
   → if roll != 7:  MAIN  (resources auto-distributed as part of the DiceRolled event's effects)

MAIN (current player: build, buy dev card, play dev card, bank/port trade, end turn)
   → playing a KNIGHT card: MOVE_ROBBER → STEAL → back to MAIN
   → EndTurn command → next player's ROLL

any phase, any point → GAME_OVER  (win checked only on the VP-holder's own turn — see below)
```

Notes:
- **Setup is its own linear sequence**, not a special case of MAIN: first settlement+road for every player in snake order, then second settlement+road in reverse order. The second settlement additionally grants immediate starting resources — the one exception to "resources only come from dice rolls."
- **DISCARD and MOVE_ROBBER/STEAL are interrupts**, not phases players "end" themselves — forced sub-steps triggered by a 7 (roll or knight), tracked via `pendingDiscards`/`pendingRobberSteal`. All affected players must resolve them (discards may be resolved in any order) before play returns to MAIN.
- **Win is checked only on the VP-holder's own turn**, matching official rules: a hidden VP dev card doesn't end the game the instant it's drawn — it only ends the game once the holder reaches 10 VP and it's their turn (e.g. right after a VP-changing event on their own turn). This avoids a mid-opponent-turn game-over interrupt that never happens in physical play.

## Command / Event catalog

Every Command maps to one or more Events on success (`Player → Command → Game Engine → Event → GameState`, ADR-0005). Commands are `Verb+Noun`, Events are past tense (ubiquitous language conventions).

| Command | Legal phase(s) | Resulting Event(s) |
|---|---|---|
| `PlaceInitialSettlement` | SETUP_SETTLEMENT | `SettlementBuilt` |
| `PlaceInitialRoad` | SETUP_ROAD | `RoadBuilt` (+ `ResourcesGained` on round 2) |
| `RollDice` | ROLL | `DiceRolled` (+ `ResourcesGained` per player, or triggers DISCARD/MOVE_ROBBER if 7) |
| `DiscardResources` | DISCARD (per owing player) | `ResourcesDiscarded` |
| `MoveRobber` | MOVE_ROBBER | `RobberMoved` |
| `StealResource` | STEAL | `ResourceStolen` |
| `BuildRoad` | MAIN | `RoadBuilt` (+ `LongestRoadChanged` if applicable) |
| `BuildSettlement` | MAIN | `SettlementBuilt` (+ `LongestRoadChanged` if it cuts a road) |
| `BuildCity` | MAIN | `CityUpgraded` |
| `BuyDevelopmentCard` | MAIN | `DevelopmentCardBought` |
| `PlayDevelopmentCard` | MAIN (once/turn, not the turn it was bought) | `KnightPlayed` → triggers MOVE_ROBBER/STEAL (+ `LargestArmyChanged`) / `RoadBuildingPlayed` → `RoadBuilt` ×2 / `YearOfPlentyPlayed` → `ResourcesGained` / `MonopolyPlayed` → `ResourcesStolen` (all-from-all) |
| `TradeWithBank` | MAIN | `ResourcesTraded` |
| `EndTurn` | MAIN | `TurnEnded` |
| *(engine-internal)* | any | `GameWon` (emitted by the own-turn win check) |

Each command's validation checks: correct phase, `command.playerId` is allowed to act right now (usually `currentPlayerId`, except `DiscardResources`/`StealResource` targets which can be any affected player), sufficient resources/pieces, and placement legality (distance rule, connectivity, robber not staying on the same hex, etc.).

## Derived rules

- **Longest Road**: recalculated after any `RoadBuilt`, or any event that could cut a road (an opponent's `SettlementBuilt` on a vertex along someone's road path). Longest-simple-path search over that player's road edges; must be ≥5 and strictly longer than the current holder's to change hands (ties keep the existing holder).
- **Largest Army**: a simple counter of played `KnightPlayed` events per player; ≥3 and strictly greater than the current holder's count to change hands.

## Error handling

`validate` never throws — it returns a typed `Result<Ok, RuleViolation>` (e.g. `RuleViolation.NotYourTurn`, `.InsufficientResources`, `.IllegalPlacement`) so callers can surface *why* a command was rejected. No command is ever partially applied: `apply` only runs after `validate` returns `Ok`, producing one atomic batch of Events.

## Testing

Each command handler's `validate`/`apply` pair is unit-tested in isolation against hand-built `GameState` fixtures (e.g. testing the distance rule doesn't require playing through a full game). Full-game scenarios (a scripted Command sequence from setup through to a win) serve as integration tests validating the phase machine end-to-end. Runs on `@catan/vitest-config/node`.

## Explicitly out of scope for v1

- Expansions (Seafarers, Cities & Knights, etc.) and expansion-extensible abstractions.
- 2-player variant rules.
- Player-to-player trade negotiation (bank/port trades only).
- Cryptographic/commit-reveal randomness — Coordinator-declared randomness is used instead (see Trust model).
