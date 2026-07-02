# ADR-0006: State Synchronization

**Status:** Accepted

## Decision
Synchronize Events instead of Game State snapshots.

Examples:
- DiceRolled
- RoadBuilt
- TradeAccepted
- TurnEnded

Each peer rebuilds the state locally by applying the same events.
