# @catan/prettier-config

Shared Prettier configurations for the Catan workspace.

## Purpose

This package provides the shared formatting rules used across all workspace packages and applications.

Formatting is owned exclusively by Prettier. Code quality and correctness are enforced by ESLint.

## Configurations

### `base`

Default formatting configuration for all workspace packages.

Used by:

- Libraries
- Shared packages
- Node.js applications

### `react`

Formatting configuration for React applications.

Currently identical to `base` and reserved as an extension point for future React-specific formatting requirements.

## Usage

### Library

```javascript
import config from "@catan/prettier-config/base";

export default config;
```

### React Application

```javascript
import config from "@catan/prettier-config/react";

export default config;
```

## Design Principles

- Single source of formatting rules.
- Formatting is handled only by Prettier.
- Keep the configuration minimal.
- Add overrides only when a real requirement exists.
