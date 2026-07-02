# Dependency Standard

## Purpose

Define allowed dependencies between packages.

---

## Rules

Dependencies flow inward.

```
Apps
│
├── Desktop
├── Replay
└── Map Editor
      │
      ▼
Packages
│
├── game-ui
├── networking
├── ui
│
├── protocol
└── game-engine
```

### Allowed

- apps → packages
- game-ui → ui
- networking → protocol

### Forbidden

- game-engine → networking
- game-engine → ui
- protocol → game-engine
- packages → apps

---

## Examples

Correct:
- Desktop imports Game Engine.

Incorrect:
- Game Engine imports Pear.

---

## Notes

Keep dependencies acyclic.
