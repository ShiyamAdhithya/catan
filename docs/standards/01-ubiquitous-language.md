# Ubiquitous Language

## Purpose

This document defines the shared vocabulary used throughout the project.

Every package, document, API, class, and discussion should use these terms consistently.

---

## Rules

### Game

A complete playable instance of Catan.

A Game begins with setup and ends when a winner is declared or the game is terminated.

A Game contains:

- Board
- Players
- Rules
- Current Game State
- Victory Conditions

A Game is independent of the networking Session.

---

### Session

The runtime environment in which a Game is played.

A Session owns:

- Connected Peers
- Coordinator
- Network Connections
- Presence
- Game Lifecycle

A Session hosts exactly one Game.

A saved Game may later be resumed in a different Session.

---

### Lobby

The waiting area before a Game starts.

Responsibilities:

- Player discovery
- Joining and leaving
- Ready status
- Game configuration
- Expansion selection
- Coordinator selection

When the Game starts, the Lobby becomes a Session.

---

### Player

A participant in the Game.

A Player owns:

- Resources
- Development Cards
- Roads
- Settlements
- Cities
- Victory Points

A Player is **not** a Peer.

---

### Peer

A running instance of the desktop application.

A Peer participates in a Session.

Typical mapping:

```
1 Peer → 1 Player
```

Future possibilities:

- Multiple local players
- Observer peers
- Replay peers

---

### Coordinator

A Peer temporarily responsible for coordinating the Game.

Responsibilities:

- Validate commands
- Progress turns
- Roll dice
- Broadcast events

The Coordinator is **not** a dedicated server.

It is simply a role assigned to a Peer.

---

## Naming Conventions

| Type             | Convention   | Example               |
| ---------------- | ------------ | --------------------- |
| Business Concept | Noun         | Player, Game, Session |
| Command          | Verb + Noun  | BuildRoad, RollDice   |
| Event            | Past Tense   | RoadBuilt, DiceRolled |
| State            | Noun + State | GameState, LobbyState |

---

## Examples

Correct:

- Player joins Lobby.
- Lobby becomes Session.
- Session hosts Game.
- Peer controls Player.
- Coordinator validates commands.

Incorrect:

- Player connects to another Player.
- Session is the Game.
- Coordinator is the server.

---

## Notes

The following concepts will be defined later as the architecture evolves:

- Command
- Event
- Game State
- Turn
- Replay
- Snapshot
- Protocol
- Board
- Hex
- Edge
- Vertex
- Expansion
