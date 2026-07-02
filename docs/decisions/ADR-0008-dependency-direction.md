# ADR-0008: Dependency Direction

**Status:** Accepted

## Decision

Dependencies flow downward.

Desktop
↓
Networking
↓
Protocol
↓
Game Engine

## Rules
- Game Engine never imports UI.
- Game Engine never imports Networking.
- Protocol imports nothing.
