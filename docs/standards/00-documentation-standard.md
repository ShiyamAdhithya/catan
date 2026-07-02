# Documentation Standard

## Purpose

This document defines how documentation is written and maintained throughout the project.

The goal is consistency, clarity, and maintainability.

Documentation exists to support the architecture and implementation—not replace them.

---

## Rules

### 1. One Document, One Responsibility

Each document should answer one primary question.

Examples:

- Repository Standard → How is the repository organized?
- Package Standard → How should packages be structured?
- Dependency Standard → Which packages may depend on each other?
- ADR → Why was this decision made?

Avoid combining unrelated topics into a single document.

---

### 2. Keep Documentation Close to the Code

Whenever architecture or implementation changes, update the relevant documentation in the same commit whenever possible.

Outdated documentation is considered a bug.

---

### 3. Explain Decisions, Not Code

Documentation should explain:

- Why
- What
- Responsibilities
- Constraints
- Trade-offs

Avoid implementation details unless the document specifically describes implementation.

---

### 4. Use the Project Vocabulary

Always use terminology defined in the Ubiquitous Language document.

Avoid introducing new terms without updating the vocabulary.

---

### 5. Prefer Examples

Every important rule should include an example whenever practical.

Examples are often easier to understand than long explanations.

---

### 6. Prefer Diagrams

If a diagram explains something better than text, use a diagram.

---

## Standard Structure

Most standards documents should follow this structure.

```md
# Title

## Purpose

## Rules

## Examples

## Notes
```

Keep documents focused and easy to read.

---

## Document Types

The project maintains four types of documentation.

### Standards

Project-wide rules and conventions.

### Architecture

How the system is designed.

### ADRs

Why important decisions were made.

### Research

Ideas, investigations, experiments, and notes.

---

## Notes

Documentation should evolve with the project.

Don't optimize for perfect documentation.

Optimize for useful documentation.
