# Repository Standard

## Purpose

Define how the repository is organized and when new top-level directories should be introduced.

---

## Rules

### Repository Structure

```
apps/
packages/
tooling/
docs/
scripts/
```

### apps/

Contains runnable applications.

Examples:

- desktop

### packages/

Contains reusable libraries shared across one or more applications.

### tooling/

Contains shared development tooling such as TypeScript, ESLint and Prettier configurations.

### docs/

Contains architecture, standards, ADRs and research.

### scripts/

Contains development and automation scripts.

### Creating New Apps

Create a new app only when it produces a runnable application.

### Creating New Packages

Create a package only when it represents a reusable responsibility.

---

## Examples

Correct:

- Add `packages/game-engine`
- Add `apps/replay`

Incorrect:

- Create `packages/common`
- Create `packages/shared` without a clear responsibility.

---

## Notes

Keep the top-level structure stable. Avoid adding new root directories without strong justification.
