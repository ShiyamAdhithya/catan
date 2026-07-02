# Coding Standard

## Purpose

Define architectural coding conventions.

---

## Rules

- Prefer composition over inheritance.
- Follow single responsibility.
- Keep business logic inside the Game Engine.
- UI renders state; it does not own state.
- Networking transports messages; it does not implement rules.
- Prefer explicit names over generic names.
- Export only from `src/index.ts`.

---

## Examples

Correct:
- RuleValidator
- TurnEngine
- EventStore

Incorrect:
- Manager
- Helper
- Util

---

## Notes

Code should reflect the project's ubiquitous language.
