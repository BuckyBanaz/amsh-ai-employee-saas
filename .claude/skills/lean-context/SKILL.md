---
name: lean-context
description: "Use when: reducing token usage, choosing model routing, debugging, refactoring, implementing features, reviewing code, or working across multiple files in this SaaS monorepo."
---

# Lean Context Workflow

Use this skill to keep Claude Code accurate without loading unnecessary context.

## Context Triage

1. Identify the concrete anchor: file, symbol, route, failing command, screenshot, error, or nearest implementation surface.
2. Read only the smallest neighboring context needed to form one falsifiable hypothesis.
3. Name the cheapest check that can disprove the hypothesis before editing.
4. Prefer existing local patterns over broad repo mapping.
5. Stop expanding once the controlling code path is identified.

## Search Rules

- Use `rg`/targeted search first.
- Read focused ranges, not whole files, unless the file is small or structurally important.
- Search for call sites, tests, and sibling components before inventing a new abstraction.
- Avoid loading generated files, build output, lockfiles, and large docs unless the task specifically depends on them.

## Model Routing

- Low-cost or fast model: search, summarization, direct docs edits, simple mechanical changes.
- Sonnet: normal coding, UI changes, bug fixes, multi-file implementation.
- Higher-reasoning model: architecture, migrations, subtle debugging, security, performance, or high-blast-radius changes.

## Execution Loop

1. Plan in 3-5 short bullets only when the task is non-trivial.
2. Make the smallest grounded edit.
3. Run the narrowest validation command available.
4. If validation fails, repair the same slice before expanding.
5. Finish with changed files, checks run, and unresolved risk.

## Output Style

- Keep updates concise.
- Do not paste long command output unless the user asks.
- Explain decisions with local evidence, not broad speculation.
- Ask before spending extra context on deep exploration.