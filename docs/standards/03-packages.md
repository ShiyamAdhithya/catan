# Package Standard

## Purpose

Define how packages are created and maintained.

---

## Rules

### Standard Structure

```
package/
├── src/
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### Public API

Every package exposes a single public entry point.

```
src/index.ts
```

Consumers must not use deep imports.

### Responsibility

Each package owns one responsibility.

### Independence

Packages should be buildable and testable independently.

### Naming

Use the `@catan/*` scope.

Example:
- @catan/game-engine
- @catan/networking

---

## Examples

Correct:
- `@catan/protocol`

Incorrect:
- `@catan/shared`
- `@catan/common`

---

## Notes

Extract a new package only when there is a clear architectural boundary.
