# ADR-0005: Event-Driven Architecture

**Status:** Accepted

## Decision
Players issue Commands.

The Game Engine validates commands and emits Events.

Events mutate the Game State.

## Flow

Player
→ Command
→ Game Engine
→ Event
→ Game State

## Benefits
- Replay
- Debugging
- Save/Load
- Synchronization
