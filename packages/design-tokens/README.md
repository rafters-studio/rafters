# @rafters/design-tokens

> The token system for Rafters: generators, the `TokenRegistry`, its plugins, and
> the exporters that write `rafters.css`.

A token derives from a parent, and when the parent changes, the token follows.
That rule runs on three layers: the `dependsOn` record, the registry binding,
and the CSS `var()` chain. Rafters tokens are CSS only, so the CSS is the
design; the other two layers must describe the same edges.

## What the Tailwind exporter writes

`rafters.css` and the static sheet come from one table, `THEME_MAPPING` in
`src/exporters/tailwind.ts`. Each row maps a registry token pattern to the
Tailwind v4 theme key its stock utility reads. `:root` sets
`--rafters-<token>` to the stored value, and the theme key carries
`var(--rafters-<token>)`, so changing a token moves its utility: `p-4` reads
`--spacing-4`, bare `rounded` reads `--radius`, `z-depth-modal` reads
`--z-index-depth-modal`. Breakpoint and container keys carry the literal
value, because media and container queries cannot read `var()`. A token with
a `<token>--dark` sibling switches in dark mode, as colour does.

Fills are the exception. A token in the `fill` namespace is a recipe
(`FillValueSchema` in `@rafters/shared`): background, gradient, mask,
backdrop, blend, foreground and border, with optional dark and state blocks,
and every colour a reference to a registry token. The exporter writes each
one as `@utility bg-fill-<name> { @apply <stock Tailwind classes>; }`, plus
one `@source inline(...)` line naming every fill utility, so a fill named only
in data still compiles. The generated surface fills (`surface-<name>`, from
`src/generators/surface.ts`) are written as `bg-surface-<name>`. The
TypeScript and DTCG exports carry fills as data.

## Docs

- [How the Rafters Token Cascade Works](docs/cascade.md): the three layers, the
  node types, which namespaces use which layers, what breaks today, and how to
  check a cascade.

## Keeping the docs current

`docs/cascade.md` states the commit it was measured at. A change to any of the
following updates it in the same PR, with its counts re-measured and its
measured-at line moved:

- a plugin (`src/plugins/`) or the registry (`src/registry.ts`, `src/graph.ts`)
- a binding or `dependsOn` a generator writes (`src/generators/`)
- how an exporter chains custom properties (`src/exporters/`)
- a namespace gaining or losing tokens, or a row in "Where it breaks today"
  being fixed or found

Measure with rafters' own code, never a copy of its logic: the steps are in the
doc's "How to check a cascade".
