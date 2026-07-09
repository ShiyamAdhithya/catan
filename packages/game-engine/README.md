# @catan/game-engine

Sole owner of Catan game state (ADR-0004). Validates Commands, emits Events, mutates GameState. Never imports networking or UI (ADR-0008).

## Responsibilities

- Board generation and topology
- Game state (setup, turns, resources, buildings, dev cards)
- Command validation and application
- Derived rules: Longest Road, Largest Army, victory conditions
- Hidden-information state projection (`getStateView`)

## Public API

- `createInitialGameState(playerIds, shuffle?)` — start a new game.
- `applyCommand(state, command)` — validate and apply a Command, returning `Result<{ state, events }>`.
- `getStateView(state, viewingPlayerId)` — hidden-information-redacted view for `@catan/game-ui`. Debug/replay tooling should use raw `GameState` instead.
- Types: `GameState`, `Command`, `Event`, `Result`, `RuleViolation`, `PlayerView`, board/domain types (`Board`, `Hex`, `Vertex`, `Edge`, `Port`, ...).

See `src/index.ts` for the full exported surface. Consumers must not use deep imports.

## Dependencies

None at runtime. Dev-only: shared `@catan/*` tooling packages.
