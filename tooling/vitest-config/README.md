# @catan/vitest-config

Shared Vitest configurations for the Catan workspace.

## Purpose

This package provides the shared Vitest configurations used across all workspace packages and applications.

## Configurations

### `base`

Repository-wide test configuration.

Used as the foundation for all test environments.

### `node`

Configuration for Node.js libraries and packages.

Examples:

- `@catan/game-engine`
- `@catan/protocol`
- `@catan/networking`

### `react`

Configuration for React applications.

Examples:

- Desktop
- Replay
- Map Editor
- Debug Tools

## Usage

### Node Package

```javascript
import config from "@catan/vitest-config/node";

export default config;
```

### React Application

```javascript
import config from "@catan/vitest-config/react";

export default config;
```

## Design Principles

- Shared test configuration.
- Minimal defaults.
- Environment-specific extensions.
- Add configuration only when required.
