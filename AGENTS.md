# rafters

Rafters is a design system that carries its designers' decisions: tokens, components defined by behaviors, and composites, delivered through the `rafters` CLI and the registry at rafters.studio. Owned by the rafters agent.

If you are part of a legion team, orient through legion before reading anything here:

```
legion whoami --repo rafters    # who rafters is
legion whatami --repo rafters   # how rafters works
legion recall --repo rafters    # what rafters remembers about the task at hand
legion sym ...                  # code questions: definitions, references; `sym etc` for everything else
```

If you are not, start with [docs/DESIGN_PHILOSOPHY.md](docs/DESIGN_PHILOSOPHY.md).

Toolchain: pnpm. Run `pnpm install` after pulling and `pnpm preflight` before committing. A change to CLI behaviour carries an entry in `packages/cli/CHANGELOG.md` in the same commit.

Rules no tool enforces: never start, stop or touch a dev server; never commit a broken or skipped test; async/await, never `.then()`; never write to `/tmp`; React components stay pure; Zod at every external data boundary.
