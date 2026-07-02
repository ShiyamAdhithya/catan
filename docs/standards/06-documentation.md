# Documentation Organization

## Purpose

Define where documentation belongs.

---

## Rules

### standards/

Project-wide rules and conventions.

### architecture/

Explains how the system is designed.

### decisions/

Architecture Decision Records (ADRs).

### research/

Ideas, experiments and investigations.

### Package README

Every package must include a README describing:
- Purpose
- Responsibilities
- Public API
- Dependencies

---

## Examples

Correct:
- New architecture decision → `docs/decisions`
- New networking investigation → `docs/research`

Incorrect:
- Mixing research notes into ADRs.
- Documenting architecture inside package READMEs.

---

## Notes

Documentation should evolve with the project and remain close to the code it describes.
