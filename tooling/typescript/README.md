# @catan/tsconfig

## Purpose

Provides the shared TypeScript configurations used throughout the Catan workspace.

Every package and application extends one of these configurations.

---

## Configurations

### tsconfig.base.json

Repository-wide compiler options shared by every project.

---

### tsconfig.library.json

Configuration for reusable workspace packages.

Examples:

- game-engine
- protocol
- networking
- ui
- utils

---

### tsconfig.react.json

Configuration for React applications.

Examples:

- desktop
- replay
- map-editor
- debug

---

## Design Principles

- One shared source of compiler configuration.
- Package-specific tsconfig files remain minimal.
- Build behavior is consistent across the workspace.
