# @catan/game-engine

Sole owner of Catan game state (ADR-0004). Validates Commands, emits Events, mutates GameState. Never imports networking or UI (ADR-0008).

## Responsibilities

- Board generation and topology
- Game state (setup, turns, resources, buildings, dev cards)
- Command validation and application
- Derived rules: Longest Road, Largest Army, victory conditions
- Hidden-information state projection (`getStateView`)

## Public API

See `src/index.ts`. Consumers must not use deep imports (`docs/standards/03-packages.md`).

## Dependencies

None at runtime. Dev-only: shared `@catan/*` tooling packages.
