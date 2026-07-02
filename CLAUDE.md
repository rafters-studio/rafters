# CLAUDE.md

Stable rules for this repo. Everything else — architecture, package descriptions, what's where, why we did X — lives in legion. Recall first.

## Zero tolerance

- **NEVER start, stop, restart, or interact with dev servers.** The user manages servers. Ask if a server action is needed.
- **ALWAYS run `pnpm preflight` before commits.** Build will fail otherwise.
- **NEVER commit broken or skipped tests.**
- **NEVER use `npm` or `npx`.** pnpm only.
- **NO `any` types.** Narrow from `unknown`.
- **NO emoji** in code, comments, commits, or docs.
- **NO `.then()` chains.** async/await only.
- **NEVER use `/tmp`.** All work files in workspace subdirectories.
- React 19 purity — no impure functions in components.
- Use Zod for all external data.

## Commands

```bash
pnpm preflight     # MANDATORY before commit
pnpm test          # full suite
pnpm typecheck     # workspace
pnpm lint          # biome check
```

## Workflow

1. Make changes.
2. If the CLI behavior changed, add a CHANGELOG.md entry in the same commit.
3. `pnpm test`
4. `pnpm preflight`
5. Commit. Lefthook runs pre-commit checks.

## Environment

- Node.js ≥ 24.12.0
- pnpm ≥ 11.0.0
- React ≥ 19.0.0
- TypeScript 5.9.x (strict)
