# Project Operating Rules

## Token Budget

- Default to a lean-context workflow. Start from the named file, error, route, component, test, or command, then expand only one nearby hop at a time.
- Before reading broadly, state the local hypothesis and the cheapest check that could disprove it.
- Prefer `rg`, targeted file reads, and existing neighboring examples over full-directory scans or large pasted context.
- Summarize findings instead of repeating long file contents. Quote only the lines needed to justify a decision.
- Keep final answers short: changed files, validation run, and any remaining risk.

## Model Routing

- Use the lowest capable model for search, simple edits, docs, formatting, and mechanical fixes.
- Use Sonnet for normal implementation, debugging, UI work, and tasks touching multiple files.
- Use a higher-reasoning model only for architecture decisions, tricky cross-module bugs, migrations, security-sensitive work, or when the user explicitly asks.
- If a task starts to require broad context, pause and ask whether to continue with deeper analysis before spending a lot of tokens.

## Skill Routing

- Use the `lean-context` skill before complex debugging, feature work, refactors, documentation rewrites, or any task likely to touch more than three files.
- Do not load optional skills for tiny one-file edits, direct commands, or simple explanations.
- For Next.js work inside `frontend/admin` or `frontend/user`, obey the local `AGENTS.md` rules and read the relevant Next.js docs from that app's `node_modules` before relying on memory.

## Repo Shape

- `frontend/admin` is the admin Next.js app.
- `frontend/user` is the user-facing Next.js app.
- `my-figma-plugin` is separate plugin code.
