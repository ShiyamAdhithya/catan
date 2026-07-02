# @catan/tsconfig

Shared TypeScript configurations for the Catan workspace.

---

## Purpose

This package provides the shared TypeScript configurations used by all workspace packages and applications.

The goal is to ensure a consistent compiler configuration across the repository while keeping individual `tsconfig.json` files small and focused.

---

## Configurations

### `tsconfig.base.json`

Repository-wide compiler options shared by every project.

Used by:

- Libraries
- Applications

---

### `tsconfig.library.json`

Configuration for reusable workspace packages.

Examples:

- `@catan/game-engine`
- `@catan/protocol`
- `@catan/networking`
- `@catan/ui`

---

### `tsconfig.react.json`

Configuration for React applications.

Examples:

- Desktop
- Replay
- Map Editor
- Debug Tools

---

## Design Principles

- One shared source of compiler configuration.
- Minimal package-level `tsconfig.json` files.
- Strict type safety by default.
- Modern TypeScript configuration.
- Build behavior is consistent across the workspace.

---

## Package tsconfig Example

```json
{
  "extends": "@catan/tsconfig/tsconfig.library.json",

  "include": ["src"]
}
```

---

## Notes

Packages should define only:

- `include`
- `exclude`
- `references` (when introduced)

Compiler options belong in this package.
