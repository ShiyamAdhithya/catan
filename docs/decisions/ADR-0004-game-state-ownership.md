# ADR-0004: Game State Ownership

**Status:** Accepted

## Decision
The Game Engine is the sole owner of the game state.

Only the Game Engine may mutate state.

## Consumers
- Desktop
- Networking
- UI
- Replay
- AI
- Debug tools

All interact with the Game Engine instead of modifying state directly.
