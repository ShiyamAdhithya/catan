# ADR-0003: Multiplayer Model

**Status:** Accepted

## Decision
Use a peer-to-peer architecture with one peer acting as the temporary Game Coordinator.

## Responsibilities
- Turn progression
- Dice rolls
- Rule validation
- Broadcasting game events

The coordinator is not a dedicated server and may change during a session.
