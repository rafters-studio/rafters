# @rafters/design-tokens

> The token system for Rafters: generators, the `TokenRegistry`, its plugins, and
> the exporters that write `rafters.css`.

A token derives from a parent, and when the parent changes, the token follows.
That rule runs on three layers: the `dependsOn` record, the registry binding,
and the CSS `var()` chain. Rafters tokens are CSS only, so the CSS is the
design; the other two layers must describe the same edges.

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
